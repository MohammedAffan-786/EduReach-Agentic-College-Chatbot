import API from "./api";

// Backend expects: { phoneNumber, preferredCourse, name }
export const initiateCall = async (data: { phone: string; course: string; topic: string; name?: string }) => {
  const res = await API.post("/vapi/call", {
    phoneNumber: data.phone,
    preferredCourse: `${data.course} - ${data.topic}`,
    name: data.name,
  });
  return res.data;
};
