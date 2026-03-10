/**
 * Root-cause test: reproduce the EXACT production behavior.
 *
 * Difference between test (worked) and production (failed):
 *   - Production sends 29 tool declarations → test sent 0
 *   - Production sends a ~20KB system prompt → test sent a tiny one
 *
 * This script tests:
 *   Test 1: NO tools, short prompt     ← (our previous test — works)
 *   Test 2: WITH tools, short prompt   ← isolate tools as the cause
 *   Test 3: NO tools, LONG prompt      ← isolate prompt size as the cause
 *   Test 4: WITH tools, LONG prompt    ← exact production scenario
 *
 * Usage: node scripts/test-live-rootcause.mjs
 */

import { GoogleGenAI, Modality } from "@google/genai";

const API_KEY = process.argv[2] || process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error("Set GEMINI_API_KEY"); process.exit(1); }

const MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";
const USER_MSG = "Finance summary";

// ---------------------------------------------------------------------------
// Fake tool declarations (mimicking the 29 filtered production tools)
// ---------------------------------------------------------------------------
const FAKE_TOOLS = [
    { name: "create_project", description: "Create a new project", parameters: { type: "OBJECT", properties: { name: { type: "STRING" }, budget: { type: "NUMBER" }, dueDate: { type: "STRING" } }, required: ["name", "budget", "dueDate"] } },
    { name: "search_agency", description: "Search across agency data", parameters: { type: "OBJECT", properties: { query: { type: "STRING" } }, required: ["query"] } },
    { name: "get_project_tasks", description: "Get tasks in a project", parameters: { type: "OBJECT", properties: { projectId: { type: "STRING" } }, required: ["projectId"] } },
    { name: "get_finance_summary", description: "Get financial summary — revenue, expenses, profit, invoices", parameters: { type: "OBJECT", properties: {} } },
    { name: "get_team_workload", description: "Get workload per team member", parameters: { type: "OBJECT", properties: {} } },
    { name: "update_project", description: "Update a project", parameters: { type: "OBJECT", properties: { projectId: { type: "STRING" } }, required: ["projectId"] } },
    { name: "create_task", description: "Create a task", parameters: { type: "OBJECT", properties: { projectId: { type: "STRING" }, title: { type: "STRING" } }, required: ["projectId", "title"] } },
    { name: "update_task", description: "Update a task", parameters: { type: "OBJECT", properties: { taskId: { type: "STRING" } }, required: ["taskId"] } },
    { name: "create_client", description: "Create a client", parameters: { type: "OBJECT", properties: { companyName: { type: "STRING" } }, required: ["companyName"] } },
    { name: "update_client", description: "Update a client", parameters: { type: "OBJECT", properties: { clientId: { type: "STRING" } }, required: ["clientId"] } },
    { name: "create_invoice", description: "Create an invoice", parameters: { type: "OBJECT", properties: { clientId: { type: "STRING" }, amount: { type: "NUMBER" } }, required: ["clientId", "amount"] } },
    { name: "update_invoice_status", description: "Update invoice status", parameters: { type: "OBJECT", properties: { invoiceId: { type: "STRING" }, status: { type: "STRING" } }, required: ["invoiceId", "status"] } },
    { name: "create_transaction", description: "Record a transaction", parameters: { type: "OBJECT", properties: { type: { type: "STRING" }, amount: { type: "NUMBER" } }, required: ["type", "amount"] } },
    { name: "pay_employee", description: "Pay salary to employee", parameters: { type: "OBJECT", properties: { employeeId: { type: "STRING" }, amount: { type: "NUMBER" } }, required: ["employeeId", "amount"] } },
    { name: "bulk_create_tasks", description: "Create multiple tasks at once", parameters: { type: "OBJECT", properties: { projectId: { type: "STRING" }, tasks: { type: "ARRAY", items: { type: "OBJECT" } } }, required: ["projectId", "tasks"] } },
    { name: "bulk_pay_employees", description: "Pay multiple employees", parameters: { type: "OBJECT", properties: { payments: { type: "ARRAY", items: { type: "OBJECT" } } }, required: ["payments"] } },
    { name: "bulk_create_invoices", description: "Create multiple invoices", parameters: { type: "OBJECT", properties: { invoices: { type: "ARRAY", items: { type: "OBJECT" } } }, required: ["invoices"] } },
    { name: "bulk_create_clients", description: "Create multiple clients", parameters: { type: "OBJECT", properties: { clients: { type: "ARRAY", items: { type: "OBJECT" } } }, required: ["clients"] } },
    { name: "create_employee", description: "Create employee", parameters: { type: "OBJECT", properties: { name: { type: "STRING" } }, required: ["name"] } },
    { name: "update_employee", description: "Update employee", parameters: { type: "OBJECT", properties: { employeeId: { type: "STRING" } }, required: ["employeeId"] } },
    { name: "create_service", description: "Create a service", parameters: { type: "OBJECT", properties: { name: { type: "STRING" } }, required: ["name"] } },
    { name: "create_refund", description: "Create a refund", parameters: { type: "OBJECT", properties: { invoiceId: { type: "STRING" } }, required: ["invoiceId"] } },
    { name: "update_task_status", description: "Update task status", parameters: { type: "OBJECT", properties: { taskId: { type: "STRING" }, status: { type: "STRING" } }, required: ["taskId", "status"] } },
    { name: "assign_task", description: "Assign task to team member", parameters: { type: "OBJECT", properties: { taskId: { type: "STRING" }, userId: { type: "STRING" } }, required: ["taskId", "userId"] } },
    { name: "get_employee_payroll", description: "Get payroll history", parameters: { type: "OBJECT", properties: { employeeId: { type: "STRING" } }, required: ["employeeId"] } },
    { name: "delete_project", description: "Delete project", parameters: { type: "OBJECT", properties: { projectId: { type: "STRING" } }, required: ["projectId"] } },
    { name: "delete_client", description: "Delete client", parameters: { type: "OBJECT", properties: { clientId: { type: "STRING" } }, required: ["clientId"] } },
    { name: "delete_transaction", description: "Delete transaction", parameters: { type: "OBJECT", properties: { transactionId: { type: "STRING" } }, required: ["transactionId"] } },
    { name: "delete_service", description: "Delete service", parameters: { type: "OBJECT", properties: { serviceId: { type: "STRING" } }, required: ["serviceId"] } },
];

// Fake 20KB system context (mimics buildSingularityContext output)
const LONG_SYSTEM_PROMPT = `You are Singularity Agent — the intelligent AI assistant embedded in Agency OS. You have full access to the agency's data and can perform actions on behalf of the user.

## AGENCY OVERVIEW
- Agency Name: Digital Nexus Agency
- Plan: Professional
- Members: 5 active team members
- Clients: 12 active clients
- Projects: 8 active projects

## QUICK LOOKUP TABLE
### Team Members
| ID | Name | Role | Email |
|----|------|------|-------|
| emp-001 | John Smith | Lead Developer | john@agency.com |
| emp-002 | Sarah Johnson | Designer | sarah@agency.com |
| emp-003 | Mike Wilson | Project Manager | mike@agency.com |
| emp-004 | Emily Chen | Marketing | emily@agency.com |
| emp-005 | David Brown | Developer | david@agency.com |

### Active Projects
| ID | Name | Client | Budget | Status | Due Date |
|----|------|--------|--------|--------|----------|
| proj-001 | Website Redesign | Acme Corp | 50000 | Active | 2026-04-15 |
| proj-002 | Mobile App | TechStart | 120000 | Active | 2026-06-01 |
| proj-003 | SEO Campaign | GreenLeaf | 25000 | Active | 2026-03-30 |
| proj-004 | Brand Identity | FoodHub | 35000 | Active | 2026-05-20 |
| proj-005 | E-commerce Platform | StyleCo | 85000 | Active | 2026-07-15 |
| proj-006 | Social Media Strategy | HealthPlus | 15000 | Active | 2026-04-01 |
| proj-007 | CRM Integration | DataFlow | 45000 | On Hold | 2026-08-01 |
| proj-008 | Content Marketing | EduTech | 20000 | Active | 2026-05-10 |

### Clients
| ID | Company | Contact | Email |
|----|---------|---------|-------|
| client-001 | Acme Corp | Bob Anderson | bob@acme.com |
| client-002 | TechStart | Lisa Park | lisa@techstart.com |
| client-003 | GreenLeaf | Tom Harris | tom@greenleaf.com |
| client-004 | FoodHub | Amy Rivera | amy@foodhub.com |
| client-005 | StyleCo | James Lee | james@styleco.com |
| client-006 | HealthPlus | Grace Kim | grace@healthplus.com |
| client-007 | DataFlow | Ryan Martinez | ryan@dataflow.com |
| client-008 | EduTech | Nina Patel | nina@edutech.com |
| client-009 | AutoDrive | Carlos Ruiz | carlos@autodrive.com |
| client-010 | MediaWave | Sophie Turner | sophie@mediawave.com |
| client-011 | FinSecure | Alex Thompson | alex@finsecure.com |
| client-012 | CloudPeak | Diana Cooper | diana@cloudpeak.com |

### Financial Summary (Current Month)
- Total Revenue: ₹4,25,000
- Total Expenses: ₹2,80,000
- Net Profit: ₹1,45,000
- Pending Invoices: 4 (₹1,20,000)
- Payroll Due: ₹1,50,000

### Services Offered
| ID | Name | Rate |
|----|------|------|
| svc-001 | Web Development | ₹2,500/hr |
| svc-002 | UI/UX Design | ₹2,000/hr |
| svc-003 | SEO | ₹1,500/hr |
| svc-004 | Content Marketing | ₹1,200/hr |
| svc-005 | Mobile Development | ₹3,000/hr |
| svc-006 | Brand Strategy | ₹2,800/hr |
| svc-007 | Social Media | ₹1,000/hr |
| svc-008 | CRM Solutions | ₹2,200/hr |

### Recent Transactions (Last 30 Days)
| Date | Type | Amount | Description |
|------|------|--------|-------------|
| 2026-03-08 | Income | ₹75,000 | Acme Corp - Website milestone 2 |
| 2026-03-05 | Income | ₹40,000 | GreenLeaf - SEO monthly retainer |
| 2026-03-03 | Expense | ₹15,000 | AWS hosting charges |
| 2026-03-01 | Income | ₹1,50,000 | TechStart - Mobile app payment |
| 2026-02-28 | Expense | ₹1,50,000 | February payroll |
| 2026-02-25 | Income | ₹35,000 | FoodHub - Brand identity phase 1 |
| 2026-02-22 | Expense | ₹8,000 | Software subscriptions |
| 2026-02-20 | Income | ₹60,000 | StyleCo - E-commerce deposit |
| 2026-02-18 | Expense | ₹12,000 | Office supplies |
| 2026-02-15 | Income | ₹15,000 | HealthPlus - Social media retainer |

### Pending Tasks
| Project | Task | Assignee | Status | Priority |
|---------|------|----------|--------|----------|
| Website Redesign | Homepage mockup | Sarah | In Progress | High |
| Website Redesign | Backend API | John | In Progress | High |
| Mobile App | User auth flow | David | Todo | High |
| Mobile App | Push notifications | John | Todo | Medium |
| SEO Campaign | Keyword research | Emily | In Progress | Medium |
| Brand Identity | Logo concepts | Sarah | Review | High |
| E-commerce Platform | Product catalog | David | In Progress | High |
| E-commerce Platform | Payment gateway | John | Todo | Critical |
| Social Media Strategy | Content calendar | Emily | In Progress | Medium |
| CRM Integration | Requirements doc | Mike | Todo | Low |

## INSTRUCTIONS
- When asked about finances, call get_finance_summary tool for real-time data
- When asked about team workload, call get_team_workload tool
- For project queries, search first then answer
- Always confirm destructive actions before proceeding
- Format currency in INR (₹)
- Be concise and professional
- If data is in the QUICK LOOKUP TABLE above, use it directly without calling tools
`.repeat(2); // Repeat to hit ~20KB like production

// ---------------------------------------------------------------------------
async function runTest(label, { tools, longPrompt }) {
    const systemInstruction = longPrompt ? LONG_SYSTEM_PROMPT : "You are Singularity, a helpful AI assistant.";
    const fullPrompt = systemInstruction + "\n\n---\n\nUser: " + USER_MSG;

    console.log(`\n${"─".repeat(60)}`);
    console.log(`  ${label}`);
    console.log(`  Tools: ${tools ? FAKE_TOOLS.length : 0} | Prompt: ${fullPrompt.length} chars`);
    console.log(`${"─".repeat(60)}`);

    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const messageQueue = [];
    const start = Date.now();

    try {
        const config = {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } } },
            outputAudioTranscription: {},
        };
        if (tools) {
            config.tools = [{ functionDeclarations: FAKE_TOOLS }];
        }

        const session = await ai.live.connect({
            model: `models/${MODEL}`,
            config,
            callbacks: {
                onopen: () => {},
                onmessage: (msg) => messageQueue.push(msg),
                onerror: (e) => console.error(`  WS Error: ${e?.message || e}`),
                onclose: () => {},
            },
        });

        session.sendClientContent({
            turns: [{ role: "user", parts: [{ text: fullPrompt }] }],
        });

        let transcriptText = "", modelText = "", audioChunks = 0, msgCount = 0, done = false;
        let toolCalls = [];
        const timeout = setTimeout(() => { done = true; }, 30000);

        const waitMsg = () => new Promise(resolve => {
            const check = () => {
                if (done) { resolve(null); return; }
                const msg = messageQueue.shift();
                if (msg) resolve(msg); else setTimeout(check, 50);
            };
            check();
        });

        while (!done) {
            const msg = await waitMsg();
            if (!msg) break;
            msgCount++;

            if (msg.serverContent?.modelTurn?.parts) {
                for (const part of msg.serverContent.modelTurn.parts) {
                    if (part.text) modelText += part.text;
                    if (part.inlineData) audioChunks++;
                }
            }
            if (msg.serverContent?.outputTranscription?.text) {
                transcriptText += msg.serverContent.outputTranscription.text;
            }
            // Detect tool calls
            if (msg.toolCall?.functionCalls) {
                for (const fc of msg.toolCall.functionCalls) {
                    toolCalls.push(fc.name);
                    console.log(`  🔧 TOOL CALL: ${fc.name}(${JSON.stringify(fc.args || {})})`);
                }
                // Respond with fake tool result so model can continue
                const functionResponses = msg.toolCall.functionCalls.map(fc => ({
                    id: fc.id,
                    name: fc.name,
                    response: { success: true, summary: "Tool executed (test mode)", data: { revenue: 425000, expenses: 280000, profit: 145000 } },
                }));
                session.sendToolResponse({ functionResponses });
            }
            if (msg.serverContent?.turnComplete) {
                done = true;
            }
        }

        // Drain
        let drainDeadline = Date.now() + 3000;
        while (Date.now() < drainDeadline) {
            const r = messageQueue.shift();
            if (!r) { await new Promise(res => setTimeout(res, 100)); continue; }
            if (r.serverContent?.outputTranscription?.text) {
                transcriptText += r.serverContent.outputTranscription.text;
                drainDeadline = Math.max(drainDeadline, Date.now() + 1000);
            }
            if (r.serverContent?.modelTurn?.parts) {
                for (const part of r.serverContent.modelTurn.parts) {
                    if (part.text) modelText += part.text;
                    if (part.inlineData) audioChunks++;
                }
            }
            if (r.toolCall?.functionCalls) {
                for (const fc of r.toolCall.functionCalls) {
                    toolCalls.push(fc.name);
                    console.log(`  🔧 TOOL CALL (drain): ${fc.name}`);
                }
            }
        }

        clearTimeout(timeout);
        session.close();

        const elapsed = Date.now() - start;
        const total = modelText.length + transcriptText.length;
        const ok = total > 0;
        const status = ok ? "✅" : "❌";

        console.log(`  ${status} ${elapsed}ms | ${msgCount} msgs | modelText=${modelText.length} | transcript=${transcriptText.length} | audio=${audioChunks} | toolCalls=[${toolCalls.join(",")}]`);
        if (total > 0) {
            const preview = (transcriptText || modelText).slice(0, 120).replace(/\n/g, " ");
            console.log(`  Response: "${preview}..."`);
        } else {
            console.log(`  ⚠ NO TEXT — 0 chars received`);
        }

        return { label, ok, total, elapsed, toolCalls, msgCount, audioChunks };
    } catch (err) {
        console.error(`  ✗ Error: ${err.message}`);
        return { label, ok: false, error: err.message };
    }
}

async function main() {
    console.log("╔══════════════════════════════════════════════════════════════════╗");
    console.log("║  ROOT CAUSE TEST — What makes the Live API return 0 chars?      ║");
    console.log("╚══════════════════════════════════════════════════════════════════╝");

    const results = [];

    // Test 1: Baseline — no tools, short prompt (should work)
    results.push(await runTest("Test 1: NO tools, SHORT prompt (baseline)", { tools: false, longPrompt: false }));
    await new Promise(r => setTimeout(r, 2000));

    // Test 2: With tools, short prompt
    results.push(await runTest("Test 2: WITH 29 tools, SHORT prompt", { tools: true, longPrompt: false }));
    await new Promise(r => setTimeout(r, 2000));

    // Test 3: No tools, long prompt
    results.push(await runTest("Test 3: NO tools, LONG prompt (~20KB)", { tools: false, longPrompt: true }));
    await new Promise(r => setTimeout(r, 2000));

    // Test 4: With tools + long prompt (exact production scenario)
    results.push(await runTest("Test 4: WITH 29 tools + LONG prompt (production)", { tools: true, longPrompt: true }));

    // Summary
    console.log(`\n${"═".repeat(66)}`);
    console.log("  ROOT CAUSE ANALYSIS");
    console.log("═".repeat(66));
    for (const r of results) {
        const status = r.ok ? "✅ GOT TEXT" : "❌ NO TEXT ";
        const tools = r.toolCalls?.length ? ` (called: ${r.toolCalls.join(",")})` : "";
        console.log(`  ${status}  ${r.label}${tools}`);
    }
    console.log("═".repeat(66));

    const t1 = results[0]?.ok, t2 = results[1]?.ok, t3 = results[2]?.ok, t4 = results[3]?.ok;
    if (t1 && t2 && t3 && !t4) console.log("\n  → CAUSE: COMBINATION of tools + long prompt");
    else if (t1 && !t2) console.log("\n  → CAUSE: TOOLS are the problem (even with short prompt)");
    else if (t1 && t2 && !t3) console.log("\n  → CAUSE: LONG PROMPT is the problem");
    else if (!t1) console.log("\n  → CAUSE: Live API is generally unreliable");
    else if (t1 && t2 && t3 && t4) console.log("\n  → All passed this time — issue is INTERMITTENT (race condition)");
    else console.log("\n  → Mixed results — likely intermittent + exacerbated by load");
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
