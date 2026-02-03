import { ProcessingRequest, MaskLayer } from '../types';
import { generateDesignPrompt, generateRefinementPrompt } from './gemini';
import { generateEnhancedImage } from './nanobanana';

export interface OrchestratorResult {
    imageUrl: string;
    finalPrompt: string;
}

// ═══════════════════════════════════════════════════════════════
//                    SINGLE-PASS ENHANCED PROCESSING
// ═══════════════════════════════════════════════════════════════

// Merge all mask layers into a single B&W mask
// White = Area to Modify, Black = Area to Keep
async function createCompositeMask(layers: MaskLayer[]): Promise<string | undefined> {
    if (!layers || layers.length === 0) return undefined;

    return new Promise((resolve) => {
        const baseImg = new Image();
        baseImg.onload = async () => {
            const canvas = document.createElement('canvas');
            canvas.width = baseImg.width;
            canvas.height = baseImg.height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                resolve(undefined);
                return;
            }

            // Fill background with BLACK (Protected)
            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw all layers
            for (const layer of layers) {
                await new Promise<void>((res) => {
                    const img = new Image();
                    img.onload = () => {
                        ctx.drawImage(img, 0, 0);
                        res();
                    };
                    img.onerror = () => res();
                    img.src = layer.base64Mask;
                });
            }

            // Convert all colored pixels to pure WHITE
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // If any channel significantly differs from black, make it white
                if (r > 20 || g > 20 || b > 20) {
                    data[i] = 255;     // R
                    data[i + 1] = 255; // G
                    data[i + 2] = 255; // B
                    data[i + 3] = 255; // A
                } else {
                    data[i] = 0;
                    data[i + 1] = 0;
                    data[i + 2] = 0;
                    data[i + 3] = 255;
                }
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        baseImg.onerror = () => resolve(undefined);
        baseImg.src = layers[0].base64Mask;
    });
}

// Build a comprehensive multi-zone prompt
function buildMultiZonePrompt(layers: MaskLayer[]): string {
    const zoneInstructions = layers.map((layer, i) => {
        return `[ZONE ${i + 1}] ${layer.color.toUpperCase()}: ${layer.prompt}`;
    }).join('\n');

    return `
ALL-IN-ONE SURGICAL EDIT

TOTAL MODIFICATIONS REQUIRED: ${layers.length}

${zoneInstructions}

CRITICAL EXECUTION RULES:
1. Apply ALL ${layers.length} modifications in this single pass
2. WHITE pixels in mask = APPLY the corresponding zone instruction
3. BLACK pixels in mask = COPY EXACTLY from source (pixel-perfect preservation)
4. NEVER add objects not visible in the source image
5. NEVER change colors unless explicitly requested for that zone
6. Preserve the EXACT composition, perspective, and lighting of the source

OUTPUT: A single high-resolution image with ALL modifications applied.
`;
}

// ═══════════════════════════════════════════════════════════════
//                    MAIN ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════

export async function processEstateImage(request: ProcessingRequest): Promise<OrchestratorResult> {
    console.log("🔒 Single-Pass Orchestrator: Starting Enhanced Workflow");

    // Step 1: Create composite B&W mask
    console.log("🎨 Creating composite B&W mask...");
    const compositeMask = await createCompositeMask(request.layers);
    if (compositeMask) {
        console.log("✅ Composite Mask Created (Pure B&W)");
    }

    // Step 2: Generate structured prompt with Gemini
    console.log("🧠 Generating structured prompt with Gemini...");
    const structuredPrompt = await generateDesignPrompt(request, compositeMask);
    console.log("📋 Prompt ready:", structuredPrompt.substring(0, 200) + "...");

    // Step 3: Build comprehensive multi-zone prompt
    const multiZonePrompt = buildMultiZonePrompt(request.layers);
    const finalPrompt = structuredPrompt + "\n\n" + multiZonePrompt;

    // Step 4: Single-pass generation with all zones
    console.log("🔒 Generating with Precision Lock (Single Pass)...");
    const imageUrl = await generateEnhancedImage(
        finalPrompt,
        request.originalImage,
        compositeMask
    );

    console.log("✅ Generation Complete");

    return {
        imageUrl,
        finalPrompt
    };
}

export async function refineEstateImage(
    currentImageBase64: string,
    currentPrompt: string,
    userInstruction: string
): Promise<OrchestratorResult> {
    console.log("🔒 Single-Pass Orchestrator: Starting Refinement");

    // Step 1: Refine prompt with Gemini
    console.log("🧠 Refining prompt with Gemini...");
    const refinedPrompt = await generateRefinementPrompt(currentPrompt, userInstruction);
    console.log("📋 Refined Prompt:", refinedPrompt.substring(0, 200) + "...");

    // Step 2: Re-generate with refined prompt
    console.log("🔒 Re-generating with Precision Lock...");
    const imageUrl = await generateEnhancedImage(refinedPrompt, currentImageBase64);

    return {
        imageUrl,
        finalPrompt: refinedPrompt
    };
}
