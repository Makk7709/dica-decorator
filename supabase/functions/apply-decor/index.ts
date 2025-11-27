import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { photoUrl, textureUrl, photoId, decorId } = await req.json();
    console.log("Applying decor:", { photoUrl, textureUrl, photoId, decorId });

    const NANO_BANANA_API_KEY = Deno.env.get("NANO_BANANA_API_KEY");
    if (!NANO_BANANA_API_KEY) {
      throw new Error("NANO_BANANA_API_KEY not configured");
    }

    // Convert relative texture URL to absolute URL based on app origin (frontend host)
    let fullTextureUrl = textureUrl;
    if (textureUrl.startsWith("/")) {
      const origin =
        req.headers.get("origin") ||
        req.headers
          .get("referer")
          ?.split("/")
          .slice(0, 3)
          .join("/");

      if (!origin) {
        throw new Error("Cannot determine app origin from request headers");
      }

      fullTextureUrl = `${origin}${textureUrl}`;
      console.log("Converted relative texture URL to:", fullTextureUrl);
    }

    // Call Nano Banana API (generate or edit image)
    const generateResponse = await fetch(
      "https://api.nanobananaapi.ai/api/v1/nanobanana/generate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${NANO_BANANA_API_KEY}`,
        },
        body: JSON.stringify({
          prompt:
            "Apply the decor texture from the second image onto all visible surfaces of the first image as a realistic product mockup. Preserve lighting, reflections and perspective.",
          numImages: 1,
          type: "IMAGETOIAMGE",
          image_size: "16:9",
          imageUrls: [photoUrl, fullTextureUrl],
          callBackUrl: "https://example.com/nanobanana-callback",
        }),
      },
    );

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      console.error(
        "Nano Banana generate error:",
        generateResponse.status,
        errorText,
      );

      if (generateResponse.status === 401) {
        throw new Error(
          "Clé API Nano Banana invalide ou non autorisée. Veuillez vérifier la clé dans la configuration du backend.",
        );
      }

      if (generateResponse.status === 429) {
        throw new Error(
          "Limite de taux Nano Banana atteinte. Veuillez réessayer dans quelques instants.",
        );
      }

      if (generateResponse.status === 402) {
        throw new Error(
          "Crédits Nano Banana insuffisants. Veuillez ajouter des fonds à votre compte Nano Banana.",
        );
      }

      throw new Error(
        `Erreur API Nano Banana (generate): ${generateResponse.status}`,
      );
    }

    const generateData = await generateResponse.json();
    const taskId = generateData?.data?.taskId as string | undefined;

    if (!taskId) {
      console.error("Nano Banana response without taskId:", generateData);
      throw new Error("Réponse Nano Banana invalide: taskId manquant");
    }

    console.log("Nano Banana taskId:", taskId);

    // Poll task status until result image is available
    let resultUrl: string | null = null;
    const maxAttempts = 20;
    const delayMs = 1000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const statusResponse = await fetch(
        `https://api.nanobananaapi.ai/api/v1/nanobanana/record-info?taskId=${encodeURIComponent(
          taskId,
        )}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${NANO_BANANA_API_KEY}`,
          },
        },
      );

      if (!statusResponse.ok) {
        const statusText = await statusResponse.text();
        console.error(
          "Nano Banana status error:",
          statusResponse.status,
          statusText,
        );
        throw new Error(
          "Erreur lors de la récupération du statut de la tâche Nano Banana",
        );
      }

      const statusData = await statusResponse.json();
      const status = statusData?.data?.successFlag;

      if (status === 1) {
        resultUrl = statusData?.data?.response?.resultImageUrl ?? null;
        break;
      }

      if (status === 2 || status === 3) {
        const message =
          statusData?.data?.errorMessage ||
          "La génération Nano Banana a échoué";
        console.error("Nano Banana task failed:", statusData);
        throw new Error(message);
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    if (!resultUrl) {
      throw new Error(
        "La génération de l'image prend plus de temps que prévu. Veuillez réessayer dans quelques instants.",
      );
    }

    console.log("Generated result URL:", resultUrl);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user ID from photo
    const { data: photoData, error: photoError } = await supabase
      .from("project_photos")
      .select("project_id, projects!inner(user_id)")
      .eq("id", photoId)
      .single();

    if (photoError) {
      console.error("Error fetching photo:", photoError);
      throw new Error("Photo introuvable");
    }

    const userId = (photoData as any).projects.user_id;

    // Download the result image
    const imageResponse = await fetch(resultUrl);
    if (!imageResponse.ok) {
      throw new Error("Impossible de télécharger l'image résultat");
    }

    const imageBlob = await imageResponse.blob();
    const imageArrayBuffer = await imageBlob.arrayBuffer();
    const imageBuffer = new Uint8Array(imageArrayBuffer);

    // Upload to Supabase Storage
    const fileName = `${userId}/${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("render-results")
      .upload(fileName, imageBuffer, {
        contentType: "image/png",
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error("Erreur lors de l'upload du résultat");
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("render-results").getPublicUrl(fileName);

    // Save render result to database
    const { error: insertError } = await supabase.from("render_results").insert({
      project_photo_id: photoId,
      decor_id: decorId,
      result_image_url: publicUrl,
    });

    if (insertError) {
      console.error("Database insert error:", insertError);
      throw new Error("Erreur lors de la sauvegarde du résultat");
    }

    return new Response(
      JSON.stringify({ success: true, resultUrl: publicUrl }),
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
