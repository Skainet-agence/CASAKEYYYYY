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
    const { imageBase64, userRequest } = JSON.parse(event.body);

    if (!imageBase64) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing image" }) };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${API_KEY}`;
    
    const schema = {
      type: "OBJECT",
      properties: {
        room_type: { type: "STRING" },
        visual_anchors: { type: "ARRAY", items: { type: "STRING" } },
        english_visual_anchors: { type: "STRING" },
        understanding_expanded: { type: "ARRAY", items: { type: "STRING" } },
        english_request_technical: { type: "ARRAY", items: { type: "STRING" } },
        ai_staging_suggestions: { type: "ARRAY", items: { type: "STRING" } },
        english_suggestions_technical: { type: "ARRAY", items: { type: "STRING" } },
        technical_prompt_additions: { type: "STRING" },
        lighting_context: { type: "STRING" }
      },
      required: [
        "room_type", "visual_anchors", "english_visual_anchors",
        "understanding_expanded", "english_request_technical",
        "ai_staging_suggestions", "english_suggestions_technical", 
        "technical_prompt_additions", "lighting_context"
      ]
    };

    const payload = {
      contents: [{
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
          { text: `Role: Elite Real Estate Photographer & Compliance Auditor.
            Task: Analyze the image and the user request: "${userRequest}".
            
            --------------------------------------------------------
            1. USER REQUEST ANALYSIS (HIGHEST PRIORITY)
            --------------------------------------------------------
            - Extract EVERY specific instruction from the user (can be 6+ points).
            - TRANSLATE vague requests into TECHNICAL actions:
              * "Clean up" -> "Remove clutter on floor/tables".
              * "Fix bed" -> "Iron sheets, tuck under mattress, plump pillows".
              * "Modernize" -> "Brighten lighting, remove dated decor".
            - IF user asks to fix specific items (e.g. "Iron the sheets"), you MUST list it in 'english_request_technical'.

            --------------------------------------------------------
            2. AUTOMATIC QUALITY CONTROL (HOTEL STANDARD)
            --------------------------------------------------------
            - Add these fixes AUTOMATICALLY to 'english_request_technical' ONLY IF the user has NOT mentioned them:
              * Straighten vertical lines (Keystone).
              * Balance lighting (if room is dark).
            - BEDDING RULE: If the bed is messy and user didn't mention it, ADD "Smooth out bedding wrinkles and straighten pillows" to the request.

            --------------------------------------------------------
            3. PROTECTION PROTOCOL (CRITICAL)
            --------------------------------------------------------
            - DISTINGUISH "CLUTTER" vs "STAGING".
            - STAGING ITEMS (Do NOT remove unless asked): Folded towels on bed, fruit bowls, decorative vases, bedside lamps, art.
            - CLUTTER (Remove): Trash, loose cables, personal bags, shoes, water bottles.
            - IF the user did NOT ask to remove the towels, DO NOT SUGGEST REMOVING THEM.

            --------------------------------------------------------
            4. AI SUGGESTIONS (SUBTRACTIVE ONLY)
            --------------------------------------------------------
            - Propose removing minor distractions that the user MISSED.
            - REDUNDANCY CHECK: DO NOT suggest something that is already in the User Request.
            - Example: If user said "Remove cables", do NOT put "Remove cables" in suggestions.

            OUTPUT INSTRUCTIONS (JSON):
            1. 'room_type': Identify room (French).
            2. 'visual_anchors': 3-5 structural elements to LOCK (Walls, Windows, Floors). NO movable items.
            3. 'english_visual_anchors': Same in English.
            4. 'understanding_expanded': List of actions in French (User requests + Auto-fixes).
            5. 'english_request_technical': Array of technical prompts for the generation engine.
            6. 'ai_staging_suggestions': List of cleanup suggestions (French).
            7. 'english_suggestions_technical': Technical cleanup prompts (English).
            8. 'lighting_context': "Natural Daylight 5500K, Soft Shadows" (Target state).
            9. 'technical_prompt_additions': "Nikon Z9, 16mm wide angle, f/8, architectural photography, hyper-realistic, 8k".
            ` 
          }
        ]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1 // Lower temperature for stricter logic adherence
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini Audit Error:", JSON.stringify(data));
      const errorMessage = data.error?.message || "Erreur API inconnue";
      return { statusCode: response.status, headers, body: JSON.stringify({ error: errorMessage }) };
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    return {
      statusCode: 200,
      headers,
      body: text
    };

  } catch (error) {
    console.error("Audit Function Error:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};