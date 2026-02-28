import { NextRequest, NextResponse } from "next/server";
import {
    getSingularitySessions,
    getSingularitySession,
    createSingularitySession,
    updateSingularitySession,
    updateSingularitySessionMode,
    deleteSingularitySession,
} from "@/lib/singularity-history";

// GET /api/singularity/history?userId=xxx — List sessions
// GET /api/singularity/history?sessionId=xxx — Load single session
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");
        const sessionId = searchParams.get("sessionId");

        if (sessionId) {
            const session = await getSingularitySession(sessionId);
            if (!session) {
                return NextResponse.json({ error: "Session not found" }, { status: 404 });
            }
            return NextResponse.json(session);
        }

        if (userId) {
            const sessions = await getSingularitySessions(userId);
            return NextResponse.json(sessions);
        }

        return NextResponse.json({ error: "userId or sessionId required" }, { status: 400 });
    } catch (error: any) {
        console.error("[History API] GET error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/singularity/history — Create new session
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, mode } = body;

        if (!userId) {
            return NextResponse.json({ error: "userId required" }, { status: 400 });
        }

        const sessionId = await createSingularitySession(userId, mode || "chat");
        return NextResponse.json({ sessionId });
    } catch (error: any) {
        console.error("[History API] POST error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT /api/singularity/history — Update session (save messages)
export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { sessionId, messages, title, mode } = body;

        if (!sessionId) {
            return NextResponse.json({ error: "sessionId required" }, { status: 400 });
        }

        if (mode) {
            await updateSingularitySessionMode(sessionId, mode);
        }

        if (messages) {
            await updateSingularitySession(sessionId, messages, title);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[History API] PUT error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE /api/singularity/history?id=xxx — Delete session
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "id required" }, { status: 400 });
        }

        await deleteSingularitySession(id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[History API] DELETE error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
