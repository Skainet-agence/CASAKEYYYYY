import { ProcessingRequest } from '../types';

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

// Fonction de découverte de modèle plus robuste
async function findBestImageModel(): Promise<string> {
    try {
        console.log("🔍 Scanning available models...");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        // Fallback si le scan échoue
        if (!response.ok) return "gemini-1.5-pro"; 

        const data = await response.json();
        if (!data.models) return "gemini-1.5-pro";

        console.log("📋 Models List:", data.models.map((m: any) => m.name));

        // Priorité 1: Gemini 2.0 Flash (Expérimental - souvent très capable)
        const gemini2 = data.models.find((m: any) => m.name.includes("gemini-2.0-flash"));
        if (gemini2) {
             console.log("🎯 FOUND GEMINI 2.0:", gemini2.name);
             return gemini2.name.replace("models/", "");
        }

        // Priorité 2: Gemini 1.5 Pro
        const pro = data.models.find((m: any) => m.name.includes("gemini-1.5-pro"));
        if (pro) {
             console.log("🎯 FOUND GEMINI 1.5 PRO:", pro.name);
             return pro.name.replace("models/", "");
        }

        // Fallback par défaut
        console.log("⚠️ No specific match found in list, forcing default target.");
        return "gemini-1.5-pro"; 
    } catch (e) {
        console.warn("Model Scan skipped:", e);
        return "gemini-1.5-pro";
    }
}

export async function processInpainting(request: ProcessingRequest): Promise<string> {
  if (!API_KEY) {
    throw new Error("Clé API Google manquante.");
  }

  try {
    const MODEL_NAME = await findBestImageModel();
    console.log(`🚀 Sending Request to ${MODEL_NAME}...`);

    let userInstructions = "";
    request.layers.forEach((layer, index) => {
        userInstructions += `- Zone ${layer.color} (${layer.id}): ${layer.prompt}\n`;
    });

    const promptText = `
      You are an expert Luxury Real Estate AI.
      TASK: Edit the input image based on the user instructions.
      INSTRUCTIONS: ${userInstructions}
      STYLE: Photorealistic 8K, Architectural Digest, Perfect Lighting.
      OUTPUT: If you can generate images, generate the modified image. If you cannot generate images directly, describe the changes in detail and apologize.
    `;

    const payload = {
      contents: [{
        parts: [
          { text: promptText },
          { 
             inline_data: { 
               mime_type: "image/jpeg", 
               data: request.originalImage.split(',')[1] 
             } 
          }
        ]
      }],
      // Configuration minimale pour éviter les conflits de paramètres
      generationConfig: {
        temperature: 0.4
      }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Erreur API (${response.status} - ${MODEL_NAME}): ${errText.substring(0, 200)}...`);
    }

    const result = await response.json();
    console.log("AI Response Received", result);

    if (result.candidates && result.candidates.length > 0) {
        const candidate = result.candidates[0];
        
        // Gestion des Filtres de Sécurité (SAFETY)
        if (candidate.finishReason === "SAFETY") {
             console.warn("Safety Ratings:", candidate.safetyRatings);
             throw new Error("L'image a été bloquée par le filtre de sécurité de Google (Safety). Essayez de reformuler votre demande.");
        }

        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
            for (const part of candidate.content.parts) {
                if (part.inline_data && part.inline_data.data) {
                    console.log("✅ Image Generated Successfully!");
                    return `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
                }
            }
            
            const text = candidate.content.parts[0]?.text;
            if (text) {
                console.warn("⚠️ API returned text only:", text);
                throw new Error(`L'IA a répondu (Texte): "${text.substring(0, 100)}..."`);
            }
        }
        
        if (candidate.finishReason) {
             throw new Error(`Génération terminée sans contenu. Raison: ${candidate.finishReason}`);
        }
    }

    console.error("Unexpected JSON Structure:", JSON.stringify(result, null, 2));
    throw new Error(`Format de réponse inconnu. Structure reçue: ${JSON.stringify(result).substring(0, 200)}...`);

  } catch (error: any) {
    if (error.name === 'AbortError') {
        throw new Error("Le traitement a pris trop de temps (Timeout 90s).");
    }
    console.error("Inpainting Error:", error);
    throw error;
  }
}

export async function analyzeEstatePhoto(file: File, request: string): Promise<any> { return {}; }
export async function generateCorrection(file: File, analysis: any, useAiSuggestions: boolean, refinement?: string): Promise<string> { return ""; }
