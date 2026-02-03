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
    systemInstruction: `You are the "Architectural DNA Scanner".
    
    YOUR CRITICAL MISSION: 
    Analyze the provided image and create a 1:1 structural map for the rendering engine.
    
    RULES FOR THE PROMPT:
    1. DO NOT RENDER A NEW ROOM. You are RETOUCHING this specific room.
    2. ANCHORS: Start by identifying fixed elements (e.g., "The brown door on the left", "The U-shaped desk", "The circular mirror above the desk").
    3. SURGERY: Integrate the user's color-masked requests exactly where they are placed.
    4. HIGH-FIDELITY: Describe the textures (marble, oak, brushed gold) but maintain the exact dimensions and perspective of the original photo.
    
    OUTPUT STRUCTURE (Strictly RAW text, NO markdown):
    "In the room from the image, maintain the [Anchor 1] and [Anchor 2]. Transform the [Masked Zone description] to [User Request] with 8K professional lighting and luxury textures..."`
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