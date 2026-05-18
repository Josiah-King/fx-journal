import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabase";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Fetch credentials from Supabase settings table
      const { data, error: dbError } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", ["login_email", "login_password"]);

      if (dbError) throw dbError;

      const credentials = {
        email: data.find((d) => d.key === "login_email")?.value,
        password: data.find((d) => d.key === "login_password")?.value,
      };

      const success = login(email, password, credentials);

      if (!success) {
        setError("Invalid email or password. Please try again.");
      }
    } catch (err) {
      setError("Something went wrong. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0c0c0f] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-wider text-white font-mono">
            FX<span className="text-[#c8f04a]">LOG</span>
          </h1>
          <p className="text-[#555] text-sm mt-2 tracking-widest uppercase">
            Personal Trade Journal
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#14141a] border border-[#1f1f2e] rounded-xl p-8">
          <h2 className="text-white text-sm font-medium mb-6 tracking-wide uppercase">
            Sign in to your journal
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[#555] text-xs uppercase tracking-widest block mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="w-full bg-[#0c0c0f] border border-[#2a2a35] text-white text-sm rounded-lg px-4 py-3 outline-none focus:border-[#c8f04a] transition-colors placeholder-[#333] font-mono"
              />
            </div>

            <div>
              <label className="text-[#555] text-xs uppercase tracking-widest block mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-[#0c0c0f] border border-[#2a2a35] text-white text-sm rounded-lg px-4 py-3 outline-none focus:border-[#c8f04a] transition-colors placeholder-[#333] font-mono"
              />
            </div>

            {error && (
              <p className="text-[#f87171] text-xs text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#c8f04a] text-[#0c0c0f] font-semibold text-sm rounded-lg py-3 mt-2 uppercase tracking-widest hover:bg-[#b8e03a] transition-colors disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-[#333] text-xs text-center mt-6 font-mono">
          Your data is private and stored securely.
        </p>
      </div>
    </div>
  );
}
