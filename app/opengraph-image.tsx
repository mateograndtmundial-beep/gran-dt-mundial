import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#F0F2F0",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(135deg, #1B4FD8 0%, #1B4FD8 38%, #F0F2F0 38%, #F0F2F0 100%)",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
            padding: "0 80px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: 6,
              color: "#C8A24B",
              textTransform: "uppercase",
            }}
          >
            Mundial 2026 · Fantasy
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 96,
              fontWeight: 800,
              letterSpacing: 2,
              color: "#15181C",
              lineHeight: 1.05,
            }}
          >
            Los 11 de Sampa
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 32,
              fontWeight: 600,
              color: "#3A4048",
              maxWidth: 820,
            }}
          >
            Armá tu equipo del Mundial 2026 y competí con amigos
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
