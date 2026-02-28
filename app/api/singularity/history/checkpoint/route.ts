import { NextRequest, NextResponse } from "next/server";
import {
    createCheckpoint,
    getCheckpoints,
    analyzeRollback,
    executeRollback,
} from "@/lib/singularity-history";

// GET /api/singularity/history/checkpoint?sessionId=xxx — List checkpoints
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get("sessionId");

        if (!sessionId) {
            return NextResponse.json({ error: "sessionId required" }, { status: 400 });
        }

        const checkpoints = await getCheckpoints(sessionId);
        return NextResponse.json(checkpoints);
    } catch (error: any) {
        console.error("[Checkpoint API] GET error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/singularity/history/checkpoint — Create checkpoint or analyze rollback
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // If analyzing rollback
        if (body.action === "analyze") {
            const analysis = await analyzeRollback(body.checkpointId);
            if (!analysis) {
                return NextResponse.json({ error: "Checkpoint not found" }, { status: 404 });
            }
            return NextResponse.json(analysis);
        }

        // Creating a checkpoint
        const { sessionId, messageIndex, actions, label } = body;

        if (!sessionId || messageIndex === undefined || !actions) {
            return NextResponse.json({ error: "sessionId, messageIndex, and actions required" }, { status: 400 });
        }

        const checkpointId = await createCheckpoint(sessionId, messageIndex, actions, label || "Checkpoint");
        return NextResponse.json({ checkpointId });
    } catch (error: any) {
        console.error("[Checkpoint API] POST error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT /api/singularity/history/checkpoint — Execute rollback
export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { checkpointId, scope } = body;

        if (!checkpointId || !scope) {
            return NextResponse.json({ error: "checkpointId and scope ('safe' or 'all') required" }, { status: 400 });
        }

        const result = await executeRollback(checkpointId, scope);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error("[Checkpoint API] PUT error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
