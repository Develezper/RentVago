import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <main className="relative isolation px-6 pt-14 lg:px-8 overflow-hidden min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-950">
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80 pointer-events-none">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-green-500 to-black opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
      </div>

      <div className="mx-auto max-w-4xl py-20 text-center relative z-10">
        <div className="mb-8 flex justify-center">
          <span className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 text-green-400 text-sm font-bold tracking-wide border border-green-500/20">
            <Sparkles className="w-4 h-4" />
            La revolución del arrendamiento
          </span>
        </div>

        <h1 className="text-5xl font-black tracking-tight text-white sm:text-7xl mb-6">
          Gestiona tus alquileres con{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-600">
            RentVago
          </span>
        </h1>

        <p className="mt-6 text-xl leading-8 text-gray-400 max-w-2xl mx-auto font-medium">
          La plataforma definitiva para conectar arrendadores y arrendatarios con seguridad
          de grado empresarial.
        </p>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link
            href="/register"
            className="rounded-full bg-green-500 px-8 py-4 text-lg font-bold text-black shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:bg-green-400 hover:shadow-[0_0_30px_rgba(34,197,94,0.6)] transition-all active:scale-95 flex items-center gap-2 group"
          >
            Empezar gratis
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/catalog"
            className="text-lg font-bold leading-6 text-gray-300 hover:text-white transition-colors border-b-2 border-transparent hover:border-white pb-1"
          >
            Ver propiedades →
          </Link>
        </div>
      </div>
    </main>
  );
}
