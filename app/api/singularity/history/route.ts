import { NextRequest, NextResponse } from "next/server";
import {
    getSingularitySessions,
    getSingularitySession,
    createSingularitySession,
    updateSingularitySession,
    updateSingularitySessionMode,
    deleteSingularitySession,
} from "@/lib/singularity-history";
import { getSessionUser } from "@/lib/auth";
import { validateCsrfOrigin } from "@/lib/validation";

// GET /api/singularity/history?sessionId=xxx — Load single session
// GET /api/singularity/history — List current user's sessions
export async function GET(req: NextRequest) {
    try {
        // Authentication check
        const session = await getSessionUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get("sessionId");

        if (sessionId) {
            const chatSession = await getSingularitySession(sessionId);
            if (!chatSession) {
                return NextResponse.json({ error: "Session not found" }, { status: 404 });
            }
            return NextResponse.json(chatSession);
        }

        // Only return sessions for the authenticated user (Fix IDOR)
        const sessions = await getSingularitySessions(session.userId);
        return NextResponse.json(sessions);
    } catch (error: any) {
        console.error("[History API] GET error:", error.message);
        return NextResponse.json({ error: "An internal error occurred" }, { status: 500 });
    }
}

// POST /api/singularity/history
// — Create new session when body has { mode }
// — Update existing session when body has { sessionId, messages } (used by sendBeacon emergency save)
export async function POST(req: NextRequest) {
    try {
        const csrf = validateCsrfOrigin(req);
        if (!csrf.valid) return csrf.response;

        // Authentication check
        const session = await getSessionUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { mode, sessionId, messages, title } = body;

        // If sessionId is present — this is an emergency save from sendBeacon
        if (sessionId && messages) {
            // Verify ownership before updating
            const existingSession = await getSingularitySession(sessionId);
            if (!existingSession) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
            await updateSingularitySession(sessionId, messages, title);
            return NextResponse.json({ success: true });
        }

        // Otherwise — create a new session for the authenticated user
        const newSessionId = await createSingularitySession(session.userId, mode || "chat");
        return NextResponse.json({ sessionId: newSessionId });
    } catch (error: any) {
        console.error("[History API] POST error:", error.message);
        return NextResponse.json({ error: "An internal error occurred" }, { status: 500 });
    }
}

// PUT /api/singularity/history — Update session (save messages)
export async function PUT(req: NextRequest) {
    try {
        const csrf = validateCsrfOrigin(req);
        if (!csrf.valid) return csrf.response;

        // Authentication check
        const session = await getSessionUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { sessionId, messages, title, mode: newMode } = body;

        if (!sessionId) {
            return NextResponse.json({ error: "sessionId required" }, { status: 400 });
        }

        // Verify ownership before updating
        const existingSession = await getSingularitySession(sessionId);
        if (!existingSession) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (newMode) {
            await updateSingularitySessionMode(sessionId, newMode);
        }

        if (messages) {
            await updateSingularitySession(sessionId, messages, title);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[History API] PUT error:", error.message);
        return NextResponse.json({ error: "An internal error occurred" }, { status: 500 });
    }
}

// DELETE /api/singularity/history?id=xxx — Delete session
export async function DELETE(req: NextRequest) {
    try {
        const csrf = validateCsrfOrigin(req);
        if (!csrf.valid) return csrf.response;

        // Authentication check
        const session = await getSessionUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "id required" }, { status: 400 });
        }

        // Verify ownership before deleting
        const existingSession = await getSingularitySession(id);
        if (!existingSession) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await deleteSingularitySession(id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[History API] DELETE error:", error.message);
        return NextResponse.json({ error: "An internal error occurred" }, { status: 500 });
    }
}
