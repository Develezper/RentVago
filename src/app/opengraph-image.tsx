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
            "radial-gradient(circle at 90% 10%, rgba(233,82,22,0.24) 0%, transparent 40%), linear-gradient(135deg, #131211 0%, #363330 62%, #1b1a18 100%)",
          color: "#fff9e5",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 68,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: -1,
            color: "#e95216",
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
            background: "linear-gradient(90deg, #e95216 0%, #ee7444 100%)",
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
            color: "#e7e6e4",
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
