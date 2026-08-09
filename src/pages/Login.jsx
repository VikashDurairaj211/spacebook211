import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Home } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Field, Input } from "../components/common/Input";
import Button from "../components/common/Button";
import Logo from "../../Logo.png";

const BACKGROUND_IMAGE_URL =
  "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80";

export default function Login() {
  const { login, error, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    const ok = await login(email, password);

    if (!ok) return;

    const user = JSON.parse(localStorage.getItem("spacebook_user"));

    if (user?.role === "Admin") {
      navigate("/admin/dashboard");
    } else {
      navigate("/dashboard");
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${BACKGROUND_IMAGE_URL}')` }}
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 -z-10 bg-[#001D4A]/70" />

      {/* Header */}
      <header className="w-full bg-[#001D4A]/90 px-6 py-3 shadow-lg flex items-center justify-between backdrop-blur-md border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <img
            src={Logo}
            alt="SpaceBook"
            className="h-10 w-auto object-contain"
          />

          <div className="flex items-center">
            <span className="text-lg font-bold tracking-widest text-white uppercase leading-none">
              SpaceBook
            </span>
          </div>
        </div>

        {/* SharePoint Home Link Button */}
        <a
          href="https://vmivsp.sharepoint.com"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg p-2 text-white hover:bg-white/10 transition"
          aria-label="SharePoint Home"
        >
          <Home size={18} />
        </a>
      </header>

      {/* Main */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-8 py-6 flex flex-col justify-center overflow-hidden">
        {/* Title */}
        <div className="max-w-3xl mb-6 text-white">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-normal leading-tight tracking-tight whitespace-nowrap">
            Reserve Your Workspace
          </h1>

          <p className="mt-3 text-base text-slate-200">
            Log in to manage bookings and schedule meeting rooms.
          </p>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-md">
          <div className="overflow-hidden rounded-lg bg-white/95 shadow-2xl backdrop-blur-md border border-white/20">
            <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-3.5">
              <h2 className="text-sm font-semibold text-slate-700">
                Log in to SpaceBook
              </h2>
            </div>

            <div className="px-6 py-5">
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <Field label="Email">
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@company.com"
                    className="w-full rounded-md border border-slate-200 px-4 py-2 text-sm"
                  />
                </Field>

                <Field label="Password">
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full rounded-md border border-slate-200 px-4 py-2 pr-10 text-sm"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </Field>

                {error && (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={loading || !email.trim() || !password}
                  className="w-full rounded-md bg-[#001D4A] py-2.5 text-sm font-semibold text-white hover:bg-[#001433] transition-colors shadow-md"
                >
                  {loading ? "Signing in..." : "Log in"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}