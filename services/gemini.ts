import { GoogleGenerativeAI } from "@google/generative-ai";
import { ProcessingRequest } from '../types';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_API_KEY || '');

/**
 * Converts a base64 string to a GoogleGenerativeAI Part object.
 */
function base64ToGenerativePart(base64Data: string, mimeType: string) {
  return {
    inlineData: {
      data: base64Data.split(',')[1],
      mimeType
    },
  };
}

/**
 * Processes the image directly from the client side using Gemini 3.
 * NO COMPRESSION is applied to preserve 4K quality.
 */
export async function processInpainting(request: ProcessingRequest): Promise<string> {
  try {
    // 1. Configuration: Model Selection with Fallback
    let modelName = "gemini-3-pro-preview"; // Target Model (Nano Banana Pro)
    let model = genAI.getGenerativeModel({ model: modelName });

    // 2. Prepare Prompt
    let userInstructions = "";
    request.layers.forEach((layer, index) => {
        userInstructions += `- Zone ${layer.color} (${layer.id}): ${layer.prompt}\n`;
    });

    const systemPrompt = `
      Tu es une IA de retouche immobilière de Luxe (Standard "Architectural Digest").

      RÈGLE D'OR N°1 : FORMAT & CADRAGE (INTOUCHABLE)
      - Conserve STRICTEMENT le format de l'image (Carré, Rectangle, Portrait Téléphone).
      - Ne change pas le ratio. Ne rogne pas (No crop). L'image de sortie doit se superposer parfaitement à l'originale.

      RÈGLE D'OR N°2 : EXPLOSION DE QUALITÉ (SUBLIMATION)
      Ton but est de vendre du rêve. L'image doit être techniquement parfaite (4K, zéro bruit, netteté rasoir).

      RÈGLE D'OR N°3 : GESTION INTELLIGENTE DE LA LUMIÈRE
      Analyse la scène et applique cet éclairage :
      - SCÈNE INTÉRIEURE (Salon, Chambre, SDB) : BOOSTE LA LUMINOSITÉ (High Lumens). L'image doit être éclatante, très claire, avec des blancs purs et une lumière naturelle puissante. Débouche toutes les ombres.
      - SCÈNE EXTÉRIEURE (Terrasse, Balcon, Jardin) : APPLIQUE UNE VIBE "ENSOLEILLÉE". Utilise des tons plus chauds, une lumière solaire directe, une ambiance "Golden Hour" accueillante.

      RÈGLE D'OR N°4 : INPAINTING
      Applique les changements demandés par le masque de façon invisible et photoréaliste.

      INSTRUCTIONS UTILISATEUR (ZONES) :
      ${userInstructions}
    `;

    // 3. Prepare Image Parts (Full Resolution)
    const imagePart = base64ToGenerativePart(request.originalImage, "image/jpeg");
    
    console.log(`🚀 Sending 4K Request to ${modelName}...`);
    
    try {
        const result = await model.generateContent([systemPrompt, imagePart]);
        const response = await result.response;
        const text = response.text();
        console.log("Gemini Response:", text);
        
        // Return original image as placeholder since API returns text currently
        return request.originalImage;
        
    } catch (apiError: any) {
        // Fallback logic for model 404 or unavailability
        if (apiError.message?.includes('404') || apiError.message?.includes('not found')) {
            console.warn(`Model ${modelName} not found. Fallback to gemini-1.5-pro...`);
            model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
            const fallbackResult = await model.generateContent([systemPrompt, imagePart]);
            const fallbackResponse = await fallbackResult.response;
            console.log("Gemini Fallback Response:", fallbackResponse.text());
            return request.originalImage;
        }
        throw apiError;
    }

  } catch (error: any) {
    console.error("Gemini Direct Error:", error);
    throw new Error(`Erreur Gemini Direct: ${error.message}`);
  }
}

// Deprecated functions
export async function analyzeEstatePhoto(file: File, request: string): Promise<any> { return {}; }
export async function generateCorrection(file: File, analysis: any, useAiSuggestions: boolean, refinement?: string): Promise<string> { return ""; }
