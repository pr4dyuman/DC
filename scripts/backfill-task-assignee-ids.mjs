import { MongoClient } from "mongodb";
import "dotenv/config";

const uri = process.env.MONGODB_URI;
if (!uri) {
    throw new Error("MONGODB_URI is required. Set it before running this script.");
}

const dryRun = process.argv.includes("--dry-run");

function normalizeAssigneeIds(task) {
    const ids = Array.isArray(task.assigneeIds) ? task.assigneeIds : [];
    if (typeof task.assigneeId === "string" && task.assigneeId.trim()) {
        ids.push(task.assigneeId.trim());
    }
    return [...new Set(ids.map((id) => String(id || "").trim()).filter(Boolean))];
}

async function main() {
    const client = new MongoClient(uri);
    await client.connect();

    try {
        const db = client.db();
        const tasks = db.collection("tasks");
        const cursor = tasks.find({
            assigneeId: { $type: "string", $ne: "" },
            $or: [
                { assigneeIds: { $exists: false } },
                { assigneeIds: { $size: 0 } },
            ],
        });

        let checked = 0;
        let updated = 0;

        for await (const task of cursor) {
            checked++;
            const assigneeIds = normalizeAssigneeIds(task);
            if (assigneeIds.length === 0) continue;
            updated++;

            if (!dryRun) {
                await tasks.updateOne(
                    { _id: task._id },
                    { $set: { assigneeIds, assigneeId: assigneeIds[0] || "" } }
                );
            }
        }

        console.log(`${dryRun ? "Would update" : "Updated"} ${updated} task(s). Checked ${checked}.`);
    } finally {
        await client.close();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
