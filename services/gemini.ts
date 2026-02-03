import { GoogleGenerativeAI } from "@google/generative-ai";
import { ProcessingRequest } from '../types';

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

// Structured Zone Modification Interface
interface ZoneModification {
  zone: string;
  color: string;
  location: string;
  action: string;
  details: string;
  preserve_attributes?: string[];
}

interface StructuredPrompt {
  total_modifications: number;
  protected_elements: string[];
  forbidden_actions: string[];
  modifications: ZoneModification[];
}

// Phase 1: Structured JSON Prompt Generation
export async function generateDesignPrompt(request: ProcessingRequest, maskBase64?: string): Promise<string> {
  if (!API_KEY) throw new Error("Clé API manquante.");

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: `You are the "Precision Lock Architect" - a surgical image editing planner.

CRITICAL MISSION:
Analyze the source image and user's zone-based instructions to create a STRUCTURED editing plan.

ABSOLUTE RULES (VIOLATION = COMPLETE FAILURE):
1. NEVER invent objects not visible in source image
2. NEVER modify anything outside the painted mask zones
3. When user says "straighten pillows" - KEEP THE ORIGINAL COLOR, only adjust position
4. When user says "change X to color Y" - ONLY change the color, nothing else
5. Each zone instruction applies ONLY to pixels covered by that color mask

OUTPUT FORMAT (Strict JSON):
{
  "total_modifications": <number>,
  "protected_elements": ["element1", "element2", ...],
  "forbidden_actions": ["add_lamp", "change_cushion_color", ...],
  "modifications": [
    {
      "zone": "RED|BLUE|GREEN|YELLOW|PURPLE",
      "color": "#hex",
      "location": "precise position description",
      "action": "remove|change_color|adjust|turn_on|turn_off",
      "details": "exact instruction",
      "preserve_attributes": ["color", "shape", "size"]
    }
  ]
}

RESPOND WITH ONLY THE JSON, NO MARKDOWN FENCES.`
  });

  // Build zone instructions with explicit color preservation
  const zoneInstructions: string[] = [];
  request.layers.forEach((layer, index) => {
    const colorName = layer.color.toUpperCase();
    zoneInstructions.push(`ZONE ${index + 1} (${colorName}): "${layer.prompt}"`);
  });

  const parts: any[] = [];

  // Instructions with explicit preservation rules
  parts.push({
    text: `ANALYSIS REQUEST:

SOURCE IMAGE: Provided below (this is the SACRED reference - protect everything not explicitly mentioned)

PAINTED ZONES AND USER REQUESTS:
${zoneInstructions.join('\n')}

CRITICAL CONTEXT:
- If user mentions "pillows are straight" → ONLY adjust position, KEEP original blue color
- If no zone covers an area → that area is 100% PROTECTED
- Count the exact number of modifications requested (should match zone count)

Generate the structured JSON plan.`
  });

  // Original Image
  parts.push({
    inlineData: {
      data: request.originalImage.replace(/^data:image\/\w+;base64,/, ""),
      mimeType: "image/jpeg"
    }
  });

  // Mask (if available)
  if (maskBase64) {
    parts.push({
      inlineData: {
        data: maskBase64.replace(/^data:image\/\w+;base64,/, ""),
        mimeType: "image/png"
      }
    });
  }

  try {
    const result = await model.generateContent(parts);
    const jsonText = result.response.text().trim();

    // Validate JSON structure
    try {
      const parsed: StructuredPrompt = JSON.parse(jsonText);
      console.log("📋 Structured Plan:", parsed);

      // Convert JSON to surgical prompt for the image generator
      return convertToSurgicalPrompt(parsed, request);
    } catch (parseError) {
      console.warn("JSON parse failed, using raw response:", jsonText);
      return jsonText;
    }
  } catch (e) {
    console.error("Gemini Vision Error:", e);
    return buildFallbackPrompt(request);
  }
}

// Convert structured JSON to surgical prompt
function convertToSurgicalPrompt(plan: StructuredPrompt, request: ProcessingRequest): string {
  const parts: string[] = [];

  // Header with modification count
  parts.push(`SURGICAL EDIT PLAN: Execute exactly ${plan.total_modifications} modifications.`);

  // Protected elements (NEVER TOUCH)
  if (plan.protected_elements.length > 0) {
    parts.push(`\nPROTECTED (copy pixel-for-pixel from source): ${plan.protected_elements.join(', ')}`);
  }

  // Forbidden actions
  if (plan.forbidden_actions.length > 0) {
    parts.push(`\nFORBIDDEN ACTIONS: ${plan.forbidden_actions.join(', ')}`);
  }

  // Individual modifications with explicit preservation
  parts.push('\nMODIFICATIONS:');
  plan.modifications.forEach((mod, i) => {
    let instruction = `[MOD ${i + 1}] Zone ${mod.zone} at ${mod.location}: ${mod.action.toUpperCase()} - ${mod.details}`;
    if (mod.preserve_attributes && mod.preserve_attributes.length > 0) {
      instruction += ` (PRESERVE: ${mod.preserve_attributes.join(', ')})`;
    }
    parts.push(instruction);
  });

  return parts.join('\n');
}

// Fallback prompt with explicit preservation rules
function buildFallbackPrompt(request: ProcessingRequest): string {
  let prompt = "SURGICAL RETOUCHING - STRICT PRESERVATION MODE:\n";
  prompt += "RULE: Only modify explicitly mentioned areas. Everything else = pixel-perfect copy.\n\n";

  request.layers.forEach((layer, i) => {
    prompt += `[ZONE ${i + 1}] ${layer.color.toUpperCase()}: ${layer.prompt}\n`;
  });

  return prompt;
}

export async function generateRefinementPrompt(currentImagePrompt: string, userInstruction: string): Promise<string> {
  if (!API_KEY) throw new Error("Clé API manquante.");

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: `You are the "Precision Lock" Engine (Refinement Mode).
    
MISSION: Surgically update an existing edit plan based on user feedback.

RULES:
1. NEVER add new objects not in original
2. If user says "don't touch X" → add X to protected_elements
3. Preserve the structure of the original plan
4. Only modify the specific aspect mentioned

OUTPUT: Return the updated surgical prompt maintaining all quality keywords.`
  });

  const metaPrompt = `
CURRENT PLAN:
"${currentImagePrompt}"

USER CORRECTION:
"${userInstruction}"

Apply the correction while maintaining strict preservation rules.`;

  try {
    const result = await model.generateContent(metaPrompt);
    return result.response.text();
  } catch (e) {
    console.error("Gemini Refine Error:", e);
    return `${currentImagePrompt}\n\nADDITIONAL INSTRUCTION: ${userInstruction}`;
  }
}