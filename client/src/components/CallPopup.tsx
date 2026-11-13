import { useState, useEffect, useRef } from "react";
import { X, Phone, CheckCircle, AlertCircle, Loader2, Mic, MicOff, PhoneOff, Volume2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { initiateCall } from "../services/vapi.service";
import { vapiClient, VAPI_ASSISTANT_ID } from "../services/vapiWeb";
import { vapiFormContent } from "../data/content";

interface CallPopupProps {
  open: boolean;
  onClose: () => void;
}

type CallMode = "web" | "phone";
type WebCallState = "idle" | "connecting" | "active" | "error";

export default function CallPopup({ open, onClose }: CallPopupProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<CallMode>("web");

  // Web Call State
  const [webState, setWebState] = useState<WebCallState>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [webError, setWebError] = useState("");

  // Phone Form State
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState("");
  const [course, setCourse] = useState("");
  const [topic, setTopic] = useState("");
  const [phoneStatus, setPhoneStatus] = useState<"form" | "calling" | "done" | "error">("form");
  const [phoneFeedback, setPhoneFeedback] = useState("");

  const timerRef = useRef<any>(null);

  // Sync user info
  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user]);

  // Vapi Event Listeners
  useEffect(() => {
    const onCallStart = () => {
      setWebState("active");
      setCallDuration(0);
      setIsMuted(false);
      setWebError("");
      toast.success("Connected to EduReach AI Receptionist!");

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    };

    const onCallEnd = () => {
      setWebState("idle");
      setIsSpeaking(false);
      setVolumeLevel(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    const onSpeechStart = () => {
      setIsSpeaking(true);
    };

    const onSpeechEnd = () => {
      setIsSpeaking(false);
    };

    const onVolumeLevel = (level: number) => {
      setVolumeLevel(level);
    };

    const onError = (error: any) => {
      console.error("Vapi Client Error:", error);
      const msg = error?.message || (typeof error === "string" ? error : "Voice connection error");
      setWebError(msg);
      setWebState("error");
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    vapiClient.on("call-start", onCallStart);
    vapiClient.on("call-end", onCallEnd);
    vapiClient.on("speech-start", onSpeechStart);
    vapiClient.on("speech-end", onSpeechEnd);
    vapiClient.on("volume-level", onVolumeLevel);
    vapiClient.on("error", onError);

    return () => {
      (vapiClient as any).off("call-start", onCallStart);
      (vapiClient as any).off("call-end", onCallEnd);
      (vapiClient as any).off("speech-start", onSpeechStart);
      (vapiClient as any).off("speech-end", onSpeechEnd);
      (vapiClient as any).off("volume-level", onVolumeLevel);
      (vapiClient as any).off("error", onError);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleStartWebCall = async () => {
    try {
      setWebError("");
      setWebState("connecting");
      // Request mic permission and start call directly
      await vapiClient.start(VAPI_ASSISTANT_ID);
    } catch (err: any) {
      console.error("Failed to start Vapi call:", err);
      const msg = err?.message || "Failed to start voice call. Please ensure microphone access is allowed.";
      setWebError(msg);
      setWebState("error");
      toast.error(msg);
    }
  };

  const handleEndWebCall = () => {
    try {
      vapiClient.stop();
    } catch (e) {
      console.warn("Vapi stop error:", e);
    }
    setWebState("idle");
    setIsSpeaking(false);
    setVolumeLevel(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleToggleMute = () => {
    try {
      const nextMute = !isMuted;
      vapiClient.setMuted(nextMute);
      setIsMuted(nextMute);
      toast(nextMute ? "Microphone Muted" : "Microphone Unmuted", { icon: nextMute ? "🔇" : "🎤" });
    } catch (e) {
      console.warn("Mute error:", e);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePhoneSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!phone || !course || !topic) {
      toast.error("Please fill in all required fields");
      return;
    }
    setPhoneStatus("calling");
    try {
      const res = await initiateCall({
        phone,
        course,
        topic,
        name: name.trim() || user?.name || "Student",
      });
      setPhoneStatus("done");
      setPhoneFeedback(res.message || "Call request recorded successfully!");
      toast.success("Callback request submitted!");
    } catch (err: any) {
      setPhoneStatus("error");
      const errMsg = err.response?.data?.message || err.message || "Failed to submit request.";
      setPhoneFeedback(errMsg);
      toast.error(errMsg);
    }
  };

  const handleClose = () => {
    if (webState === "active" || webState === "connecting") {
      handleEndWebCall();
    }
    setPhoneStatus("form");
    setPhoneFeedback("");
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden relative flex flex-col border border-gray-100 animate-in fade-in zoom-in duration-200">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-1.5 transition-colors z-20 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-maroon-dark via-maroon to-maroon-dark px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <Phone className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-heading text-xl font-bold">EduReach AI Counselor</h3>
              <p className="text-white/80 text-xs mt-0.5">Live Voice Receptionist &bull; Instant College Guidance</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        {webState !== "active" && (
          <div className="flex border-b border-gray-100 bg-gray-50/70">
            <button
              onClick={() => setMode("web")}
              className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mode === "web"
                  ? "text-maroon border-b-2 border-maroon bg-white shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <Mic className="w-4 h-4 text-maroon" /> Live Web Voice Call
            </button>
            <button
              onClick={() => setMode("phone")}
              className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mode === "phone"
                  ? "text-maroon border-b-2 border-maroon bg-white shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <Phone className="w-4 h-4 text-maroon" /> Request Callback
            </button>
          </div>
        )}

        <div className="p-6">
          {/* ============================================================== */}
          {/* MODE 1: LIVE WEB VOICE CALL                                    */}
          {/* ============================================================== */}
          {mode === "web" && (
            <div className="py-2">
              {/* IDLE STATE */}
              {webState === "idle" && (
                <div className="text-center space-y-6">
                  <div className="relative mx-auto w-24 h-24">
                    <div className="absolute inset-0 rounded-full bg-maroon/10 animate-ping [animation-duration:3s]" />
                    <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-maroon to-maroon-dark text-white flex items-center justify-center shadow-xl">
                      <Mic className="w-12 h-12 text-amber-300" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-heading text-2xl font-bold text-gray-900">
                      Talk Live in Your Browser
                    </h4>
                    <p className="text-gray-600 text-sm max-w-sm mx-auto mt-2 leading-relaxed">
                      Speak directly to the <strong>EduReach College Receptionist</strong> via your microphone. Free, instant, and unlimited.
                    </p>
                  </div>

                  <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-3 text-xs text-amber-900 flex items-center justify-center gap-2">
                    <Volume2 className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Please ensure your microphone is unmuted and allowed.</span>
                  </div>

                  <button
                    onClick={handleStartWebCall}
                    className="w-full bg-maroon hover:bg-maroon-dark text-white py-4 rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 cursor-pointer"
                  >
                    <Mic className="w-5 h-5 text-amber-300" /> Start Live Voice Call
                  </button>
                </div>
              )}

              {/* CONNECTING STATE */}
              {webState === "connecting" && (
                <div className="text-center py-10 space-y-5">
                  <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                    <Loader2 className="w-16 h-16 text-maroon animate-spin" />
                  </div>
                  <div>
                    <h4 className="font-heading text-xl font-bold text-gray-900">Connecting...</h4>
                    <p className="text-gray-500 text-sm mt-1">Starting live voice channel with EduReach Receptionist...</p>
                  </div>
                  <button
                    onClick={handleEndWebCall}
                    className="text-gray-500 hover:text-gray-800 text-sm font-medium underline cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* ACTIVE IN-CALL STATE */}
              {webState === "active" && (
                <div className="text-center py-4 space-y-6">
                  {/* Status Indicator */}
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    CALL CONNECTED &bull; {formatDuration(callDuration)}
                  </div>

                  {/* Pulsing Voice Avatar */}
                  <div className="relative mx-auto w-28 h-28 flex items-center justify-center">
                    <div
                      className={`absolute inset-0 rounded-full bg-maroon/20 transition-transform duration-150 ${
                        isSpeaking || volumeLevel > 0.05 ? "scale-125 opacity-100" : "scale-100 opacity-30"
                      }`}
                    />
                    <div
                      className={`absolute inset-2 rounded-full bg-amber-400/20 transition-transform duration-150 ${
                        isSpeaking || volumeLevel > 0.05 ? "scale-110 opacity-100" : "scale-100 opacity-20"
                      }`}
                    />
                    <div className="relative w-24 h-24 rounded-full bg-maroon text-white flex items-center justify-center shadow-2xl">
                      {isSpeaking ? (
                        <Volume2 className="w-12 h-12 text-amber-300 animate-bounce" />
                      ) : (
                        <Mic className="w-12 h-12 text-amber-300" />
                      )}
                    </div>
                  </div>

                  {/* Real-time speaking status */}
                  <div>
                    <h4 className="font-heading text-xl font-bold text-gray-900">
                      {isSpeaking ? "Receptionist is Speaking..." : "Listening to You..."}
                    </h4>
                    <p className="text-gray-500 text-xs mt-1">
                      Ask about admissions, fee structure, hostel, courses, or placements.
                    </p>
                  </div>

                  {/* Audio wave animation */}
                  <div className="flex items-center justify-center gap-1.5 h-8">
                    {[16, 28, 20, 32, 24, 18, 30, 22, 16].map((h, i) => (
                      <span
                        key={i}
                        className="w-1 bg-maroon rounded-full transition-all duration-150"
                        style={{
                          height: isSpeaking || volumeLevel > 0.05 ? `${Math.max(8, h * (volumeLevel * 3 + 0.5))}px` : "6px",
                          opacity: isSpeaking || volumeLevel > 0.05 ? 1 : 0.3,
                        }}
                      />
                    ))}
                  </div>

                  {/* Call Controls */}
                  <div className="flex items-center justify-center gap-4 pt-2">
                    <button
                      onClick={handleToggleMute}
                      className={`p-4 rounded-full transition-all shadow-md cursor-pointer ${
                        isMuted
                          ? "bg-amber-500 hover:bg-amber-600 text-white"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      }`}
                      title={isMuted ? "Unmute Mic" : "Mute Mic"}
                    >
                      {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    </button>

                    <button
                      onClick={handleEndWebCall}
                      className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center gap-2 px-6"
                    >
                      <PhoneOff className="w-6 h-6" />
                      <span className="font-semibold text-sm">End Call</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ERROR STATE */}
              {webState === "error" && (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-heading text-lg font-bold text-gray-900">Voice Call Disconnected</h4>
                    <p className="text-red-600 text-sm mt-1 max-w-sm mx-auto">{webError || "Could not connect to microphone or voice service."}</p>
                  </div>
                  <button
                    onClick={handleStartWebCall}
                    className="w-full bg-maroon hover:bg-maroon-dark text-white py-3 rounded-xl font-bold text-sm shadow cursor-pointer"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* MODE 2: PHONE CALLBACK                                         */}
          {/* ============================================================== */}
          {mode === "phone" && (
            <div>
              {phoneStatus === "form" && (
                <form onSubmit={handlePhoneSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-gray-800 text-sm focus:outline-none focus:border-maroon focus:ring-1 focus:ring-maroon"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91-9876543210"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-maroon focus:ring-1 focus:ring-maroon text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Interested Course *</label>
                    <select
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-maroon focus:ring-1 focus:ring-maroon text-sm"
                    >
                      <option value="">Select a course</option>
                      {vapiFormContent.courses.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">What do you want to know? *</label>
                    <select
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-maroon focus:ring-1 focus:ring-maroon text-sm"
                    >
                      <option value="">Select a topic</option>
                      {vapiFormContent.topics.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-maroon text-white py-3 rounded-lg font-semibold hover:bg-maroon-dark transition-colors duration-200 shadow-md cursor-pointer"
                  >
                    Submit Callback Request
                  </button>
                </form>
              )}

              {phoneStatus === "calling" && (
                <div className="text-center py-10 space-y-3">
                  <Loader2 className="w-10 h-10 text-maroon mx-auto animate-spin" />
                  <h4 className="font-heading text-lg font-bold text-gray-900">Submitting Request...</h4>
                  <p className="text-gray-500 text-sm">Please wait while we log your inquiry.</p>
                </div>
              )}

              {phoneStatus === "done" && (
                <div className="text-center py-6 space-y-4">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                  <h4 className="font-heading text-lg font-bold text-gray-900">Callback Request Logged!</h4>
                  <p className="text-gray-600 text-sm leading-relaxed max-w-sm mx-auto">{phoneFeedback}</p>

                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-center">
                    <p className="text-xs text-gray-500 mb-1">Direct Inbound Counselor Number:</p>
                    <p className="text-base font-bold text-maroon">+1 (346) 396 6395</p>
                  </div>

                  <button
                    onClick={() => {
                      setMode("web");
                      setPhoneStatus("form");
                    }}
                    className="w-full bg-maroon text-white py-3 rounded-lg text-sm font-semibold hover:bg-maroon-dark transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Mic className="w-4 h-4" /> Start Live Web Voice Call Instead
                  </button>
                </div>
              )}

              {phoneStatus === "error" && (
                <div className="text-center py-6 space-y-4">
                  <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
                  <h4 className="font-heading text-lg font-bold text-gray-900">Callback Request Notice</h4>
                  <p className="text-gray-600 text-sm max-w-sm mx-auto">{phoneFeedback}</p>
                  <button
                    onClick={() => {
                      setMode("web");
                      setPhoneStatus("form");
                    }}
                    className="w-full bg-maroon text-white py-3 rounded-lg text-sm font-semibold hover:bg-maroon-dark transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Mic className="w-4 h-4 text-amber-300" /> Use Free Live Web Voice Call
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
