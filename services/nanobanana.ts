import { GoogleGenerativeAI, Part } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

// Phase 2: Hardcoded Negative Constraints + Triple-Input Guide
export async function generateEnhancedImage(
    prompt: string,
    originalImageBase64: string,
    maskImageBase64?: string
): Promise<string> {
    if (!API_KEY) throw new Error("Clé API Google manquante.");

    const MODEL_NAME = "gemini-3-pro-image-preview";

    try {
        console.log(`🔒 Precision Lock: Initiating surgical generation...`);
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        // Build the parts array: Source Image + Mask + Surgical Prompt
        const parts: Part[] = [];

        // 1. SOURCE IMAGE (Sacred Reference)
        parts.push({
            inlineData: {
                data: originalImageBase64.replace(/^data:image\/\w+;base64,/, ""),
                mimeType: "image/jpeg"
            }
        });

        // 2. MASK (White = Edit, Black = Protect)
        if (maskImageBase64) {
            parts.push({
                inlineData: {
                    data: maskImageBase64.replace(/^data:image\/\w+;base64,/, ""),
                    mimeType: "image/png"
                }
            });
        }

        // 3. SURGICAL PROMPT with Hardcoded Negative Constraints
        const surgicalPrompt = buildSurgicalPrompt(prompt, !!maskImageBase64);
        parts.push({ text: surgicalPrompt });

        console.log(`📋 Surgical Prompt Sent:\n${surgicalPrompt.substring(0, 500)}...`);

        const result = await model.generateContent({
            contents: [{ role: 'user', parts }],
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
                        console.log("✅ Precision Lock: Image generated successfully");
                        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    }
                }
            }
        }

        throw new Error("Le modèle n'a pas renvoyé d'image. Vérifiez votre quota.");
    } catch (err: any) {
        console.error(`❌ Precision Lock Error:`, err);
        throw new Error(err.message || "Erreur de génération d'image");
    }
}

// Build surgical prompt with hardcoded negative constraints
function buildSurgicalPrompt(userPrompt: string, hasMask: boolean): string {
    const negativeConstraints = `
═══════════════════════════════════════════════════════════════
                    PRECISION LOCK PROTOCOL v2.0
═══════════════════════════════════════════════════════════════

ROLE: You are an ELITE architectural photo retoucher. Your job is 
to execute SURGICAL modifications while preserving everything else.

═══════════════════════════════════════════════════════════════
                    ABSOLUTE PROHIBITIONS (VIOLATION = FAILURE)
═══════════════════════════════════════════════════════════════

❌ NEVER add objects not visible in IMAGE 1 (source)
❌ NEVER add lamps, plants, pillows, decorations, or furniture
❌ NEVER change colors of items unless EXPLICITLY requested
❌ NEVER modify areas covered by BLACK pixels in IMAGE 2 (mask)
❌ NEVER reinterpret or "improve" the scene creatively

═══════════════════════════════════════════════════════════════
                    MANDATORY PRESERVATION
═══════════════════════════════════════════════════════════════

✅ IMAGE 1 is the SACRED SOURCE - copy it pixel-for-pixel where no edit is requested
✅ Maintain exact composition, perspective, and dimensions
✅ Preserve all colors unless change is explicitly requested
✅ Keep object count exactly as in source (no additions, no removals unless asked)

${hasMask ? `
═══════════════════════════════════════════════════════════════
                    MASK INTERPRETATION
═══════════════════════════════════════════════════════════════

IMAGE 2 is the MASK:
- BLACK pixels = PROTECTED ZONE → Copy exactly from source
- WHITE pixels = EDIT ZONE → Apply modifications below
- ANY colored pixels = Specific edit zone` : ''}

═══════════════════════════════════════════════════════════════
                    SURGICAL MODIFICATIONS TO EXECUTE
═══════════════════════════════════════════════════════════════

${userPrompt}

═══════════════════════════════════════════════════════════════
                    OUTPUT REQUIREMENTS
═══════════════════════════════════════════════════════════════

Generate a single high-resolution image that:
1. Looks nearly identical to the source except for the requested edits
2. Contains NO new objects that weren't in the source
3. Preserves the exact atmosphere and lighting style
4. Maintains original colors where no change was requested
`;

    return negativeConstraints;
}

// Legacy function for model discovery (kept for compatibility)
export async function findBestImageModel(): Promise<string> {
    return "gemini-3-pro-image-preview";
}
