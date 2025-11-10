
// Simple SMS API endpoint that calls Infobip directly
const sendSMS = async (req, res) => {
  try {
    const { to, message, isEmail } = req.body;
    
    if (isEmail) {
      return res.status(200).json({ 
        success: true, 
        message: "Email functionality not implemented" 
      });
    }

    const apiKey = "af0bab9018adb9438675756df3757a17-760d8fa2-8ecd-4e9d-8bc9-20233ed55616";
    const baseUrl = "pezgge.api.infobip.com";

    console.log(`Attempting to send SMS to ${to}`);

    // Clean phone number - ensure it starts with country code
    let cleanPhone = to.replace(/\D/g, '');
    if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      cleanPhone = '+' + cleanPhone;
    } else if (cleanPhone.length === 10) {
      cleanPhone = '+91' + cleanPhone;
    } else if (!cleanPhone.startsWith('+')) {
      cleanPhone = '+' + cleanPhone;
    }

    const smsPayload = {
      messages: [
        {
          destinations: [{ to: cleanPhone }],
          from: "TrustPort",
          text: message,
        },
      ],
    };

    const infobipResponse = await fetch(`https://${baseUrl}/sms/2/text/advanced`, {
      method: "POST",
      headers: {
        "Authorization": `App ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(smsPayload),
    });

    const responseText = await infobipResponse.text();
    console.log(`Infobip response status: ${infobipResponse.status}`);
    console.log(`Infobip response: ${responseText}`);

    if (!infobipResponse.ok) {
      console.error("Infobip API error:", responseText);
      return res.status(500).json({ 
        success: false, 
        error: "SMS API error",
        details: responseText
      });
    }

    const responseData = JSON.parse(responseText);
    console.log("SMS sent successfully:", responseData);

    return res.status(200).json({ 
      success: true, 
      data: responseData,
      message: "SMS sent successfully" 
    });

  } catch (error) {
    console.error("Error in send-sms function:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Internal server error",
      details: error.message
    });
  }
};

// Handle both CommonJS and ES module exports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = sendSMS;
} else {
  export default sendSMS;
}
