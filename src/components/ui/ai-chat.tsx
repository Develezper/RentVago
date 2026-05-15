"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";

type MessageRole = "user" | "assistant";

interface ContextProperty {
  id: string;
  title: string;
  price: string;
  city: string | null;
  neighborhood: string | null;
  rooms: number | null;
  propertyType: string;
}

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  contextProperties?: ContextProperty[];
}

interface ChatApiResponse {
  data?: {
    reply?: string;
    contextProperties?: ContextProperty[];
  };
  error?: string;
}

const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
  id: "welcome-assistant",
  role: "assistant",
  content:
    "Hola, soy tu Asesor Inmobiliario RentVago. Cuentame que zona y presupuesto tienes, y te ayudo a encontrar opciones que si hagan match.",
};

const formatCopPrice = (price: string): string => {
  const parsed = Number(price);
  if (!Number.isFinite(parsed)) {
    return `${price} COP`;
  }

  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(parsed);
};

const getMessageId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_ASSISTANT_MESSAGE]);
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading, isOpen]);

  const canSend = useMemo(() => input.trim().length > 0 && !isLoading, [input, isLoading]);

  const sendMessage = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const normalizedMessage = input.trim();

    if (!normalizedMessage || isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: getMessageId(),
      role: "user",
      content: normalizedMessage,
    };

    setMessages((previous) => [...previous, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: normalizedMessage }),
      });

      const payload = (await response.json()) as ChatApiResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "No fue posible responder tu consulta ahora.");
      }

      const assistantMessage: ChatMessage = {
        id: getMessageId(),
        role: "assistant",
        content:
          payload.data?.reply?.trim() ||
          "No pude construir una respuesta clara en este momento, intenta de nuevo.",
        contextProperties: Array.isArray(payload.data?.contextProperties)
          ? payload.data.contextProperties
          : [],
      };

      setMessages((previous) => [...previous, assistantMessage]);
    } catch {
      setMessages((previous) => [
        ...previous,
        {
          id: getMessageId(),
          role: "assistant",
          content:
            "Tuvimos un problema temporal conectando con el asesor. Intenta de nuevo en unos segundos.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <section className="pointer-events-auto w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-3xl border border-green-500/30 bg-black/95 shadow-[0_25px_80px_rgba(34,197,94,0.22)] backdrop-blur md:w-[26rem]">
          <header className="relative border-b border-gray-800/90 bg-gray-950 px-4 py-3">
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-green-400/60 to-transparent" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-green-400">
                  IA RentVago
                </p>
                <h2 className="mt-1 flex items-center gap-1 text-sm font-extrabold text-white">
                  <Sparkles className="h-4 w-4 text-green-400" />
                  Asesor Inmobiliario
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl border border-gray-700 p-2 text-gray-300 transition hover:border-gray-500 hover:text-white"
                aria-label="Cerrar chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="max-h-[26rem] space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.10),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.08),transparent_40%)] px-3 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <article
                  className={`max-w-[85%] rounded-2xl border px-3 py-2 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "border-green-400/40 bg-green-500 text-black"
                      : "border-gray-700 bg-gray-900/95 text-gray-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>

                  {message.role === "assistant" &&
                  message.contextProperties &&
                  message.contextProperties.length > 0 ? (
                    <div className="mt-3 space-y-2 rounded-xl border border-gray-700 bg-black/60 p-2">
                      <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-green-400">
                        Propiedades sugeridas
                      </p>
                      {message.contextProperties.slice(0, 3).map((property) => (
                        <Link
                          key={property.id}
                          href={`/catalog/${property.id}`}
                          className="block rounded-xl border border-gray-700 bg-gray-950 px-2 py-2 transition hover:border-green-400/50 hover:bg-black"
                        >
                          <p className="line-clamp-1 text-xs font-semibold text-gray-100">
                            {property.title}
                          </p>
                          <p className="mt-1 text-[0.72rem] text-gray-400">
                            {property.city ?? "Sin ciudad"}
                            {property.neighborhood ? ` - ${property.neighborhood}` : ""}
                          </p>
                          <p className="mt-1 text-xs font-bold text-green-400">
                            {formatCopPrice(property.price)}
                          </p>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </article>
              </div>
            ))}

            {isLoading ? (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-gray-700 bg-gray-900/95 px-3 py-2 text-sm text-gray-300">
                  El asesor esta buscando opciones para ti...
                </div>
              </div>
            ) : null}
            <div ref={endOfMessagesRef} />
          </div>

          <form onSubmit={sendMessage} className="border-t border-gray-800 bg-black p-3">
            <div className="flex items-center gap-2 rounded-2xl border border-gray-700 bg-gray-950 px-2 py-2 focus-within:border-green-400/60">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ej: Busco apartaestudio en Envigado por 1.5M"
                className="w-full bg-transparent px-2 text-sm text-white outline-none placeholder:text-gray-500"
                disabled={isLoading}
                maxLength={500}
              />
              <button
                type="submit"
                disabled={!canSend}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-green-500 text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
                aria-label="Enviar mensaje"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        className="pointer-events-auto mt-3 inline-flex h-14 w-14 items-center justify-center rounded-full border border-green-400/40 bg-green-500 text-black shadow-[0_12px_35px_rgba(34,197,94,0.35)] transition hover:-translate-y-0.5 hover:bg-green-400"
        aria-label={isOpen ? "Cerrar chat de asesor" : "Abrir chat de asesor"}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
