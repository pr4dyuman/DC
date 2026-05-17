import { buildMarketingLlmsText } from "@/lib/marketing-llms";

export const dynamic = "force-dynamic";

export async function GET() {
    return new Response(await buildMarketingLlmsText({ full: true }), {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=0, must-revalidate",
        },
    });
}
