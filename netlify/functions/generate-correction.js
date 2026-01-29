exports.handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server Configuration Error" }) };
  }

  try {
    const { imageBase64, analysis, useAiSuggestions, refinementInstruction } = JSON.parse(event.body);

    if (!imageBase64 || !analysis) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing input data" }) };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${API_KEY}`;

    let prompt = "";
    let generationConfig = {};

    // =================================================================================
    // PIPELINE 1: RAFFINEMENT (Correction Chirurgicale)
    // =================================================================================
    if (refinementInstruction) {
        prompt = `
        ROLE: Expert Photo Retoucher performing a "Revision Round".
        TASK: Execute this specific correction: "${refinementInstruction}"
        
        STRICT CONSTRAINT: TEXTURE LOCK
        - You are modifying GEOMETRY (Shapes), NOT MATERIALS.
        - If asked to "straighten sheets", change the 3D shape of the mesh but KEEP the original blue/patterned texture.
        - Do NOT whiten fabrics unless explicitly asked.
        - Do NOT remove items unless explicitly asked.

        OUTPUT: High-fidelity photorealistic edit.
        `;

        generationConfig = {
            temperature: 0.1, 
            seed: 42
        };

    } 
    // =================================================================================
    // PIPELINE 2: GÉNÉRATION STANDARD (Complète)
    // =================================================================================
    else {
        const mandatoryEdits = analysis.english_request_technical.map((req, i) => `TASK ${i+1}: ${req}`).join("\n");
        const cleaningInstruction = useAiSuggestions 
          ? `DECLUTTERING TASK: Remove these specific items: ${analysis.english_suggestions_technical.join(", ")}.` 
          : "DECLUTTERING: NONE. Keep all existing furniture and small items.";

        const lightingContext = analysis.lighting_context || "Natural balanced daylight, 5500K";

        prompt = `
        SYSTEM: Advanced Real Estate Restoration AI.
        INPUT IMAGE CONTEXT: ${analysis.room_type}
        
        VISUAL ANCHORS (DO NOT CHANGE): 
        ${analysis.english_visual_anchors}

        --------------------------------------------------------
        STEP 0: CONTENT PRESERVATION (CRITICAL)
        --------------------------------------------------------
        - "STAGING" ITEMS MUST REMAIN: Folded towels on bed, bedside lamps, decorative cushions, art frames, rugs.
        - DO NOT REMOVE TOWELS unless specifically asked in "Mandatory Edits".
        - DO NOT REMOVE LAMPS unless specifically asked.
        - If the user didn't say "Remove it", YOU KEEP IT.

        --------------------------------------------------------
        STEP 1: MANDATORY EDITS (USER REQUESTS)
        --------------------------------------------------------
        ${mandatoryEdits}

        --------------------------------------------------------
        STEP 2: OPTIONAL DECLUTTERING
        --------------------------------------------------------
        ${cleaningInstruction}

        --------------------------------------------------------
        STEP 3: QUALITY & ATMOSPHERE (APPLY TO SCENE)
        --------------------------------------------------------
        
        A) BEDDING & FABRICS (SURGICAL FIX):
           - GEOMETRY: Iron out wrinkles. Tuck sheets tightly under mattress (Hospital Corners).
           - TEXTURE PRESERVATION: Keep the ORIGINAL fabric pattern and color. Do NOT replace with white sheets if they are colored.
           - PILLOWS: Plump and straighten.

        B) LIGHTING:
           - Target: ${lightingContext}
           - Turn OFF yellow artificial lights if possible, boost natural window light.
           - Shadows: Soft, diffuse, grey (no black voids).

        C) COMPOSITION:
           - Straighten vertical lines (Walls, Doors).
        
        Output the final high-resolution photorealistic image only.
        `;

        generationConfig = {
            temperature: 0.25, // Reduced for better adherence to preservation rules
        };
    }

    const payload = {
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }
        ]
      }],
      generationConfig: generationConfig
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini Image Gen Error:", JSON.stringify(data));
      const errorMessage = data.error?.message || "Generation API Error";
      return { statusCode: response.status, headers, body: JSON.stringify({ error: errorMessage }) };
    }

    const candidates = data.candidates || [];
    if (candidates.length === 0) {
         return { statusCode: 500, headers, body: JSON.stringify({ error: "No candidates returned by Gemini" }) };
    }
    
    const contentParts = candidates[0].content?.parts || [];
    let generatedImageBase64 = null;

    for (const part of contentParts) {
        if (part.inlineData && part.inlineData.data) {
            generatedImageBase64 = part.inlineData.data;
            break;
        }
    }

    if (!generatedImageBase64) {
      const textResponse = contentParts.find(p => p.text)?.text || "No content returned";
      return { 
        statusCode: 422, 
        headers, 
        body: JSON.stringify({ error: "L'IA n'a pas pu générer l'image. Elle a répondu : " + textResponse }) 
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ image: `data:image/jpeg;base64,${generatedImageBase64}` })
    };

  } catch (error) {
    console.error("Generate Function Error:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};