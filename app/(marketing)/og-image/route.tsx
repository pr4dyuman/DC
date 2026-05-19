import { ImageResponse } from "next/og";

const size = {
  width: 1200,
  height: 630,
};

function MarketingSocialImage() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#030303",
        color: "#ffffff",
        padding: "60px",
        fontFamily: "Arial, Helvetica, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 460,
          height: 460,
          left: -100,
          top: -120,
          borderRadius: 9999,
          background: "rgba(245, 238, 48, 0.18)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 520,
          height: 520,
          right: -170,
          bottom: -190,
          borderRadius: 9999,
          background: "rgba(245, 238, 48, 0.12)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          top: 60,
          bottom: 60,
          border: "2px solid rgba(245, 238, 48, 0.35)",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <div
          style={{
            display: "flex",
            color: "#f5ee30",
            fontSize: 104,
            fontWeight: 900,
            lineHeight: 0.85,
            letterSpacing: -4,
          }}
        >
          DC
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1 }}>Digital</div>
          <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1 }}>Corvids</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            display: "flex",
            color: "#f5ee30",
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: 8,
            textTransform: "uppercase",
          }}
        >
          Digital Marketing Agency
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 82,
            fontWeight: 900,
            lineHeight: 0.95,
            maxWidth: 900,
          }}
        >
          <span>SEO, PPC, Social,</span>
          <span>Web and AI Growth</span>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "rgba(255,255,255,0.82)",
          fontSize: 28,
        }}
      >
        <span>Jaipur, India</span>
        <span>digitalcorvids.com</span>
      </div>
    </div>
  );
}

export function GET() {
  const response = new ImageResponse(<MarketingSocialImage />, size);
  response.headers.set(
    "Cache-Control",
    "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
  );

  return response;
}
