import { GoogleGenerativeAI, Part, GenerationConfig } from "@google/generative-ai";
import { ProcessingRequest } from '../types';

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

export async function findBestImageModel(): Promise<string> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) return "gemini-1.5-pro";

        const data = await response.json();
        if (!data.models) return "gemini-1.5-pro";

        const gemini2 = data.models.find((m: any) => m.name.includes("gemini-2.0-flash"));
        if (gemini2) {
            return gemini2.name.replace("models/", "");
        }

        const pro = data.models.find((m: any) => m.name.includes("gemini-1.5-pro"));
        if (pro) {
            return pro.name.replace("models/", "");
        }

        return "gemini-1.5-pro";
    } catch (e) {
        return "gemini-1.5-pro";
    }
}

export async function generateEnhancedImage(prompt: string, originalImageBase64: string, maskImageBase64?: string): Promise<string> {
    if (!API_KEY) throw new Error("Clé API Google manquante.");

    try {
        const MODEL_NAME = "imagen-3.0-generate-001";
        console.log(`🍌 Nano Banana (via ${MODEL_NAME}) generating...`);
        console.log("📝 PROMPT SENT:", prompt);

        const genAI = new GoogleGenerativeAI(API_KEY);
        // We use the latest model for image generation
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        // Imagen 3 T2I (Text-to-Image) is most stable on AI Studio right now.
        const parts: Part[] = [{ text: prompt }];

        const result = await model.generateContent({
            contents: [{ role: 'user', parts }],
        });

        const response = await result.response;
        console.log("🍌 AI Response received:", JSON.stringify(response).substring(0, 200) + "...");

        if (response.candidates && response.candidates.length > 0) {
            const candidate = response.candidates[0];

            // Check for safety filter
            if (candidate.finishReason === "SAFETY" || candidate.finishReason === "OTHER") {
                throw new Error(`Génération bloquée par le filtre de sécurité (${candidate.finishReason}).`);
            }

            if (candidate.content && candidate.content.parts) {
                for (const part of candidate.content.parts) {
                    if (part.inlineData && part.inlineData.data) {
                        console.log("✅ Image data found in response!");
                        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    }
                }
            }
        }

        throw new Error("Le modèle n'a pas renvoyé de données d'image. Vérifiez votre quota ou l'éligibilité de votre clé pour Imagen 3.");

    } catch (error: any) {
        console.error("🍌 Nano Banana Error:", error);

        // Detailed error for the user
        let msg = error.message || "Erreur inconnue";
        if (msg.includes("404")) msg = "Modèle Imagen 3 non trouvé sur cette clé. Vérifiez l'activation dans Google AI Studio.";
        if (msg.includes("429")) msg = "Quota dépassé (Trop de requêtes).";
        if (msg.includes("403")) msg = "Accès refusé. La clé API n'a peut-être pas les droits pour Imagen 3.";

        throw new Error(msg);
    }
}
