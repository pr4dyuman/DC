import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

const size = {
  width: 1200,
  height: 630,
};

// Page titles shown on shared links, e.g. /og-image?title=SEO%20Services%20in%20Jaipur.
// Only printable text is kept, and it is capped so a long value cannot
// overflow the image.
function cleanTitle(value: string | null) {
  const text = (value || "").replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, 60);
  return text || null;
}

function MarketingSocialImage({ title }: { title: string | null }) {
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
        fontFamily: "Glacial, Arial, Helvetica, sans-serif",
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
            fontFamily: "Suifak, Glacial, Arial, sans-serif",
            fontSize: 104,
            fontWeight: 900,
            lineHeight: 0.85,
            letterSpacing: -2,
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
          {title ? "Digital Corvids, Jaipur" : "Digital Marketing Agency"}
        </div>
        {title ? (
          <div
            style={{
              display: "flex",
              fontSize: title.length > 32 ? 64 : 82,
              fontWeight: 900,
              lineHeight: 0.98,
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
        ) : (
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
            <span>SEO, Ads, Social,</span>
            <span>Websites and Video</span>
          </div>
        )}
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

// The site's own fonts. If they cannot be read, the image still renders with
// the built-in font, so a shared link never loses its preview.
async function loadFonts() {
  try {
    const [glacial, suifak] = await Promise.all([
      readFile(join(process.cwd(), "public/fonts/Glacial-bold.otf")),
      readFile(join(process.cwd(), "public/fonts/Suifak.otf")),
    ]);
    return [
      { name: "Glacial", data: glacial, weight: 700 as const, style: "normal" as const },
      { name: "Suifak", data: suifak, weight: 400 as const, style: "normal" as const },
    ];
  } catch {
    return undefined;
  }
}

export async function GET(request: Request) {
  const title = cleanTitle(new URL(request.url).searchParams.get("title"));
  const fonts = await loadFonts();
  const response = new ImageResponse(<MarketingSocialImage title={title} />, { ...size, fonts });
  response.headers.set(
    "Cache-Control",
    "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
  );

  return response;
}
