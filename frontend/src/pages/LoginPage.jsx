import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", form);
      login(res.data.token, res.data.user);
      navigate("/listings");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4">

      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[var(--color-violet-light)] rounded-full blur-3xl opacity-60" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[var(--color-coral-light)] rounded-full blur-3xl opacity-60" />
      </div>

      <div className="relative w-full max-w-md">

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-[var(--color-ink)]/5 p-8 border border-gray-100">

          {/* Logo + header */}
          <div className="text-center mb-8">
            <Link to="/listings" className="inline-flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-[var(--color-violet-light)] rounded-2xl flex items-center justify-center">
                <img src="/logo.jpg" alt="NeighbouRent" className="w-8 h-8 object-contain rounded-xl" />
              </div>
              <span className="brand-font text-[var(--color-ink)] text-lg">NeighbouRent</span>
            </Link>
            <h1 className="font-display text-2xl font-extrabold text-[var(--color-ink)]">Welcome back 👋</h1>
            <p className="text-gray-400 text-sm mt-1 font-medium">Sign in to your account to continue</p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-[var(--color-coral-light)] text-[var(--color-coral)] px-4 py-3 rounded-2xl text-sm font-semibold mb-5">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Email</label>
              <input
                type="email" name="email" value={form.email}
                onChange={handleChange} placeholder="you@example.com" required
                className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-medium text-[var(--color-ink)] placeholder:text-gray-300 focus:outline-none focus:border-[var(--color-violet)] transition-colors bg-[var(--color-bg)]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Password</label>
              <input
                type="password" name="password" value={form.password}
                onChange={handleChange} placeholder="••••••••" required
                className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-medium text-[var(--color-ink)] placeholder:text-gray-300 focus:outline-none focus:border-[var(--color-violet)] transition-colors bg-[var(--color-bg)]"
              />
            </div>

            <button type="submit" disabled={loading}
              className="btn-bounce w-full bg-[var(--color-violet)] hover:bg-[var(--color-primary-dark)] disabled:opacity-50 text-white font-display font-bold py-3.5 rounded-2xl transition-colors text-sm mt-2 shadow-lg shadow-[var(--color-violet)]/20">
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 font-medium mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="text-[var(--color-violet)] font-bold hover:underline">
              Sign up free
            </Link>
          </p>
        </div>

        {/* Social proof strip */}
        <div className="flex items-center justify-center gap-6 mt-5 text-xs text-gray-400 font-semibold">
          <span>🌱 Eco-friendly rentals</span>
          <span>🔒 Secure & verified</span>
          <span>📍 Hyperlocal</span>
        </div>
      </div>
    </div>
  );
}