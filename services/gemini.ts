import { GoogleGenerativeAI } from "@google/generative-ai";
import { ProcessingRequest } from '../types';

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

// Fonction purement texte (Logique & Prompting)
export async function generateDesignPrompt(request: ProcessingRequest): Promise<string> {
  if (!API_KEY) throw new Error("Clé API manquante.");

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: `You are an expert Luxury Real Estate AI Architect.
    TASK: Create a highly detailed, professional image generation prompt for an AI model (like Midjourney, Gemini, or Stable Diffusion).
    GUIDELINES:
    - Style: Photorealistic 8K, Architectural Digest, High-End Interior Design, Perfect Soft Lighting.
    - If the user asks to "remove" something, describe the scene without it, filling the space elegantly.
    - If the user asks to "change" something, describe the new element in luxury detail (material, texture, color).
    - OUTPUT: Return ONLY the raw prompt text.`
  });

  let userInstructions = "";
  request.layers.forEach((layer) => {
    userInstructions += `- Zone ${layer.color} (${layer.id}): ${layer.prompt}\n`;
  });

  const prompt = `
      INPUT CONTEXT:
      The user has provided an image and marked specific zones with colors to modify.
      User Instructions per zone:
      ${userInstructions}
  `;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (e) {
    console.error("Gemini Prompt Gen Error:", e);
    return `Luxury real estate photo, 8k, photorealistic, architectural digest style. Modifications: ${userInstructions}`;
  }
}

export async function generateRefinementPrompt(currentImagePrompt: string, userInstruction: string): Promise<string> {
  if (!API_KEY) throw new Error("Clé API manquante.");

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const metaPrompt = `
      You are refining an image generation prompt based on user feedback.
      
      ORIGINAL PROMPT:
      "${currentImagePrompt}"

      USER FEEDBACK / MODIFICATION REQUEST:
      "${userInstruction}"

      TASK:
      Rewrite the ORIGINAL PROMPT to incorporate the USER FEEDBACK. 
      Keep the style and quality keywords (8k, luxury, etc.).
      Only change the specific details requested by the user.
      
      OUTPUT FORMAT:
      Return ONLY the refined prompt text.
    `;

  try {
    const result = await model.generateContent(metaPrompt);
    return result.response.text();
  } catch (e) {
    console.error("Gemini Refine Error:", e);
    return `${currentImagePrompt}, ${userInstruction}`;
  }
}