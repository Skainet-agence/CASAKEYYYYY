import { GoogleGenerativeAI } from "@google/generative-ai";
import { ProcessingRequest } from '../types';

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

// Fonction purement texte (Logique & Prompting)
export async function generateDesignPrompt(request: ProcessingRequest, maskBase64?: string): Promise<string> {
  if (!API_KEY) throw new Error("Clé API manquante.");

  const genAI = new GoogleGenerativeAI(API_KEY);
  // Use Gemini 2.0 Flash for its superior reasoning and multimodal capabilities
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: `You are the "Surgical DNA Architect".
    
    YOUR MISSION: 
    Analyze the provided image and generate a coordinate-aware prompt for an expert renderer.
    
    ZERO-HALLUCINATION RULES:
    1. STRICT PRESERVATION: Objects NOT mentioned in user requests must remain 100% untouched. DO NOT add pillows, plants, or any new items.
    2. TOTAL COUNT: Your output must state the exact number of modifications to perform.
    3. OBJECT-RELATIVE INDEXING: Describe every zone by its clock-position or relationship to fixed anchors (e.g., "The small plastic tip at the bottom-left leg of the wicker chair").
    4. COLOR SYNCHRONIZATION: Explicitly link colors to architectural details (Zone Blue = Chair Foot, Zone Green = Specific Pillow on the right).
    
    OUTPUT STRUCTURE (Strict RAW text):
    "TASK: Perform [N] specific modifications. FIXATION: Maintain [Anchor List] geometry. MOD [1]: At [Coordinate], transform [Source Element] into [Target Request] using [Texture/Material]. MOD [2]: ..."`
  });

  // Build the User Instruction string with Safety IDs
  let userInstructions = "";
  request.layers.forEach((layer, index) => {
    userInstructions += `[LOCK #${index + 1}] Zone ${layer.color} (${layer.id}): ${layer.prompt}\n`;
  });

  // Prepare Multimodal Input
  const parts: any[] = [];

  // 1. Instructions
  parts.push({
    text: `
      INPUT ANALYSIS:
      1. REFERENCE IMAGE: Amateur photo provided below.
      2. MASK FILE: Defines the [LOCK] areas.
      3. USER ORDERS:
      ${userInstructions}

      EXECUTE PROTOCOL:
      - Analyze the "Amateur" image.
      - Mentally "Upgrade" it to 4K Luxury.
      - For every [LOCK] instruction above, rewrite that specific part of the image description.
      - For every non-masked area, describe it EXACTLY as is, but in "High Res".
  `});

  // 2. Original Image
  parts.push({
    inlineData: {
      data: request.originalImage.replace(/^data:image\/\w+;base64,/, ""),
      mimeType: "image/jpeg"
    }
  });

  // 3. Mask (if available)
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
    return result.response.text();
  } catch (e) {
    console.error("Gemini Vision Error:", e);
    // Fallback if Vision fails
    return `Luxury professional real estate photography, 8k resolution, perfect lighting. ${userInstructions}`;
  }
}

export async function generateRefinementPrompt(currentImagePrompt: string, userInstruction: string): Promise<string> {
  if (!API_KEY) throw new Error("Clé API manquante.");

  const genAI = new GoogleGenerativeAI(API_KEY);
  // UPGRADE: Use Gemini 2.0 Flash for consistency with the main flow
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: `You are the "Nano Banana" Engine (Refinement Mode).
    
    MISSION: Update an existing high-end real estate prompt based on user feedback.
    
    CRITICAL QUALITY CONTROL:
    - Retain ALL existing "8K/Luxury/Lighting/Texture" keywords from the ORIGINAL PROMPT.
    - DO NOT simplify the prompt.
    - Insert the user's requested change seamlessly into the scene description.
    
    Example:
    Original: "Modern living room, white sofa, marble floor, 8k..."
    User: "Make the sofa red"
    Output: "Modern living room, RED VELVET sofa, marble floor, 8k..." (Note: Added texture to match luxury style)
    
    OUTPUT: Return ONLY the updated raw prompt.`
  });

  const metaPrompt = `
      ORIGINAL PROMPT:
      "${currentImagePrompt}"

      USER FEEDBACK:
      "${userInstruction}"

      TASK:
      Rewrite the prompt to apply the feedback while maintaining "Architectural Digest" quality.
    `;

  try {
    const result = await model.generateContent(metaPrompt);
    return result.response.text();
  } catch (e) {
    console.error("Gemini Refine Error:", e);
    // Fallback logic
    return `${currentImagePrompt}, ${userInstruction}`;
  }
}