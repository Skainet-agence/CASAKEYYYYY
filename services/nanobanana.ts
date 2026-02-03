import { GoogleGenerativeAI, Part } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

// ═══════════════════════════════════════════════════════════════
//                    TEXT-ONLY COORDINATE GENERATION
//                    (No mask image to avoid rectangle rendering)
// ═══════════════════════════════════════════════════════════════

export async function generateEnhancedImage(
    prompt: string,
    originalImageBase64: string,
    _maskImageBase64?: string // Ignored - we don't send mask anymore
): Promise<string> {
    if (!API_KEY) throw new Error("Clé API Google manquante.");

    // Original working model
    const MODEL_NAME = "gemini-3-pro-image-preview";

    try {
        console.log(`🔒 Text-Only Precision: Generating without mask image...`);
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        // Build parts: ONLY source image + text instructions (NO mask)
        const parts: Part[] = [
            {
                inlineData: {
                    data: originalImageBase64.replace(/^data:image\/\w+;base64,/, ""),
                    mimeType: "image/jpeg"
                }
            },
            { text: buildTextOnlyPrompt(prompt) }
        ];

        console.log(`📋 Sending text-only instructions (no mask image)`);

        const result = await model.generateContent({
            contents: [{ role: 'user', parts }],
            generationConfig: {
                temperature: 0.2,
                topP: 0.8,
                topK: 40,
            }
        });

        const response = await result.response;

        if (response.candidates && response.candidates.length > 0) {
            const candidate = response.candidates[0];

            if (candidate.finishReason === "SAFETY") {
                throw new Error("Génération bloquée par les filtres de sécurité.");
            }

            if (candidate.content && candidate.content.parts) {
                for (const part of candidate.content.parts) {
                    if (part.inlineData && part.inlineData.data) {
                        console.log("✅ Text-Only Generation: Success");
                        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    }
                }
            }
        }

        throw new Error("Le modèle n'a pas renvoyé d'image. Vérifiez votre quota.");
    } catch (err: any) {
        console.error(`❌ Generation Error:`, err);
        throw new Error(err.message || "Erreur de génération d'image");
    }
}

// Build text-only prompt with strict constraints
function buildTextOnlyPrompt(userPrompt: string): string {
    return `
PHOTO EDITING TASK

You are an expert photo retoucher. Edit the provided image according to these instructions.

══════════════════════════════════════════════════════════════════
                    ABSOLUTE RULES (VIOLATION = FAILURE)
══════════════════════════════════════════════════════════════════

❌ DO NOT add ANY objects not already in the source photo
❌ DO NOT draw any rectangles, boxes, outlines, or markers
❌ DO NOT add text, labels, or annotations
❌ DO NOT change the overall composition or perspective
❌ DO NOT modify areas that are not mentioned in the instructions

✅ ONLY modify the specific elements described below
✅ Keep 99% of the image pixel-identical to the source
✅ Apply changes SURGICALLY to the exact locations specified

══════════════════════════════════════════════════════════════════
                    MODIFICATIONS TO APPLY
══════════════════════════════════════════════════════════════════

${userPrompt}

══════════════════════════════════════════════════════════════════
                    OUTPUT REQUIREMENTS
══════════════════════════════════════════════════════════════════

Generate ONE edited image that:
1. Looks like the original except for the requested changes
2. Has NO visual markers, boxes, or outlines
3. Is photorealistic and seamless
`;
}

// Legacy function kept for compatibility
export async function findBestImageModel(): Promise<string> {
    return "gemini-2.0-flash-exp-image-generation";
}
