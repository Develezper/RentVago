import { APP_NAME } from "@/lib";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-start justify-center gap-4 px-6">
      <h1 className="text-4xl font-bold tracking-tight">{APP_NAME}</h1>
      <p className="max-w-xl text-zinc-600">
        Proyecto base listo para empezar a desarrollar.
      </p>
      <p className="text-sm text-zinc-500">Edita src/app/page.tsx para construir tu landing.</p>
      <div className="text-sm text-zinc-500">Servidor de desarrollo: http://localhost:3000</div>
    </main>
  );
}
