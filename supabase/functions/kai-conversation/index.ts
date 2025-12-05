import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  console.log("Kai conversation handler started");
  
  return new Response(
    JSON.stringify({
      success: true,
      response: {
        message: "Edge function is being restored. Please check back shortly.",
        nextState: "greeting",
        extractedData: {},
        quickReplies: [],
        progress: 0,
        recommendations: null
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
