import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { photoUrl, textureUrl, photoId, decorId, useCase } = await req.json();
    console.log("Applying decor:", {
      photoUrl,
      textureUrl,
      photoId,
      decorId,
      useCase,
    });

    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY not configured");
    }

    // Fetch decor information to get name and reference code
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: decor, error: decorError } = await supabase
      .from("decors")
      .select("name, reference_code")
      .eq("id", decorId)
      .single();

    if (decorError || !decor) {
      console.error("Error fetching decor:", decorError);
      throw new Error("Décor introuvable");
    }

    // Build simplified prompt based on useCase
    let prompt = "";
    switch (useCase) {
      case "ascenseur":
        prompt = `Generate a realistic product mockup of an elevator cabin interior, fully renovated with DICA decor "${decor.name}" (ref ${decor.reference_code}). Keep proportions and perspective similar to a professional interior photo.`;
        break;
      case "van":
        prompt = `Generate a realistic product mockup of a van interior, fully renovated with DICA decor "${decor.name}" (ref ${decor.reference_code}). Keep proportions and perspective similar to a professional interior photo.`;
        break;
      case "terrasse":
        prompt = `Generate a realistic product mockup of a terrace or outdoor deck, fully renovated with DICA decor "${decor.name}" (ref ${decor.reference_code}). Keep proportions and perspective similar to a professional outdoor photo.`;
        break;
      default:
        prompt = `Generate a realistic product mockup of a ${useCase} interior, fully renovated with DICA decor "${decor.name}" (ref ${decor.reference_code}). Keep proportions and perspective similar to a professional interior photo.`;
    }

    console.log("Calling Google AI Studio (Gemini 2.5 Flash Image)...");
    
    // Call Google AI Studio API with simplified text-only prompt
    const url = 
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=' +
      GOOGLE_AI_API_KEY;
    
    const geminiResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          imageConfig: {
            aspectRatio: "16:9",
          },
        },
      }),
    });

    // Handle errors with detailed logging
    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Google AI error:", geminiResponse.status, errorText);
      
      throw new Error(`Google AI error ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    console.log("Gemini response received successfully");

    // Extract generated image from response
    const base64 = geminiData?.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data;

    if (!base64) {
      console.error("No image data in Gemini response:", geminiData);
      throw new Error("Aucune image générée dans la réponse Gemini");
    }

    // Return data URL directly
    const resultUrl = `data:image/png;base64,${base64}`;
    
    console.log("Image generated successfully, returning data URL");

    return new Response(
      JSON.stringify({ success: true, resultUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in apply-decor function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erreur inconnue",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
