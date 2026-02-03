import { GoogleGenerativeAI } from "@google/generative-ai";
import { ProcessingRequest, MaskLayer } from '../types';

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

// ═══════════════════════════════════════════════════════════════
//                    BOUNDING BOX EXTRACTION
// ═══════════════════════════════════════════════════════════════

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  area: number;
}

// Extract bounding box from a mask layer
async function extractBoundingBox(maskBase64: string): Promise<BoundingBox | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      let minX = canvas.width, minY = canvas.height;
      let maxX = 0, maxY = 0;
      let hasPixels = false;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];

          // Check if pixel is non-black and visible
          if (a > 50 && (r > 30 || g > 30 || b > 30)) {
            hasPixels = true;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      if (!hasPixels) {
        resolve(null);
        return;
      }

      const width = maxX - minX;
      const height = maxY - minY;

      resolve({
        x: minX,
        y: minY,
        width,
        height,
        area: width * height
      });
    };
    img.onerror = () => resolve(null);
    img.src = maskBase64;
  });
}

// ═══════════════════════════════════════════════════════════════
//                    COORDINATE-BASED PROMPT GENERATION
// ═══════════════════════════════════════════════════════════════

interface ZoneWithCoordinates {
  layer: MaskLayer;
  bbox: BoundingBox;
  priority: 'SMALL' | 'MEDIUM' | 'LARGE';
}

function getZonePriority(area: number): 'SMALL' | 'MEDIUM' | 'LARGE' {
  if (area < 5000) return 'SMALL';
  if (area < 50000) return 'MEDIUM';
  return 'LARGE';
}

export async function generateDesignPrompt(request: ProcessingRequest, _maskBase64?: string): Promise<string> {
  if (!API_KEY) throw new Error("Clé API manquante.");

  // Extract bounding boxes for all zones
  const zonesWithCoords: ZoneWithCoordinates[] = [];

  for (const layer of request.layers) {
    const bbox = await extractBoundingBox(layer.base64Mask);
    if (bbox) {
      zonesWithCoords.push({
        layer,
        bbox,
        priority: getZonePriority(bbox.area)
      });
    }
  }

  // Sort by area (smallest first = highest priority)
  zonesWithCoords.sort((a, b) => a.bbox.area - b.bbox.area);

  // Build coordinate-based instructions
  const instructions = zonesWithCoords.map((zone, index) => {
    const { layer, bbox, priority } = zone;
    return `[${priority} ZONE ${index + 1}] Position: (X:${bbox.x}, Y:${bbox.y}), Size: ${bbox.width}x${bbox.height}px
  Color Tag: ${layer.color.toUpperCase()}
  Target Location: Center at approximately (${Math.round(bbox.x + bbox.width / 2)}, ${Math.round(bbox.y + bbox.height / 2)})
  INSTRUCTION: ${layer.prompt}`;
  }).join('\n\n');

  // Use Gemini to enhance the prompt with context
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: `You are an expert photo editing instruction writer.

Your job is to take zone-based edit requests and convert them into precise, executable instructions.

RULES:
1. Output ONLY the enhanced editing instructions
2. Keep the coordinate information exactly as provided
3. Add visual context (e.g., "the small black cap on the chair leg")
4. NEVER suggest adding objects not mentioned
5. Small zones need MORE specific descriptions than large zones`
  });

  const parts: any[] = [
    { text: `Enhance these editing instructions for an AI image editor:\n\n${instructions}` },
    {
      inlineData: {
        data: request.originalImage.replace(/^data:image\/\w+;base64,/, ""),
        mimeType: "image/jpeg"
      }
    }
  ];

  try {
    const result = await model.generateContent(parts);
    const enhanced = result.response.text();
    console.log("📋 Enhanced Coordinate Instructions:", enhanced);
    return enhanced;
  } catch (e) {
    console.error("Gemini Error:", e);
    return instructions; // Fallback to raw instructions
  }
}

export async function generateRefinementPrompt(currentPrompt: string, userInstruction: string): Promise<string> {
  if (!API_KEY) throw new Error("Clé API manquante.");

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: `You are refining photo editing instructions based on user feedback.
Keep all coordinate information. Only modify what the user specifically requests.`
  });

  try {
    const result = await model.generateContent(`
CURRENT INSTRUCTIONS:
${currentPrompt}

USER FEEDBACK:
${userInstruction}

OUTPUT: Updated instructions incorporating the feedback.`);
    return result.response.text();
  } catch (e) {
    console.error("Gemini Refine Error:", e);
    return `${currentPrompt}\n\nADDITIONAL: ${userInstruction}`;
  }
}