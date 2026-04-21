import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt } = body;

    if (!prompt) {
      return NextResponse.json({ error: "El prompt es requerido" }, { status: 400 });
    }

    // Initial Optimization: Definition of the System Prompt
    const systemPrompt = "Eres un agente inteligente integrado en una plataforma SaaS. Tu rol es asistir al usuario de manera precisa, profesional y concisa. Responde siempre en español.";

    // Start of latency measurement
    const startTime = performance.now();

    // Call to the local Ollama API
    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'phi3',
        prompt: prompt,
        system: systemPrompt,
        stream: false, // Disabled for this PoC; returns the complete response at once
      }),
    });

    if (!response.ok) {
      throw new Error(`Error en Ollama: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Fin de medición de latencia
    const endTime = performance.now();
    const latencyMs = Math.round(endTime - startTime);

    return NextResponse.json({
      success: true,
      model: data.model,
      response: data.response,
      latency: `${latencyMs}ms` // Documentation of latency in the same response
    });

  } catch (error) {
    console.error("Error conectando con el motor local:", error);
    return NextResponse.json(
      { success: false, error: "Fallo en la comunicación con Ollama local." },
      { status: 500 }
    );
  }
}