import { ProcessingRequest, MaskLayer } from '../types';
import { generateDesignPrompt, generateRefinementPrompt } from './gemini';
import { generateEnhancedImage } from './nanobanana';

export interface OrchestratorResult {
    imageUrl: string;
    finalPrompt: string;
}

// Helper: Merge all mask layers into a single B&W mask for the AI
// White = Area to Modify, Black = Area to Keep
async function createCompositeMask(layers: MaskLayer[]): Promise<string | undefined> {
    if (!layers || layers.length === 0) return undefined;

    return new Promise((resolve, reject) => {
        // Load the first mask to determine dimensions
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

            // Composite operation: We want to Add white areas
            ctx.globalCompositeOperation = 'source-over';

            for (const layer of layers) {
                await new Promise<void>((res) => {
                    const img = new Image();
                    img.onload = () => {
                        ctx.drawImage(img, 0, 0);
                        res();
                    };
                    img.onerror = () => res(); // Skip bad layers
                    img.src = layer.base64Mask;
                });
            }

            // Return as Base64 (PNG to preserve quality/alpha if needed, but JPG usually ok for masks)
            // But usually APIs prefer PNG
            resolve(canvas.toDataURL('image/png'));
        };
        baseImg.onerror = (e) => {
            console.error("Mask load error", e);
            resolve(undefined);
        };
        baseImg.src = layers[0].base64Mask;
    });
}

export async function processEstateImage(request: ProcessingRequest): Promise<OrchestratorResult> {
    console.log("🎻 Orchestrator: Starting Dual-AI Workflow");

    // Step 0: Prep Mask
    console.log("🎨 Orchestrator: Merging masks...");
    const compositeMask = await createCompositeMask(request.layers);
    if (compositeMask) console.log("✅ Composite Mask Created");

    // Step 1: Gemini Brain (Analyze & Plan)
    console.log("🧠 Orchestrator: Consulting Gemini for Prompt Engineering...");
    // Pass compositeMask to enable Smart Visual Analysis
    const optimizedPrompt = await generateDesignPrompt(request, compositeMask);
    console.log("📝 Optimized Prompt:", optimizedPrompt);

    // Step 2: Nano Banana (Render & Magic)
    console.log("🍌 Orchestrator: Sending to Nano Banana Pro for 4K Rendering...");
    const imageUrl = await generateEnhancedImage(optimizedPrompt, request.originalImage, compositeMask);

    return {
        imageUrl,
        finalPrompt: optimizedPrompt
    };
}

export async function refineEstateImage(
    currentImageBase64: string,
    currentPrompt: string,
    userInstruction: string
): Promise<OrchestratorResult> {
    console.log("🎻 Orchestrator: Starting Refinement Loop");

    // Step 1: Gemini updates the prompt based on user chat
    console.log("🧠 Orchestrator: Refining prompt with Gemini...");
    const refinedPrompt = await generateRefinementPrompt(currentPrompt, userInstruction);
    console.log("📝 Refined Prompt:", refinedPrompt);

    // Step 2: Nano Banana re-renders
    // For refinement, we typically don't use the original mask unless requested.
    // We assume global edit or specific instruction based edit.
    // If we wanted to re-use the mask, we'd need to pass it here.
    console.log("🍌 Orchestrator: Re-rendering with Nano Banana...");
    const imageUrl = await generateEnhancedImage(refinedPrompt, currentImageBase64);

    return {
        imageUrl,
        finalPrompt: refinedPrompt
    };
}
