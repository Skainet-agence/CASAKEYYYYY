import { ProcessingRequest, MaskLayer } from '../types';
import { generateDesignPrompt, generateRefinementPrompt } from './gemini';
import { generateEnhancedImage } from './nanobanana';

export interface OrchestratorResult {
    imageUrl: string;
    finalPrompt: string;
}

// Helper: Create individual zone masks for sequential processing
async function createZoneMasks(layers: MaskLayer[]): Promise<Map<string, string>> {
    const zoneMasks = new Map<string, string>();

    for (const layer of layers) {
        if (layer.base64Mask) {
            zoneMasks.set(layer.color, layer.base64Mask);
        }
    }

    return zoneMasks;
}

// Helper: Merge all mask layers into a single B&W mask
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

            // Dilate mask overlay for better coverage
            ctx.globalCompositeOperation = 'source-over';

            for (const layer of layers) {
                await new Promise<void>((res) => {
                    const img = new Image();
                    img.onload = () => {
                        // Draw with slight dilation for edge coverage
                        ctx.shadowBlur = 3;
                        ctx.shadowColor = "white";
                        ctx.drawImage(img, 0, 0);
                        ctx.shadowBlur = 0;
                        res();
                    };
                    img.onerror = () => res();
                    img.src = layer.base64Mask;
                });
            }

            // Convert colored areas to pure white for mask clarity
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // If any channel is significantly non-black, make it white
                if (r > 30 || g > 30 || b > 30) {
                    data[i] = 255;     // R
                    data[i + 1] = 255; // G
                    data[i + 2] = 255; // B
                }
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        baseImg.onerror = () => resolve(undefined);
        baseImg.src = layers[0].base64Mask;
    });
}

// Helper: Create a colored mask overlay with zone labels
async function createColoredMaskWithLabels(layers: MaskLayer[]): Promise<string | undefined> {
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

            // Transparent background
            ctx.clearRect(0, 0, canvas.width, canvas.height);

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

            resolve(canvas.toDataURL('image/png'));
        };
        baseImg.onerror = () => resolve(undefined);
        baseImg.src = layers[0].base64Mask;
    });
}

export async function processEstateImage(request: ProcessingRequest): Promise<OrchestratorResult> {
    console.log("🔒 Precision Lock Orchestrator: Starting Surgical Workflow");

    // Step 0: Create both mask types
    console.log("🎨 Creating composite B&W mask...");
    const compositeMask = await createCompositeMask(request.layers);
    if (compositeMask) console.log("✅ Composite Mask Created (B&W)");

    console.log("🎨 Creating colored mask overlay...");
    const coloredMask = await createColoredMaskWithLabels(request.layers);
    if (coloredMask) console.log("✅ Colored Mask Created");

    // Step 1: Gemini Brain (Structured JSON Plan)
    console.log("🧠 Consulting Gemini for Structured Edit Plan...");
    const structuredPrompt = await generateDesignPrompt(request, compositeMask);
    console.log("📋 Structured Prompt Generated:", structuredPrompt.substring(0, 200) + "...");

    // Step 2: Precision Lock Generation
    console.log("🔒 Sending to Precision Lock Generator...");
    const imageUrl = await generateEnhancedImage(structuredPrompt, request.originalImage, compositeMask);

    return {
        imageUrl,
        finalPrompt: structuredPrompt
    };
}

export async function refineEstateImage(
    currentImageBase64: string,
    currentPrompt: string,
    userInstruction: string
): Promise<OrchestratorResult> {
    console.log("🔒 Precision Lock: Starting Refinement Loop");

    // Step 1: Gemini updates the prompt based on user feedback
    console.log("🧠 Refining structured prompt with Gemini...");
    const refinedPrompt = await generateRefinementPrompt(currentPrompt, userInstruction);
    console.log("📋 Refined Prompt:", refinedPrompt.substring(0, 200) + "...");

    // Step 2: Re-generate with refined prompt
    // For refinement, we use the current image as the new source
    console.log("🔒 Re-rendering with Precision Lock...");
    const imageUrl = await generateEnhancedImage(refinedPrompt, currentImageBase64);

    return {
        imageUrl,
        finalPrompt: refinedPrompt
    };
}
