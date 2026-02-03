import { GoogleGenerativeAI } from "@google/generative-ai";
import { ProcessingRequest, MaskLayer } from '../types';

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

// ═══════════════════════════════════════════════════════════════
//                    PROMPT ENHANCEMENT ENGINE
// ═══════════════════════════════════════════════════════════════

interface EnhancedZone {
  layer: MaskLayer;
  enhancedPrompt: string;
  objectDescription: string;
  locationDescription: string;
}

// Enhance a single zone prompt to be ultra-precise
async function enhanceZonePrompt(
  layer: MaskLayer,
  originalImageBase64: string,
  zoneIndex: number
): Promise<EnhancedZone> {
  if (!API_KEY) throw new Error("Clé API manquante.");

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: `You are an expert photo editing assistant.
Your job is to transform a simple user instruction into a PRECISE, DETAILED editing command.

OUTPUT FORMAT (JSON):
{
  "objectDescription": "Detailed description of the target object",
  "locationDescription": "Precise location in the image (top-left, center, bottom-right, etc.)",
  "enhancedPrompt": "The complete, precise editing instruction"
}

RULES:
- Be extremely specific about WHAT to change
- Include the exact LOCATION in the image
- Describe the expected RESULT
- Keep the same intent as the original instruction`
  });

  try {
    const result = await model.generateContent([
      {
        text: `Zone ${zoneIndex + 1} (${layer.color}): "${layer.prompt}"
                
Analyze this image and enhance the editing instruction to be ultra-precise.`
      },
      {
        inlineData: {
          data: originalImageBase64.replace(/^data:image\/\w+;base64,/, ""),
          mimeType: "image/jpeg"
        }
      }
    ]);

    const responseText = result.response.text();

    // Try to parse JSON response
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          layer,
          enhancedPrompt: parsed.enhancedPrompt || layer.prompt,
          objectDescription: parsed.objectDescription || "Unknown object",
          locationDescription: parsed.locationDescription || "Unknown location"
        };
      }
    } catch {
      // Fallback: use raw response as enhanced prompt
    }

    return {
      layer,
      enhancedPrompt: responseText || layer.prompt,
      objectDescription: "Target object",
      locationDescription: "Specified location"
    };
  } catch (e) {
    console.error(`Prompt enhancement failed for zone ${zoneIndex}:`, e);
    return {
      layer,
      enhancedPrompt: layer.prompt,
      objectDescription: "Target object",
      locationDescription: "Specified location"
    };
  }
}

// Enhance all zone prompts
export async function enhanceAllPrompts(request: ProcessingRequest): Promise<EnhancedZone[]> {
  console.log(`🧠 Enhancing ${request.layers.length} zone prompts...`);

  const enhanced: EnhancedZone[] = [];

  for (let i = 0; i < request.layers.length; i++) {
    const zone = await enhanceZonePrompt(request.layers[i], request.originalImage, i);
    enhanced.push(zone);
    console.log(`✅ Zone ${i + 1} enhanced: "${zone.enhancedPrompt.substring(0, 50)}..."`);
  }

  return enhanced;
}

// ═══════════════════════════════════════════════════════════════
//                    NIKON Z9 BASE UPGRADE PROMPT
// ═══════════════════════════════════════════════════════════════

export function getNikonZ9UpgradePrompt(): string {
  return `PROFESSIONAL PHOTO REMASTER - NIKON Z9 QUALITY

Transform this amateur photo into a professional-grade image as if captured with a NIKON Z9 camera:

🔆 LIGHTING ENHANCEMENT:
- Increase overall brightness by 30%
- Add soft, natural ambient lighting
- Eliminate harsh shadows
- Create warm, inviting atmosphere

📸 QUALITY UPGRADE:
- 4K ultra-sharp resolution
- Perfect focus on all elements
- Zero motion blur
- HDR-like dynamic range
- Professional color grading

🎨 COLOR CORRECTION:
- Warm color temperature (5500K daylight)
- Rich but natural saturation
- No color banding or artifacts
- Balanced whites and blacks

⚠️ CRITICAL PRESERVATION:
- Keep EXACT same composition
- Keep ALL objects in their current positions
- Keep room layout unchanged
- NO new objects added
- NO objects removed

OUTPUT: One stunning, professionally-lit photograph.`;
}

// ═══════════════════════════════════════════════════════════════
//                    SINGLE ZONE EDIT PROMPT
// ═══════════════════════════════════════════════════════════════

export function getSingleZoneEditPrompt(zone: EnhancedZone, zoneNumber: number, totalZones: number): string {
  return `SURGICAL EDIT - Zone ${zoneNumber} of ${totalZones}

You are making ONE precise edit to this professional photo.

🎯 TARGET:
Object: ${zone.objectDescription}
Location: ${zone.locationDescription}

📋 INSTRUCTION:
${zone.enhancedPrompt}

⚠️ ABSOLUTE RULES:
- Change ONLY the described element
- Keep EVERYTHING else pixel-identical
- Maintain the premium Nikon Z9 quality
- Do NOT add any new objects
- Do NOT change colors of other elements
- Do NOT draw any boxes, markers, or outlines

OUTPUT: The same photo with ONLY this one modification applied.`;
}

// ═══════════════════════════════════════════════════════════════
//                    LEGACY FUNCTIONS (for compatibility)
// ═══════════════════════════════════════════════════════════════

export async function generateDesignPrompt(request: ProcessingRequest, _maskBase64?: string): Promise<string> {
  // This is now mostly handled by enhanceAllPrompts, but kept for compatibility
  const zones = request.layers.map((l, i) => `Zone ${i + 1} (${l.color}): ${l.prompt}`).join('\n');
  return `Professional photo editing:\n${zones}`;
}

export async function generateRefinementPrompt(currentPrompt: string, userInstruction: string): Promise<string> {
  if (!API_KEY) throw new Error("Clé API manquante.");

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  try {
    const result = await model.generateContent(`
Refine this editing instruction:
Current: ${currentPrompt}
User feedback: ${userInstruction}
Output: Updated instruction incorporating the feedback.`);
    return result.response.text();
  } catch {
    return `${currentPrompt}\n\nAdditional: ${userInstruction}`;
  }
}