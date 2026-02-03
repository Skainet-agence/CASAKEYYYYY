import { ProcessingRequest, MaskLayer } from '../types';
import { enhanceAllPrompts, getNikonZ9UpgradePrompt, getSingleZoneEditPrompt, generateRefinementPrompt } from './gemini';
import { generateBaseUpgrade, generateSingleZoneEdit, generateEnhancedImage } from './nanobanana';

export interface OrchestratorResult {
    imageUrl: string;
    finalPrompt: string;
}

interface ZoneResult {
    success: boolean;
    attempts: number;
    zoneName: string;
}

// ═══════════════════════════════════════════════════════════════
//                    SEQUENTIAL NIKON Z9 PIPELINE
// ═══════════════════════════════════════════════════════════════

export async function processEstateImage(request: ProcessingRequest): Promise<OrchestratorResult> {
    console.log("📸 Sequential Nikon Z9 Pipeline: Starting...");
    console.log(`   Total zones to process: ${request.layers.length}`);

    const results: ZoneResult[] = [];
    let currentImage = request.originalImage;

    // ═══════════════════════════════════════════════════════════
    // PHASE 1: Enhance all prompts
    // ═══════════════════════════════════════════════════════════
    console.log("\n🧠 PHASE 1: Enhancing prompts...");
    const enhancedZones = await enhanceAllPrompts(request);

    // Sort by estimated zone size (smaller zones first for better precision)
    // We estimate size based on prompt complexity as a proxy
    enhancedZones.sort((a, b) => a.enhancedPrompt.length - b.enhancedPrompt.length);

    // ═══════════════════════════════════════════════════════════
    // PHASE 2: Generate Nikon Z9 quality base
    // ═══════════════════════════════════════════════════════════
    console.log("\n✨ PHASE 2: Upgrading to Nikon Z9 quality...");
    const nikonPrompt = getNikonZ9UpgradePrompt();

    try {
        currentImage = await generateBaseUpgrade(request.originalImage, nikonPrompt);
        console.log("✅ Base quality upgrade complete");
    } catch (err) {
        console.warn("⚠️ Base upgrade failed, continuing with original image");
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 3-N: Process each zone sequentially
    // ═══════════════════════════════════════════════════════════
    console.log("\n🎯 PHASE 3+: Processing zones sequentially...");

    for (let i = 0; i < enhancedZones.length; i++) {
        const zone = enhancedZones[i];
        console.log(`\n--- Zone ${i + 1}/${enhancedZones.length}: ${zone.layer.color} ---`);
        console.log(`Target: ${zone.objectDescription}`);
        console.log(`Location: ${zone.locationDescription}`);

        const zonePrompt = getSingleZoneEditPrompt(zone, i + 1, enhancedZones.length);
        let zoneSuccess = false;
        let attempts = 0;
        const maxAttempts = 2; // Limit retries to avoid excessive API calls

        for (let attempt = 1; attempt <= maxAttempts && !zoneSuccess; attempt++) {
            attempts = attempt;
            try {
                console.log(`  Attempt ${attempt}/${maxAttempts}...`);
                const newImage = await generateSingleZoneEdit(currentImage, zonePrompt, attempt);

                // Basic validation: check if we got a valid image
                if (newImage && newImage.startsWith('data:image')) {
                    currentImage = newImage;
                    zoneSuccess = true;
                    console.log(`  ✅ Zone ${i + 1} complete`);
                }
            } catch (err: any) {
                console.error(`  ❌ Attempt ${attempt} failed:`, err.message);

                if (attempt === maxAttempts) {
                    console.warn(`  ⚠️ Zone ${i + 1} skipped after ${maxAttempts} attempts`);
                }
            }
        }

        results.push({
            success: zoneSuccess,
            attempts,
            zoneName: zone.layer.color
        });
    }

    // ═══════════════════════════════════════════════════════════
    // Summary
    // ═══════════════════════════════════════════════════════════
    const successCount = results.filter(r => r.success).length;
    console.log(`\n📊 Pipeline Complete: ${successCount}/${results.length} zones successful`);
    results.forEach((r, i) => {
        console.log(`   Zone ${i + 1} (${r.zoneName}): ${r.success ? '✅' : '❌'} (${r.attempts} attempts)`);
    });

    // Build final prompt summary
    const promptSummary = enhancedZones.map((z, i) =>
        `[Zone ${i + 1}] ${z.layer.color}: ${z.enhancedPrompt.substring(0, 100)}...`
    ).join('\n');

    return {
        imageUrl: currentImage,
        finalPrompt: promptSummary
    };
}

// ═══════════════════════════════════════════════════════════════
//                    REFINEMENT (Post-processing)
// ═══════════════════════════════════════════════════════════════

export async function refineEstateImage(
    currentImageBase64: string,
    currentPrompt: string,
    userInstruction: string
): Promise<OrchestratorResult> {
    console.log("🔄 Refinement: Processing user feedback...");

    const refinedPrompt = await generateRefinementPrompt(currentPrompt, userInstruction);

    const refinementEditPrompt = `REFINEMENT EDIT

Apply this user feedback to the image:

${userInstruction}

Enhanced instruction:
${refinedPrompt}

RULES:
- Make ONLY the requested change
- Maintain premium Nikon Z9 quality
- Do NOT add new objects
- Do NOT draw boxes or markers`;

    const imageUrl = await generateSingleZoneEdit(currentImageBase64, refinementEditPrompt);

    return {
        imageUrl,
        finalPrompt: refinedPrompt
    };
}
