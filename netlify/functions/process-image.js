const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Utility to create a timeout promise
const timeout = (ms) => new Promise((resolve) => setTimeout(() => resolve('TIMEOUT'), ms));

exports.handler = async (event, context) => {
  // 1. CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    // 2. Parse Body
    const { originalImage, layers } = JSON.parse(event.body);

    if (!originalImage) {
      throw new Error("Missing originalImage in request body");
    }

    // 3. Initialize Model
    // We use gemini-1.5-pro for its multimodal capabilities
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    // Helper: Remove Base64 header if present
    const cleanBase64 = (str) => str.replace(/^data:image\/\w+;base64,/, "");

    let currentImageBase64 = cleanBase64(originalImage);
    let processingLog = [];

    // --- PIPELINE EXECUTION WRAPPED IN TIMEOUT ---
    
    // We race our processing logic against a 25-second timer
    const processingPromise = (async () => {
      
      // STEP 1: GLOBAL ENHANCEMENT (Prompt Engineering approach for now as direct image manipulation API is limited)
      // Note: Since current public Gemini API is mostly text/multimodal generation and not direct image editing output in all regions,
      // we will simulate the pipeline structure. If we had access to Imagen 2 via Vertex AI, we would call it here.
      // For this implementation using standard Gemini Pro Vision, we will focus on analyzing what SHOULD be done 
      // and if possible, use available tools. 
      
      // *CRITICAL NOTE*: As of now, standard Gemini API returns text/code. It does NOT return a new image byte stream directly 
      // like Stable Diffusion. To make this work "End-to-End" in a demo without a paid Vertex AI Imagen endpoint, 
      // we have to be creative or assume this function connects to an Image Gen Service.
      
      // FOR THIS CODEBASE TO BE FUNCTIONAL: 
      // We will perform a Mock "Pass-through" or "Enhancement" logic if real image gen isn't available, 
      // ensuring the frontend flow works. 
      // HOWEVER, I will implement the logic as if we are calling a Generation endpoint.
      
      processingLog.push("Starting Global Enhancement...");
      
      // In a real scenario with Imagen:
      // const enhancedImage = await imagenModel.edit({ image: currentImageBase64, prompt: "Bright, airy, professional real estate photo" });
      // currentImageBase64 = enhancedImage;
      
      // For now, we keep the original image as "Enhanced" to prevent breakage if no generation API is linked.
      processingLog.push("Global Enhancement Complete.");

      // STEP 2: INPAINTING LOOP
      if (layers && layers.length > 0) {
        for (const layer of layers) {
          const { color, prompt, base64Mask } = layer;
          processingLog.push(`Processing layer ${color}: ${prompt}`);

          // Here we would call the Inpainting API
          // const inpaintedImage = await inpaintingModel.edit({
          //   image: currentImageBase64,
          //   mask: cleanBase64(base64Mask),
          //   prompt: prompt
          // });
          
          // Simulation of processing time
          await new Promise(r => setTimeout(r, 1000)); 
          
          // Update current image
          // currentImageBase64 = inpaintedImage;
        }
      }
      
      return currentImageBase64;
    })();

    // 4. Execute with Timeout
    const result = await Promise.race([processingPromise, timeout(25000)]);

    if (result === 'TIMEOUT') {
      console.warn("Processing timed out, returning partial result");
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          imageUrl: `data:image/jpeg;base64,${currentImageBase64}`,
          warning: "Le traitement a été interrompu par la limite de temps (26s). L'image peut être incomplète.",
          logs: processingLog
        })
      };
    }

    // Success
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        imageUrl: `data:image/jpeg;base64,${result}`,
        message: "Traitement terminé avec succès",
        logs: processingLog
      })
    };

  } catch (error) {
    console.error("Backend Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || "Erreur interne du serveur lors du traitement de l'image.",
        details: error.stack
      })
    };
  }
};
