"use client"

import { useActionState } from "react";
import { createUserAction } from "@/app/actions/db-actions";

export default function DataInput() {
  const [state, formAction, isPending] = useActionState(createUserAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-sm mx-auto p-6 mt-10 rounded shadow-md border">
      <h2 className="text-xl font-bold">Crear Registro</h2>
      
      {/* ==============================================================
          EJEMPLO DE UN CAMPO (Email)
          Sigue este mismo patrón para armar los demás según tu esquema Zod
          ============================================================== */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">Correo Electrónico</label>
        <input 
          id="email"
          name="email" 
          type="email" 
          className="w-full p-2 border rounded text-black"
        />
        
        {state?.details?.email && (
          <p className="text-red-500 text-xs mt-1">{state.details.email[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">Nombre</label>
        <input 
          id="name"
          name="name"
          type="text" 
          className="w-full p-2 border rounded text-black"
          />

          {state?.details?.name && (
            <p className="text-red-500 text-xs mt-1">{state.details.name[0]}</p>
          )}
      </div>


      
      {/* Botón de Enviar (se desactiva solo para no enviar clics dobles) */}
      <button 
        type="submit" 
        disabled={isPending}
        className="mt-4 bg-black text-white hover:bg-gray-800 p-2 rounded disabled:opacity-50 transition-colors"
      >
        {isPending ? "Procesando..." : "Enviar Formulario"}
      </button>

      {/* Manejo de feedback general (errores del servidor o mensajes de éxito) */}
      {state?.error && <div className="text-red-500 text-sm">{state.error}</div>}
      {state?.success && <div className="text-green-500 font-bold">¡Guardado con éxito!</div>}
    </form>
  )
}
