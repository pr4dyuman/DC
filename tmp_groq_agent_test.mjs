/**
 * End-to-end simulation of the handleOpenAICompatAgentMode logic
 * using the EXACT same tools and normalizer as the real code.
 * This will show the real error from Groq.
 */
const API_KEY = "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";
const BASE_URL = "https://api.groq.com/openai/v1";
const MODEL = "openai/gpt-oss-120b";

// Paste a representative subset of real Singularity tools (matching exact schemas)
const REAL_TOOLS = [
    {
        name: "search_agency",
        description: "Search the agency database for projects, clients, or employees by name or keyword.",
        parameters: {
            type: "OBJECT",
            properties: {
                query: { type: "STRING", description: "Search query" },
                searchType: { type: "STRING", enum: ["projects", "clients", "employees", "all"], description: "Type to search" },
            },
            required: ["query"],
        },
    },
    {
        name: "create_task",
        description: "Create a new task inside a project service. REQUIRE projectId and serviceId.",
        parameters: {
            type: "OBJECT",
            properties: {
                projectId: { type: "STRING" },
                serviceId: { type: "STRING" },
                title: { type: "STRING" },
                description: { type: "STRING" },
                priority: { type: "STRING", enum: ["low", "medium", "high"] },
                status: { type: "STRING", enum: ["To Do", "In Progress", "In Review", "Done"] },
                assignedTo: { type: "STRING" },
                dueDate: { type: "STRING" },
                estimatedHours: { type: "NUMBER" },
                subtasks: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            title: { type: "STRING" },
                            done: { type: "STRING" },
                        },
                        required: ["title"],
                    },
                },
            },
            required: ["projectId", "serviceId", "title"],
        },
    },
    {
        name: "bulk_create_tasks",
        description: "Create multiple tasks at once.",
        parameters: {
            type: "OBJECT",
            properties: {
                projectId: { type: "STRING" },
                serviceId: { type: "STRING" },
                tasks: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            title: { type: "STRING" },
                            priority: { type: "STRING", enum: ["low", "medium", "high"] },
                            status: { type: "STRING", enum: ["To Do", "In Progress", "Done"] },
                            estimatedHours: { type: "NUMBER" },
                        },
                        required: ["title"],
                    },
                },
            },
            required: ["projectId", "serviceId", "tasks"],
        },
    },
    {
        name: "get_project_tasks",
        description: "Get all tasks for a project, optionally filtered by service.",
        parameters: {
            type: "OBJECT",
            properties: {
                projectId: { type: "STRING" },
                serviceId: { type: "STRING" },
            },
            required: ["projectId"],
        },
    },
    {
        name: "update_task_status",
        description: "Update the status of a task.",
        parameters: {
            type: "OBJECT",
            properties: {
                taskId: { type: "STRING" },
                status: { type: "STRING", enum: ["To Do", "In Progress", "In Review", "Done"] },
            },
            required: ["taskId", "status"],
        },
    },
    {
        name: "create_project",
        description: "Create a new project.",
        parameters: {
            type: "OBJECT",
            properties: {
                name: { type: "STRING" },
                clientId: { type: "STRING" },
                budget: { type: "NUMBER" },
                startDate: { type: "STRING" },
                endDate: { type: "STRING" },
            },
            required: ["name"],
        },
    },
    {
        name: "add_transaction",
        description: "Add a financial transaction.",
        parameters: {
            type: "OBJECT",
            properties: {
                category: { type: "STRING", enum: ["Project", "Salary", "Tax", "Other"] },
                type: { type: "STRING", enum: ["income", "expense"] },
                amount: { type: "NUMBER" },
                date: { type: "STRING" },
                description: { type: "STRING" },
            },
            required: ["category", "type", "amount", "date", "description"],
        },
    },
];

function normalizeSchema(schema) {
    const result = {};
    for (const [k, v] of Object.entries(schema)) {
        if (k === "type" && typeof v === "string") {
            result[k] = v.toLowerCase();
        } else if (k === "properties" && v && typeof v === "object") {
            const props = {};
            for (const [pk, pv] of Object.entries(v)) {
                props[pk] = normalizeSchema(pv);
            }
            result[k] = props;
        } else if (k === "items" && v && typeof v === "object") {
            result[k] = normalizeSchema(v);
        } else {
            result[k] = v;
        }
    }
    return result;
}

const openAITools = REAL_TOOLS.map(tool => ({
    type: "function",
    function: {
        name: tool.name,
        description: tool.description,
        parameters: normalizeSchema(tool.parameters),
    },
}));

const systemInstruction = `You are Singularity Agent - an AI assistant for agency management.
Agency: Test Agency | Date: 2026-03-20`;

const userMessage = "Create a task called 'Fix bug' in project proj_001 service svc_001";

console.log(`Testing ${MODEL} in agent mode with ${REAL_TOOLS.length} tools...`);
console.log("Messages:", JSON.stringify([
    { role: "system", content: systemInstruction },
    { role: "user", content: userMessage },
], null, 2));

const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
        model: MODEL,
        messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: userMessage },
        ],
        tools: openAITools,
        tool_choice: "auto",
    }),
});

const text = await response.text();
console.log(`\nHTTP Status: ${response.status}`);

if (!response.ok) {
    console.error("ERROR RESPONSE:");
    console.error(text);
} else {
    const data = JSON.parse(text);
    const choice = data.choices?.[0];
    console.log("✅ finish_reason:", choice?.finish_reason);
    if (choice?.message?.content) console.log("content:", choice.message.content.slice(0, 200));
    if (choice?.message?.tool_calls?.length) {
        console.log("tool_calls:", JSON.stringify(choice.message.tool_calls, null, 2));
    }
}

// Also test with llama for comparison
console.log("\n\n--- Testing llama-3.3-70b-versatile for comparison ---");
const res2 = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: userMessage },
        ],
        tools: openAITools,
        tool_choice: "auto",
    }),
});
const text2 = await res2.text();
console.log(`HTTP Status: ${res2.status}`);
if (!res2.ok) {
    console.error("ERROR:", text2);
} else {
    const d2 = JSON.parse(text2);
    const c2 = d2.choices?.[0];
    console.log("✅ finish_reason:", c2?.finish_reason);
    if (c2?.message?.tool_calls?.length) {
        console.log("tool_calls:", JSON.stringify(c2.message.tool_calls[0], null, 2));
    }
}
