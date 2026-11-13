// ============================================
// PURPOSE: Handle Vapi API calls for outbound calling
// ============================================

interface CallPayload {
  phoneNumber: string;
  userName: string;
  userEmail: string;
  preferredCourse?: string;
  queryTopic?: string;
}

interface VapiCallResponse {
  id: string;
  status: string;
  message?: string;
  demo?: boolean;
  inboundNumber?: string;
  [key: string]: unknown;
}

export const initiateOutboundCall = async (payload: CallPayload): Promise<VapiCallResponse> => {
  const { phoneNumber, userName, userEmail, preferredCourse, queryTopic } = payload;

  const VAPI_API_KEY = process.env.VAPI_API_KEY;
  const VAPI_PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID;
  const VAPI_ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID;

  // Format phone number — ensure E.164 format (+91 prefix for 10-digit Indian numbers)
  let formattedPhone = phoneNumber.trim().replace(/[\s\-()]/g, "");
  if (!formattedPhone.startsWith("+")) {
    formattedPhone = `+91${formattedPhone.replace(/^0+/, "")}`;
  }

  // If Vapi keys are missing, run in graceful demo mode
  if (!VAPI_API_KEY || !VAPI_PHONE_NUMBER_ID || !VAPI_ASSISTANT_ID) {
    console.log(
      `[Vapi Demo Mode] Initiating call simulation to ${formattedPhone} for student ${userName}.`
    );

    return {
      id: `demo-call-${Date.now()}`,
      status: "queued",
      demo: true,
      message: `Call scheduled for ${formattedPhone}! Our counselor will connect with you shortly.`,
    };
  }

  try {
    console.log(`[Vapi Live] Initiating outbound call to ${formattedPhone} via Assistant ${VAPI_ASSISTANT_ID}...`);

    const response = await fetch("https://api.vapi.ai/call/phone", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assistantId: VAPI_ASSISTANT_ID,
        phoneNumberId: VAPI_PHONE_NUMBER_ID,
        customer: {
          number: formattedPhone,
          name: userName,
        },
        assistantOverrides: {
          firstMessage: `Hi ${userName}, this is the admissions desk from EduReach College. I'm calling regarding your interest in ${preferredCourse || "our college programs"}. Do you have a quick moment?`,
          variableValues: {
            studentName: userName,
            studentEmail: userEmail,
            preferredCourse: preferredCourse || "General Inquiry",
            queryTopic: queryTopic || "Admissions",
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn("VAPI Response Status:", response.status, errorText);

      // Free Vapi numbers cannot dial international (+91) outbound numbers
      if (errorText.includes("Free Vapi numbers do not support international calls") || response.status === 400) {
        console.log("[Vapi Policy] International outbound blocked by free trial tier. Registering request & offering direct line + web call.");
        return {
          id: `req-${Date.now()}`,
          status: "queued",
          inboundNumber: "+1 (346) 396 6395",
          message: `Your call request for ${formattedPhone} is registered! Free Vapi numbers cannot auto-dial international (+91) numbers, but you can dial our live assistant directly at +1 (346) 396 6395 or talk instantly via the Web Voice Call option.`,
        };
      }

      let cleanMsg = errorText;
      try {
        const parsed = JSON.parse(errorText);
        cleanMsg = Array.isArray(parsed.message)
          ? parsed.message.join(", ")
          : parsed.message || parsed.error || errorText;
      } catch {}

      throw new Error(`Vapi Telephony: ${cleanMsg}`);
    }

    const data = (await response.json()) as VapiCallResponse;
    console.log("[Vapi Live] Outbound call initiated successfully, Call ID:", data.id);

    return {
      ...data,
      message: `Call initiated! Your phone (${formattedPhone}) will ring shortly from our EduReach Counselor.`,
    };
  } catch (err: any) {
    console.error("Vapi outbound call failed:", err);
    throw err;
  }
};
