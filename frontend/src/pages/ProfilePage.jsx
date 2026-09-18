import { useState, useEffect, useRef } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const ID_STATUS_UI = {
  none:     { label: "Not submitted", color: "bg-gray-100 text-gray-500 border-gray-200" },
  pending:  { label: "Under review",  color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  verified: { label: "Verified ✓",    color: "bg-green-50 text-green-700 border-green-200" },
  rejected: { label: "Rejected",      color: "bg-red-50 text-red-600 border-red-200" },
};

export default function ProfilePage() {
  const { user: authUser } = useAuth();

  // Profile state
  const [profile, setProfile]         = useState(null);
  const [name, setName]               = useState("");
  const [saving, setSaving]           = useState(false);
  const [saveMsg, setSaveMsg]         = useState("");

  // Email OTP state
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpSent, setOtpSent]         = useState(false);
  const [otp, setOtp]                 = useState("");
  const [sendingOtp, setSendingOtp]   = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpMsg, setOtpMsg]           = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // ID verification state
  const [idStatus, setIdStatus]       = useState("none");
  const [idType, setIdType]           = useState("aadhaar");
  const [idPreview, setIdPreview]     = useState(null);
  const [idFile, setIdFile]           = useState(null);
  const [uploading, setUploading]     = useState(false);
  const [uploadMsg, setUploadMsg]     = useState("");
  const fileRef = useRef();

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRes, verifyRes] = await Promise.all([
          api.get("/auth/me"),
          api.get("/users/me/verification"),
        ]);
        const p = profileRes.data;
        setProfile(p);
        setName(p.name || "");
        setEmailVerified(p.emailVerified || false);
        setIdStatus(verifyRes.data.idStatus || "none");
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  // Resend countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  // ── Save profile ──────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      await api.patch("/auth/me", { name });
      setSaveMsg("Profile updated successfully.");
    } catch (err) {
      setSaveMsg(err.response?.data?.error || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  // ── Send OTP ──────────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    setSendingOtp(true);
    setOtpMsg("");
    try {
      await api.post("/auth/send-otp");
      setOtpSent(true);
      setResendTimer(30);
      setOtpMsg("OTP sent! Check your email inbox.");
    } catch (err) {
      setOtpMsg(err.response?.data?.error || "Failed to send OTP.");
    } finally {
      setSendingOtp(false);
    }
  };

  // ── Verify OTP ────────────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) return setOtpMsg("Please enter the 6-digit OTP.");
    setVerifyingOtp(true);
    setOtpMsg("");
    try {
      await api.post("/auth/verify-otp", { otp });
      setEmailVerified(true);
      setOtpSent(false);
      setOtp("");
      setOtpMsg("✓ Email verified successfully!");
    } catch (err) {
      setOtpMsg(err.response?.data?.error || "Invalid OTP. Please try again.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  // ── ID upload ─────────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIdFile(file);
    setIdPreview(URL.createObjectURL(file));
  };

  const handleIdUpload = async () => {
    if (!idFile) return setUploadMsg("Please select a file first.");
    setUploading(true);
    setUploadMsg("");
    try {
      const formData = new FormData();
      formData.append("image", idFile);
      formData.append("idType", idType);
      await api.post("/users/me/verification", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setIdStatus("pending");
      setUploadMsg("Submitted! We'll review your ID soon.");
      setIdFile(null);
      setIdPreview(null);
    } catch (err) {
      setUploadMsg(err.response?.data?.error || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  const statusUI = ID_STATUS_UI[idStatus] || ID_STATUS_UI.none;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account and verification</p>
      </div>

      {/* ── Account Details ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-800 text-base">Account Details</h2>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Full Name</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Email</label>
          <input value={profile.email} disabled
            className="w-full border border-gray-100 rounded-xl px-3 py-2 text-sm text-gray-400 bg-gray-50 cursor-not-allowed" />
        </div>
        {saveMsg && (
          <p className={`text-xs ${saveMsg.includes("success") ? "text-green-600" : "text-red-500"}`}>{saveMsg}</p>
        )}
        <button onClick={handleSaveProfile} disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2 rounded-xl disabled:opacity-50">
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* ── Email Verification ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800 text-base">Email Verification</h2>
            <p className="text-xs text-gray-500 mt-0.5">Required to book items above ₹500/day</p>
          </div>
          <span className={`text-xs font-medium px-3 py-1 rounded-full border ${
            emailVerified
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-gray-100 text-gray-500 border-gray-200"
          }`}>
            {emailVerified ? "Verified ✓" : "Not verified"}
          </span>
        </div>

        {emailVerified ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
            ✓ Your email <strong>{profile.email}</strong> is verified. You can book any item on NeighbouRent.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
              <p className="text-xs text-indigo-700">
                We'll send a 6-digit code to <strong>{profile.email}</strong>
              </p>
            </div>

            {!otpSent ? (
              <button onClick={handleSendOtp} disabled={sendingOtp}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2 rounded-xl disabled:opacity-50">
                {sendingOtp ? "Sending..." : "Send Verification Code"}
              </button>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Enter 6-digit code</label>
                  <input
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="------"
                    maxLength={6}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div className="flex gap-2 items-center">
                  <button onClick={handleVerifyOtp} disabled={verifyingOtp || otp.length !== 6}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2 rounded-xl disabled:opacity-50">
                    {verifyingOtp ? "Verifying..." : "Verify Code"}
                  </button>
                  <button onClick={handleSendOtp} disabled={resendTimer > 0 || sendingOtp}
                    className="text-sm text-indigo-600 hover:underline disabled:text-gray-400 disabled:no-underline px-2 py-2">
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend code"}
                  </button>
                </div>
              </div>
            )}

            {otpMsg && (
              <p className={`text-xs ${otpMsg.includes("✓") || otpMsg.includes("sent") ? "text-green-600" : "text-red-500"}`}>
                {otpMsg}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── ID Document ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800 text-base">ID Document</h2>
            <p className="text-xs text-gray-500 mt-0.5">Optional — builds trust with item owners</p>
          </div>
          <span className={`text-xs font-medium px-3 py-1 rounded-full border ${statusUI.color}`}>
            {statusUI.label}
          </span>
        </div>

        {idStatus === "verified" && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
            ✓ Your identity document has been verified.
          </div>
        )}
        {idStatus === "pending" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700">
            Your document is under review. This usually takes less than 24 hours.
          </div>
        )}
        {idStatus === "rejected" && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
            Your document was rejected. Please upload a clearer image.
          </div>
        )}

        {["none", "rejected"].includes(idStatus) && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Document Type</label>
              <div className="flex gap-2">
                {["aadhaar", "pan"].map(type => (
                  <button key={type} onClick={() => setIdType(type)}
                    className={`text-sm px-4 py-1.5 rounded-lg border font-medium capitalize transition-colors ${
                      idType === type
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                    }`}>
                    {type === "aadhaar" ? "Aadhaar Card" : "PAN Card"}
                  </button>
                ))}
              </div>
            </div>

            <div onClick={() => fileRef.current.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-300 transition-colors">
              {idPreview ? (
                <img src={idPreview} alt="ID preview" className="max-h-40 mx-auto rounded-lg object-contain" />
              ) : (
                <div>
                  <div className="text-3xl mb-2">📄</div>
                  <p className="text-sm text-gray-500">Click to upload your {idType === "aadhaar" ? "Aadhaar" : "PAN"} card</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG up to 10MB</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

            <p className="text-xs text-gray-400">🔒 Stored securely. Never shared with other users.</p>

            {uploadMsg && (
              <p className={`text-xs ${uploadMsg.includes("Submitted") ? "text-green-600" : "text-red-500"}`}>
                {uploadMsg}
              </p>
            )}

            <button onClick={handleIdUpload} disabled={uploading || !idFile}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2 rounded-xl disabled:opacity-50">
              {uploading ? "Uploading..." : "Submit Document"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}