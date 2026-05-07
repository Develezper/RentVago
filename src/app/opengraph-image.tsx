import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "RentVago - Arriendos en el Valle de Aburrá";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px",
          background:
            "radial-gradient(circle at 90% 10%, #14532d 0%, transparent 40%), linear-gradient(135deg, #020617 0%, #111827 55%, #052e16 100%)",
          color: "#f3f4f6",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 68,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: -1,
            color: "#22c55e",
          }}
        >
          RentVago
        </div>
        <div
          style={{
            marginTop: 26,
            height: 8,
            width: 390,
            borderRadius: 999,
            background: "linear-gradient(90deg, #22c55e 0%, #86efac 100%)",
          }}
        />
        <div
          style={{
            marginTop: 30,
            fontSize: 46,
            fontWeight: 700,
            lineHeight: 1.15,
            maxWidth: 920,
          }}
        >
          Arriendos en el Valle de Aburrá
        </div>
        <div
          style={{
            marginTop: 22,
            fontSize: 30,
            color: "#d1d5db",
          }}
        >
          Catálogo, alertas y gestión segura para equipos inmobiliarios.
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
