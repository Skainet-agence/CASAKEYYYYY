import { GoogleGenerativeAI, Part } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

// ═══════════════════════════════════════════════════════════════
//                    NIKON Z9 IMAGE GENERATION ENGINE
// ═══════════════════════════════════════════════════════════════

const MODEL_NAME = "gemini-2.0-flash-exp-image-generation";

// Generate the base quality upgrade (Nikon Z9 style)
export async function generateBaseUpgrade(
    originalImageBase64: string,
    upgradePrompt: string
): Promise<string> {
    if (!API_KEY) throw new Error("Clé API Google manquante.");

    try {
        console.log(`✨ Generating Nikon Z9 quality base...`);
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            generationConfig: {
                // @ts-ignore
                responseModalities: ["Text", "Image"],
            }
        });

        const parts: Part[] = [
            {
                inlineData: {
                    data: originalImageBase64.replace(/^data:image\/\w+;base64,/, ""),
                    mimeType: "image/jpeg"
                }
            },
            { text: upgradePrompt }
        ];

        const result = await model.generateContent({
            contents: [{ role: 'user', parts }],
            generationConfig: {
                temperature: 0.3,
                topP: 0.8,
                topK: 40,
            }
        });

        const response = await result.response;
        return extractImageFromResponse(response);
    } catch (err: any) {
        console.error(`❌ Base upgrade failed:`, err);
        // Fallback: return original image
        console.log(`⚠️ Fallback: using original image as base`);
        return originalImageBase64;
    }
}

// Generate a single zone edit
export async function generateSingleZoneEdit(
    currentImageBase64: string,
    zonePrompt: string,
    attempt: number = 1
): Promise<string> {
    if (!API_KEY) throw new Error("Clé API Google manquante.");

    try {
        console.log(`🎯 Generating zone edit (attempt ${attempt})...`);
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            generationConfig: {
                // @ts-ignore
                responseModalities: ["Text", "Image"],
            }
        });

        // Reinforce prompt on retry attempts
        const reinforcedPrompt = attempt > 1
            ? `CRITICAL - ATTEMPT ${attempt}: You MUST make the following change. Previous attempts failed.\n\n${zonePrompt}`
            : zonePrompt;

        const parts: Part[] = [
            {
                inlineData: {
                    data: currentImageBase64.replace(/^data:image\/\w+;base64,/, ""),
                    mimeType: "image/jpeg"
                }
            },
            { text: reinforcedPrompt }
        ];

        const result = await model.generateContent({
            contents: [{ role: 'user', parts }],
            generationConfig: {
                temperature: 0.2, // Lower temperature for precision
                topP: 0.8,
                topK: 40,
            }
        });

        const response = await result.response;
        return extractImageFromResponse(response);
    } catch (err: any) {
        console.error(`❌ Zone edit failed:`, err);
        throw new Error(err.message || "Erreur de génération");
    }
}

// Extract image from Gemini response
function extractImageFromResponse(response: any): string {
    if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];

        if (candidate.finishReason === "SAFETY") {
            throw new Error("Génération bloquée par les filtres de sécurité.");
        }

        if (candidate.content && candidate.content.parts) {
            for (const part of candidate.content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
    }

    throw new Error("Le modèle n'a pas renvoyé d'image.");
}

// ═══════════════════════════════════════════════════════════════
//                    LEGACY FUNCTION (compatibility)
// ═══════════════════════════════════════════════════════════════

export async function generateEnhancedImage(
    prompt: string,
    originalImageBase64: string,
    _maskImageBase64?: string
): Promise<string> {
    // Redirect to single zone edit for compatibility
    return generateSingleZoneEdit(originalImageBase64, prompt);
}

export async function findBestImageModel(): Promise<string> {
    return MODEL_NAME;
}
