import Vapi from "@vapi-ai/web";

export const VAPI_PUBLIC_KEY = "520d2fd4-4dd0-47a5-a41d-562135809329";
export const VAPI_ASSISTANT_ID = "f13e6fdd-53e8-4637-b688-4b70b22a120c";

// Single shared Vapi instance across the app to avoid WebRTC duplicate connection conflicts
export const vapiClient = new Vapi(VAPI_PUBLIC_KEY);

export const openCallModal = () => {
  window.dispatchEvent(new CustomEvent("open-vapi-call"));
};
