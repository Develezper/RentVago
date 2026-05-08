import { NewPropertyForm } from "./new-property-form.client";

export default function NewMyPropertyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="rounded-2xl border border-gray-800 bg-black p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-400">
          Publicacion directa
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
          Publicar nuevo inmueble
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          Completa los datos del inmueble. Quedara en revision antes de mostrarse en el
          catalogo.
        </p>
      </header>

      <NewPropertyForm />
    </div>
  );
}
