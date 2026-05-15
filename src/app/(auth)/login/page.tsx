"use client";

import {
  buildAuthPageHref,
  DEFAULT_POST_AUTH_REDIRECT_PATH,
  sanitizePostAuthRedirect,
} from "@/lib/auth-redirect";
import { ArrowLeft, Lock, LogIn, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

interface LoginFormState {
  email: string;
  password: string;
}

const extractErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  try {
    const data: unknown = await response.json();
    if (
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string"
    ) {
      return data.error;
    }
  } catch {
    return fallback;
  }
  return fallback;
};

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState<LoginFormState>({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const redirectPath =
    sanitizePostAuthRedirect(searchParams.get("next")) ??
    DEFAULT_POST_AUTH_REDIRECT_PATH;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: form.email, password: form.password }),
      });

      if (response.status === 200) {
        router.replace(redirectPath);
        return;
      }

      if (response.status === 401) {
        setErrorMessage("Credenciales inválidas. Verifica tu correo y contraseña.");
        return;
      }

      const message = await extractErrorMessage(
        response,
        "No pudimos iniciar sesión. Intenta de nuevo.",
      );
      setErrorMessage(message);
    } catch {
      setErrorMessage("Error de red. Revisa tu conexión e intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-950 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-green-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-green-400 mb-8 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>

        <div className="bg-black p-8 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.8)] border border-gray-800 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-800 via-green-500 to-gray-800" />

          <div className="mb-8 text-center">
            <h1 className="text-3xl font-extrabold text-white mb-2">Bienvenido</h1>
            <p className="text-gray-400 font-medium">Ingresa a tu panel de control</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1 tracking-wider">
                Email
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-green-400 transition-colors" />
                </div>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isLoading}
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="ejemplo@correo.com"
                  className="block w-full pl-12 pr-4 py-4 bg-gray-900 border border-gray-800 rounded-2xl focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none transition-all placeholder:text-gray-600 text-white font-medium shadow-inner disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1 tracking-wider">
                Contraseña
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-green-400 transition-colors" />
                </div>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                  className="block w-full pl-12 pr-4 py-4 bg-gray-900 border border-gray-800 rounded-2xl focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none transition-all placeholder:text-gray-600 text-white font-medium shadow-inner disabled:opacity-50"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="p-4 bg-red-500/10 text-red-400 text-sm font-bold rounded-xl border border-red-500/20 text-center">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-4 px-4 bg-green-500 text-black text-sm font-extrabold rounded-2xl hover:bg-green-400 transition-all active:scale-[0.98] disabled:opacity-50 shadow-[0_0_15px_rgba(233,82,22,0.3)] hover:shadow-[0_0_25px_rgba(233,82,22,0.42)] mt-3"
            >
              {isLoading ? (
                "Verificando..."
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Acceder
                </>
              )}
            </button>

            <p className="text-center text-sm text-gray-500 mt-4 font-medium">
              ¿No tienes cuenta?{" "}
              <Link
                href={buildAuthPageHref("/register", redirectPath)}
                className="font-bold text-green-400 hover:text-green-300 hover:underline underline-offset-4 transition-colors"
              >
                Regístrate gratis
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
