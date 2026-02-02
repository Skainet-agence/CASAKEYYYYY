export interface MaskLayer {
  id: number;
  color: string; // Hex color
  prompt: string;
  base64Mask: string;
}

export interface ProcessingRequest {
  originalImage: string; // Base64
  layers: MaskLayer[];
}

export enum AppStep {
  LOGIN = 'LOGIN',
  INTAKE = 'INTAKE',
  EDITING = 'EDITING',
  PROCESSING = 'PROCESSING',
  RESULT = 'RESULT',
}

export interface EstateState {
  step: AppStep;
  isAuthenticated: boolean;
  originalImage: File | null;
  originalImagePreview: string | null;
  layers: MaskLayer[];
  userRequest: string;
  correctedImage: string | null; // Base64 or URL
  error: string | null;
}
