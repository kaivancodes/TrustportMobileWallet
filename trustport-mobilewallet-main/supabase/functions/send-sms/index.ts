
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SMSRequest {
  to: string;
  message: string;
  isEmail?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("SMS function invoked with method:", req.method);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, message, isEmail = false }: SMSRequest = await req.json();
    console.log("SMS request received:", { to, message, isEmail });

    // If it's an email request, just return success for now
    if (isEmail) {
      console.log("Email request - returning success");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Email functionality not implemented" 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get Infobip credentials from environment
    const apiKey = "af0bab9018adb9438675756df3757a17-760d8fa2-8ecd-4e9d-8bc9-20233ed55616";
    const baseUrl = "pezgge.api.infobip.com";

    if (!apiKey || !baseUrl) {
      console.error("Missing Infobip credentials");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "SMS service configuration error" 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Sending SMS via Infobip to:", to);

    // Prepare SMS payload for Infobip
    const smsPayload = {
      messages: [
        {
          destinations: [{ to: to }],
          from: "TrustPort",
          text: message,
        },
      ],
    };

    console.log("SMS payload:", JSON.stringify(smsPayload));

    // Send SMS via Infobip API
    const infobipResponse = await fetch(`https://${baseUrl}/sms/2/text/advanced`, {
      method: "POST",
      headers: {
        "Authorization": `App ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(smsPayload),
    });

    console.log("Infobip response status:", infobipResponse.status);

    const responseText = await infobipResponse.text();
    console.log("Infobip response body:", responseText);

    if (!infobipResponse.ok) {
      console.error("Infobip API error:", responseText);
      
      let errorMessage = "Failed to send SMS";
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.requestError?.serviceException?.text || errorMessage;
      } catch (e) {
        console.error("Error parsing Infobip error response:", e);
      }

      return new Response(JSON.stringify({ 
        success: false, 
        error: errorMessage,
        infobipError: responseText 
      }), {
        status: infobipResponse.status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error("Error parsing Infobip success response:", e);
      responseData = { messages: [] };
    }

    console.log("SMS sent successfully:", responseData);

    return new Response(JSON.stringify({ 
      success: true, 
      data: responseData,
      message: "SMS sent successfully" 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error) {
    console.error("Error in send-sms function:", error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error occurred",
      details: "Check function logs for more information"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
