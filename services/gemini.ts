import { AnalysisResult } from "../types";

// --- UTILS ---

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Handle data:image/jpeg;base64,..... prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Nettoie la sortie JSON si nécessaire
 */
const cleanJsonOutput = (text: string): string => {
  if (!text) return "{}";
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```json/i, '').replace(/^```/, '');
  cleaned = cleaned.replace(/```$/, '');
  return cleaned.trim();
};

// --- SERVICES ---

/**
 * CALL 1: AUDIT
 * Calls /.netlify/functions/analyze-photo
 */
export const analyzeEstatePhoto = async (
  file: File,
  userRequest: string
): Promise<AnalysisResult> => {
  try {
    const base64Data = await fileToBase64(file);

    const response = await fetch('/.netlify/functions/analyze-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64Data, userRequest }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `API Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (typeof data === 'object' && data.room_type) {
      return data as AnalysisResult;
    }
    
    const jsonString = typeof data === 'string' ? cleanJsonOutput(data) : JSON.stringify(data);
    return JSON.parse(jsonString) as AnalysisResult;

  } catch (err) {
    console.error("Analysis Error:", err);
    throw new Error(err instanceof Error ? err.message : "Erreur inconnue lors de l'analyse");
  }
};

/**
 * CALL 2: GENERATION (Supports Initial & Refinement)
 * Calls /.netlify/functions/generate-correction
 */
export const generateCorrection = async (
  file: File,
  analysis: AnalysisResult,
  useAiSuggestions: boolean,
  refinementInstruction?: string // New optional param
): Promise<string> => {
  try {
    const base64Data = await fileToBase64(file);
    
    const response = await fetch('/.netlify/functions/generate-correction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
          imageBase64: base64Data, 
          analysis, 
          useAiSuggestions,
          refinementInstruction // Pass to backend
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `API Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.image) {
      throw new Error("Le serveur n'a pas renvoyé d'image valide.");
    }

    return data.image;

  } catch (err: any) {
    console.error("Generation Error:", err);
    throw new Error(err.message || "Erreur critique lors de la génération.");
  }
};