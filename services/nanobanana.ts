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
        const MODEL_NAME = await findBestImageModel();
        console.log(`🍌 Nano Banana (via Gemini ${MODEL_NAME}) generating...`);

        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            generationConfig: {
                temperature: 0.4,
                // @ts-ignore: Experimental feature
                responseModalities: ["image"],
            } as GenerationConfig
        });

        // Strip prefix if present
        const cleanBase64 = originalImageBase64.replace(/^data:image\/\w+;base64,/, "");

        const parts: Part[] = [
            { text: prompt },
            {
                inlineData: {
                    data: cleanBase64,
                    mimeType: "image/jpeg"
                }
            }
        ];

        if (maskImageBase64) {
            console.log("🎭 Mask provided for generation!");
            // Note: Gemini API currently doesn't support 'mask' as a separate part for Inpainting in the standard generateContent.
            // It requires specific Vertex AI endpoints or future updates. 
            // For now, we log it and keep the interface ready for Flux/Stable Diffusion.
            // In a real implementation with Flux.1 Fill:
            // parts.push({ inlineData: { data: maskBase64, mimeType: "image/png" } });
        }

        const result = await model.generateContent(parts);
        const response = await result.response;

        if (response.candidates && response.candidates.length > 0) {
            const candidate = response.candidates[0];

            if (candidate.finishReason === "SAFETY") {
                throw new Error("L'image a été bloquée par le filtre de sécurité.");
            }

            const parts = candidate.content.parts;
            for (const part of parts) {
                if (part.inlineData && part.inlineData.data) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }

        throw new Error("Aucune image générée.");

    } catch (error: any) {
        console.error("Nano Banana Error:", error);
        throw new Error(`Erreur génération 4K: ${error.message}`);
    }
}
