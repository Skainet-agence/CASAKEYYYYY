export interface AnalysisResult {
  // Identification
  room_type: string;
  
  // Vision Globale & Sécurité
  visual_anchors: string[]; // List of protected elements (FR)
  english_visual_anchors: string; // Concat string for backend (EN)
  
  // Ambiance & Standards
  technical_prompt_additions: string; // Micro-standards (EN)
  lighting_context: string; // New: Specific lighting analysis (EN)

  // User Request Logic (Strict Bullet Points)
  understanding_expanded: string[]; // FR (List of technical actions)
  english_request_technical: string[]; // CHANGED: Now an Array of strings for distinct instructions (EN)

  // Staging Logic (Cleaning Only)
  ai_staging_suggestions: string[]; // FR (List of subtractive actions)
  english_suggestions_technical: string[]; // EN (Technical prompt)
}

export enum AppStep {
  LOGIN = 'LOGIN',
  INTAKE = 'INTAKE',
  AUDIT = 'AUDIT',
  EXECUTING = 'EXECUTING',
  RESULT = 'RESULT',
}

export interface EstateState {
  step: AppStep;
  isAuthenticated: boolean;
  originalImage: File | null;
  originalImagePreview: string | null;
  // maskImage removed
  userRequest: string;
  analysis: AnalysisResult | null;
  correctedImage: string | null; // Base64 or URL
  error: string | null;
}