import { GoogleGenerativeAI, Part, GenerationConfig } from "@google/generative-ai";
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

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.4,
        // @ts-ignore: Experimental feature handling
        responseModalities: ["image"],
      } as GenerationConfig
    });

    // Convert base64 data to SDK format
    const base64Data = request.originalImage.split(',')[1];
    const imagePart: Part = {
      inlineData: {
        data: base64Data,
        mimeType: "image/jpeg"
      }
    };

    const result = await model.generateContent([promptText, imagePart]);
    const response = await result.response;

    // Check for candidates and parts
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];

      if (candidate.finishReason === "SAFETY") {
        throw new Error("L'image a été bloquée par le filtre de sécurité de Google (Safety).");
      }

      // SDK usually handles parts, but accessing raw might be needed if SDK types don't support image output widely yet
      // Accessing underlying response object if needed, or using helpers
      // The SDK maps the response structure. 
      // For Image generation, often it's in candidates[0].content.parts[0].inlineData

      // Let's iterate parts to find image
      const parts = candidate.content.parts;
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          console.log("✅ Image Generated Successfully!");
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }

      // If no image, look for text
      const text = response.text();
      if (text) {
        console.warn("⚠️ API returned text only:", text);
        throw new Error(`L'IA a répondu (Texte): "${text.substring(0, 100)}..."`);
      }
    }

    throw new Error("No content received from Generation.");

  } catch (error: any) {
    console.error("Inpainting Error:", error);
    throw error;
  }
}

export async function analyzeEstatePhoto(file: File, request: string): Promise<any> { return {}; }
export async function generateCorrection(file: File, analysis: any, useAiSuggestions: boolean, refinement?: string): Promise<string> { return ""; }