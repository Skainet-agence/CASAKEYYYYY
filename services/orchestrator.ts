import { ProcessingRequest, MaskLayer } from '../types';
import { generateDesignPrompt, generateRefinementPrompt } from './gemini';
import { generateEnhancedImage } from './nanobanana';

export interface OrchestratorResult {
    imageUrl: string;
    finalPrompt: string;
}

// ═══════════════════════════════════════════════════════════════
//                    ZONE-BY-ZONE PROCESSING ENGINE
// ═══════════════════════════════════════════════════════════════

// Process each zone independently and composite results
async function processZoneByZone(
    originalImage: string,
    layers: MaskLayer[]
): Promise<string> {
    if (layers.length === 0) return originalImage;

    console.log(`🔒 Zone-by-Zone: Processing ${layers.length} zones sequentially...`);

    // Start with the original image
    let currentImage = originalImage;

    // Process each zone independently
    for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        console.log(`\n🎯 Processing Zone ${i + 1}/${layers.length}: ${layer.color}`);

        // Create isolated mask for this zone only
        const isolatedMask = await createIsolatedMask(layer, originalImage);

        // Create focused prompt for this single zone
        const focusedPrompt = buildFocusedZonePrompt(layer, i + 1, layers.length);

        try {
            // Generate this zone's edit using current state as source
            const zoneResult = await generateEnhancedImage(
                focusedPrompt,
                currentImage,
                isolatedMask
            );

            // Composite the zone result onto the current image
            currentImage = await compositeZoneResult(
                currentImage,
                zoneResult,
                isolatedMask
            );

            console.log(`✅ Zone ${i + 1} (${layer.color}) completed`);
        } catch (err) {
            console.error(`❌ Zone ${i + 1} failed:`, err);
            // Continue with other zones even if one fails
        }
    }

    return currentImage;
}

// Create a mask containing only the specified zone
async function createIsolatedMask(layer: MaskLayer, originalImage: string): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                resolve(layer.base64Mask);
                return;
            }

            // Start with black (protected)
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw only this layer's mask
            const maskImg = new Image();
            maskImg.onload = () => {
                ctx.drawImage(maskImg, 0, 0);

                // Convert to pure B&W
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                for (let i = 0; i < data.length; i += 4) {
                    if (data[i] > 30 || data[i + 1] > 30 || data[i + 2] > 30) {
                        data[i] = 255;
                        data[i + 1] = 255;
                        data[i + 2] = 255;
                    }
                }

                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            maskImg.onerror = () => resolve(layer.base64Mask);
            maskImg.src = layer.base64Mask;
        };
        img.onerror = () => resolve(layer.base64Mask);
        img.src = originalImage;
    });
}

// Build a focused prompt for a single zone
function buildFocusedZonePrompt(layer: MaskLayer, zoneNumber: number, totalZones: number): string {
    return `
SINGLE ZONE SURGICAL EDIT (Zone ${zoneNumber} of ${totalZones})

ZONE: ${layer.color.toUpperCase()}
INSTRUCTION: ${layer.prompt}

CRITICAL RULES:
1. ONLY modify the WHITE pixels in the mask
2. BLACK pixels = COPY EXACTLY from source (pixel-perfect)
3. Do NOT add any objects not in the source
4. Do NOT change colors unless explicitly requested
5. Focus ONLY on this specific instruction

OUTPUT: High-resolution image with ONLY this edit applied.
`;
}

// Composite zone result onto current image using mask
async function compositeZoneResult(
    currentImage: string,
    zoneResult: string,
    mask: string
): Promise<string> {
    return new Promise((resolve) => {
        const currentImg = new Image();
        currentImg.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = currentImg.width;
            canvas.height = currentImg.height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                resolve(zoneResult);
                return;
            }

            // Draw current state as base
            ctx.drawImage(currentImg, 0, 0);

            // Load zone result
            const resultImg = new Image();
            resultImg.onload = () => {
                // Load mask
                const maskImg = new Image();
                maskImg.onload = () => {
                    // Create mask canvas
                    const maskCanvas = document.createElement('canvas');
                    maskCanvas.width = canvas.width;
                    maskCanvas.height = canvas.height;
                    const maskCtx = maskCanvas.getContext('2d');

                    if (!maskCtx) {
                        ctx.drawImage(resultImg, 0, 0);
                        resolve(canvas.toDataURL('image/jpeg', 0.95));
                        return;
                    }

                    maskCtx.drawImage(maskImg, 0, 0);
                    const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

                    // Get both images' pixel data
                    const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                    // Create temp canvas for result
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = canvas.width;
                    tempCanvas.height = canvas.height;
                    const tempCtx = tempCanvas.getContext('2d');

                    if (tempCtx) {
                        tempCtx.drawImage(resultImg, 0, 0);
                        const resultData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

                        // Composite: use result pixels where mask is white
                        for (let i = 0; i < maskData.data.length; i += 4) {
                            const maskValue = maskData.data[i]; // R channel of mask

                            if (maskValue > 128) {
                                // White mask = use zone result
                                currentData.data[i] = resultData.data[i];
                                currentData.data[i + 1] = resultData.data[i + 1];
                                currentData.data[i + 2] = resultData.data[i + 2];
                            }
                            // Black mask = keep current (already there)
                        }

                        ctx.putImageData(currentData, 0, 0);
                    }

                    resolve(canvas.toDataURL('image/jpeg', 0.95));
                };
                maskImg.onerror = () => {
                    ctx.drawImage(resultImg, 0, 0);
                    resolve(canvas.toDataURL('image/jpeg', 0.95));
                };
                maskImg.src = mask;
            };
            resultImg.onerror = () => resolve(currentImage);
            resultImg.src = zoneResult;
        };
        currentImg.onerror = () => resolve(zoneResult);
        currentImg.src = currentImage;
    });
}

// ═══════════════════════════════════════════════════════════════
//                    COMPOSITE MASK (FALLBACK)
// ═══════════════════════════════════════════════════════════════

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

            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

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

            // Convert to pure B&W
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                if (data[i] > 30 || data[i + 1] > 30 || data[i + 2] > 30) {
                    data[i] = 255;
                    data[i + 1] = 255;
                    data[i + 2] = 255;
                }
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        baseImg.onerror = () => resolve(undefined);
        baseImg.src = layers[0].base64Mask;
    });
}

// ═══════════════════════════════════════════════════════════════
//                    MAIN ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════

export async function processEstateImage(request: ProcessingRequest): Promise<OrchestratorResult> {
    console.log("🔒 Excellence Orchestrator: Starting Zone-by-Zone Workflow");

    // Use Zone-by-Zone processing for ultimate precision
    const imageUrl = await processZoneByZone(request.originalImage, request.layers);

    // Build final prompt summary for reference
    const promptSummary = request.layers.map((l, i) =>
        `[Zone ${i + 1}] ${l.color}: ${l.prompt}`
    ).join('\n');

    return {
        imageUrl,
        finalPrompt: promptSummary
    };
}

export async function refineEstateImage(
    currentImageBase64: string,
    currentPrompt: string,
    userInstruction: string
): Promise<OrchestratorResult> {
    console.log("🔒 Excellence Orchestrator: Starting Refinement");

    const refinedPrompt = await generateRefinementPrompt(currentPrompt, userInstruction);
    const imageUrl = await generateEnhancedImage(refinedPrompt, currentImageBase64);

    return {
        imageUrl,
        finalPrompt: refinedPrompt
    };
}
