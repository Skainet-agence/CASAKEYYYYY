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

    // winning model from discovery: gemini-3-pro-image-preview
    const MODEL_NAME = "gemini-3-pro-image-preview";

    try {
        console.log(`📡 Nano Banana: Grounding generation in source image DNA...`);
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        // Triple-Input Guide: Source Image + Mask + Surgical Prompt
        const parts: Part[] = [
            {
                inlineData: {
                    data: originalImageBase64.replace(/^data:image\/\w+;base64,/, ""),
                    mimeType: "image/jpeg"
                }
            }
        ];

        // Add Mask if available as the second visual anchor
        if (maskImageBase64) {
            parts.push({
                inlineData: {
                    data: maskImageBase64.replace(/^data:image\/\w+;base64,/, ""),
                    mimeType: "image/png"
                }
            });
        }

        parts.push({
            text: `ACT AS AN ELITE ARCHITECTURAL RETOUCHER. 
            IMAGE 1 IS THE SOURCE.
            ${maskImageBase64 ? "IMAGE 2 IS THE MASK (B&W)." : ""}
            
            STRICT RULES:
            ${maskImageBase64 ? "- PIXELS MATCHING BLACK ON MASK: MUST REMAIN 1:1 IDENTICAL TO SOURCE IMAGE. NO CHANGES ALLOWED." : "- MAINTAIN 1:1 COMPOSITION AND PERSPECTIVE OF THE SOURCE IMAGE."}
            ${maskImageBase64 ? "- PIXELS MATCHING WHITE ON MASK: APPLY THE RETOUCHING INSTRUCTIONS BELOW." : "- ONLY APPLY THE RETOUCHING INSTRUCTIONS BELOW."}
            
            RETOUCHING ORDERS: 
            ${prompt}
            
            OUTPUT: A single 8K High-Fidelity image following these rules.`
        });

        const result = await model.generateContent({
            contents: [{ role: 'user', parts }],
        });

        const response = await result.response;

        if (response.candidates && response.candidates.length > 0) {
            const candidate = response.candidates[0];

            if (candidate.finishReason === "SAFETY") {
                throw new Error("Génération bloquée par les filtres de sécurité de Google.");
            }

            if (candidate.content && candidate.content.parts) {
                for (const part of candidate.content.parts) {
                    if (part.inlineData && part.inlineData.data) {
                        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    }
                }
            }
        }

        throw new Error("Le modèle n'a pas renvoyé d'image. Vérifiez votre quota.");
    } catch (err: any) {
        console.error(`❌ Nano Banana Engine Error:`, err);
        throw new Error(err.message || "Erreur de génération d'image");
    }
}
