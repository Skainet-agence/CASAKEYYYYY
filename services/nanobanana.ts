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

    const MODEL_CANDIDATES = [
        "imagen-3.0-generate-001",
        "imagen-3.0-fast-generate-001",
        "gemini-2.0-flash", // Testing if direct IMAGE modality works
        "gemini-3-pro-image-preview",
        "imagen-2.0-generate-001"
    ];

    let lastError: any = null;
    console.log("🚀 Starting Model Discovery Race...");

    for (const modelName of MODEL_CANDIDATES) {
        try {
            console.log(`📡 Attempting generation with: ${modelName}`);
            const genAI = new GoogleGenerativeAI(API_KEY);
            const model = genAI.getGenerativeModel({ model: modelName });

            const parts: Part[] = [{ text: prompt }];

            // Sequential attempt
            const result = await model.generateContent({
                contents: [{ role: 'user', parts }],
            });

            const response = await result.response;

            if (response.candidates && response.candidates.length > 0) {
                const candidate = response.candidates[0];
                if (candidate.content && candidate.content.parts) {
                    for (const part of candidate.content.parts) {
                        if (part.inlineData && part.inlineData.data) {
                            console.log(`✅ SUCCESS with model: ${modelName}`);
                            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                        }
                    }
                }
            }
            console.warn(`⚠️ Model ${modelName} did not return image data.`);
        } catch (err: any) {
            console.error(`❌ Model ${modelName} FAILED:`, err.message);
            lastError = err;
        }
    }

    // If we reach here, all candidates failed.
    console.error("💀 ALL Image-Gen models failed.");

    let msg = "Aucun modèle d'image (Imagen 3, Gemini 3) n'a fonctionné avec votre clé.";
    if (lastError?.message?.includes("404")) msg += ` (Le dernier testé, ${MODEL_CANDIDATES[MODEL_CANDIDATES.length - 1]}, était introuvable)`;
    if (lastError?.message?.includes("429")) msg += " (Quota atteint)";

    throw new Error(msg);
}
