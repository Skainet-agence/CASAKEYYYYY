exports.handler = async (event, context) => {
  // 1. SÉCURITÉ & CONFIGURATION
  const API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (!API_KEY) {
    console.error("CRITICAL: Missing API Key.");
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: { message: "Server configuration error: Missing API Key." } })
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body);
    const { type, data } = body;
    let url = "";

    // 2. ROUTAGE DES MODÈLES (Mise à jour Série 3)
    if (type === 'audit') {
        // AUDIT : Gemini 3 Flash Preview (Texte/JSON)
        url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent`;
    } 
    else if (type === 'image') {
        // IMAGE : Gemini 3 Pro Image Preview (Visuel)
        url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent`;
    } 
    else {
        return { 
            statusCode: 400, 
            headers,
            body: JSON.stringify({ error: { message: "Invalid type. Use 'audit' or 'image'." } }) 
        };
    }

    const finalUrl = `${url}?key=${API_KEY}`;

    const googleResponse = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data),
    });

    const googleData = await googleResponse.json();

    if (!googleResponse.ok) {
        console.warn(`Google API Error [${googleResponse.status}]:`, JSON.stringify(googleData));
        return {
            statusCode: googleResponse.status,
            headers,
            body: JSON.stringify(googleData)
        };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(googleData)
    };

  } catch (error) {
    console.error("Proxy Internal Logic Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: { message: error.message || "Internal Server Error in Proxy" } })
    };
  }
};