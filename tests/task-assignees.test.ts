import test from "node:test";
import assert from "node:assert/strict";

import {
    buildTaskAssigneeUpdate,
    getTaskAssigneeIds,
    isTaskAssignedTo,
    normalizeTaskAssigneeIds,
} from "../lib/task-assignees";

test("normalizes multi assignees with legacy fallback", () => {
    assert.deepEqual(normalizeTaskAssigneeIds(["u1", " u2 ", "u1", ""], "u3"), ["u1", "u2", "u3"]);
});

test("reads legacy assigneeId when assigneeIds is missing", () => {
    assert.deepEqual(getTaskAssigneeIds({ assigneeId: "u1" }), ["u1"]);
    assert.equal(isTaskAssignedTo({ assigneeId: "u1" }, "u1"), true);
});

test("builds mirrored update fields for compatibility", () => {
    assert.deepEqual(buildTaskAssigneeUpdate(["u2", "u3"]), {
        assigneeIds: ["u2", "u3"],
        assigneeId: "u2",
    });
});
