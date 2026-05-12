import test from "node:test";
import assert from "node:assert/strict";

import type {
    ProjectServiceConfigSnapshot,
    ProjectServiceSnapshot,
} from "../lib/actions/projects-shared";

process.env.MONGODB_URI ||= "mongodb://127.0.0.1:27017/dc-test";

test("normalizes duplicate service configs to one canonical service config", async () => {
    const { buildNormalizedProjectServiceConfigs } = await import("../lib/actions/projects-shared");

    const services: ProjectServiceSnapshot[] = [
        { id: "svc-1", name: "Design", projectId: "project-1" },
    ];
    const configs: ProjectServiceConfigSnapshot[] = [
        {
            serviceId: "svc-1",
            name: "Design",
            paymentConfig: {
                type: "installment",
                paymentDetailsLater: true,
                installments: 1,
                installmentAmount: 0,
                monthlyAmount: 0,
            },
        },
        {
            serviceId: "Design",
            name: "Design",
            paymentConfig: {
                type: "installment",
                paymentDetailsLater: false,
                installments: 2,
                installmentAmount: 500,
                firstPaymentDate: "2026-05-01",
                installmentDates: ["2026-05-01", "2026-06-01"],
                monthlyAmount: 0,
            },
        },
    ];

    const normalized = buildNormalizedProjectServiceConfigs(services, configs);

    assert.equal(normalized.length, 1);
    assert.equal(normalized[0].serviceId, "svc-1");
    assert.equal(normalized[0].name, "Design");
    assert.equal(normalized[0].paymentConfig?.paymentDetailsLater, false);
    assert.equal(normalized[0].paymentConfig?.installmentAmount, 500);
});
