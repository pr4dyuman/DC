import type {
    AIBloggerSuperAdminScopeAction,
    AIBloggerSuperAdminScopeCard,
} from "@/app/super-admin/ai-blogger/_components/ai-blogger-super-admin-scope-page";

type RouteContent = {
    title: string;
    description: string;
    statusLabel: string;
    contextNote?: string;
    actions: AIBloggerSuperAdminScopeAction[];
    cards: AIBloggerSuperAdminScopeCard[];
};

function getPrimaryAgencyAction(selectedAgencyId?: string): AIBloggerSuperAdminScopeAction {
    return selectedAgencyId
        ? {
            href: `/super-admin/ai-blogger/agency/${selectedAgencyId}`,
            label: "Open Selected Agency Config",
            variant: "primary",
        }
        : {
            href: "/super-admin/ai-blogger",
            label: "Choose Agency",
            variant: "primary",
        };
}

export function getGenerateRouteContent(selectedAgencyId?: string): RouteContent {
    return {
        title: "Agency Draft Generation",
        description:
            "Draft generation is managed inside each agency workspace so the right brand voice, targets, approval rules, and integrations are applied.",
        statusLabel: "Agency workspace",
        contextNote: selectedAgencyId
            ? "Open the selected agency to review its AI Blogger setup before starting or adjusting draft creation."
            : "Choose an agency to review its AI Blogger setup and continue with draft creation from the correct workspace.",
        actions: [
            getPrimaryAgencyAction(selectedAgencyId),
            {
                href: "/super-admin/ai-blogger",
                label: "Back to Overview",
            },
        ],
        cards: [
            {
                title: "Available Controls",
                items: [
                    "Review agency readiness, provider settings, prompt controls, and publishing rules before generation starts.",
                    "Use the agency workspace for draft creation so generated posts inherit the correct brand and approval settings.",
                ],
            },
            {
                title: "Recommended Flow",
                items: [
                    "Select the agency, confirm the content configuration, then open the agency AI Blogger workspace.",
                    "Keep draft creation tied to one agency at a time for safer publishing and clearer ownership.",
                ],
            },
            {
                title: "Why This Matters",
                items: [
                    "Agency-specific generation prevents drafts from using the wrong target, webhook, brand voice, or approval gate.",
                    "Super-admin remains focused on configuration quality, readiness, and governance.",
                ],
            },
        ],
    };
}

export function getPostsRouteContent(selectedAgencyId?: string): RouteContent {
    return {
        title: "Agency Content Queue",
        description:
            "Post review and publishing decisions belong inside the agency workspace where ownership, status, and publishing settings are clear.",
        statusLabel: "Agency workspace",
        contextNote: selectedAgencyId
            ? "Open the selected agency to inspect configuration and continue into its content queue."
            : "Select an agency first to inspect AI Blogger readiness and continue into its content queue.",
        actions: [
            getPrimaryAgencyAction(selectedAgencyId),
            {
                href: "/super-admin/ai-blogger",
                label: "Back to Overview",
            },
        ],
        cards: [
            {
                title: "Available Controls",
                items: [
                    "Review agency-level published counts, refresh candidates, Search Console readiness, and configuration health.",
                    "Open the agency workspace when direct editorial review, status changes, or publishing actions are needed.",
                ],
            },
            {
                title: "Recommended Flow",
                items: [
                    "Choose an agency, confirm configuration health, then review the posts from that agency's queue.",
                    "Keep cross-agency monitoring separate from hands-on editorial actions.",
                ],
            },
            {
                title: "Why This Matters",
                items: [
                    "Agency-specific queues reduce accidental publishing changes across clients.",
                    "Super-admin can still govern readiness without mixing editorial ownership between agencies.",
                ],
            },
        ],
    };
}

export function getPostDetailRouteContent(slug: string, selectedAgencyId?: string): RouteContent {
    return {
        title: "Agency Post Detail",
        description:
            `Post "${slug}" should be opened from its agency workspace so status, publishing target, and audit data stay tied to the correct client.`,
        statusLabel: "Agency workspace",
        contextNote: selectedAgencyId
            ? "Open the selected agency to continue with the correct post workflow."
            : "Select an agency before opening post-level editorial tools.",
        actions: [
            getPrimaryAgencyAction(selectedAgencyId),
            {
                href: "/super-admin/ai-blogger/posts",
                label: "Back to Posts",
            },
        ],
        cards: [
            {
                title: "Available Controls",
                items: [
                    "Agency post detail includes SEO audit, grounded research, internal links, performance context, and status controls.",
                    "Super-admin can review agency readiness before handing off to the agency editorial surface.",
                ],
            },
            {
                title: "Recommended Flow",
                items: [
                    "Select the agency that owns this post, then open the post from that agency's AI Blogger queue.",
                    "Use agency context for editing, approval, refresh, and publishing decisions.",
                ],
            },
            {
                title: "Why This Matters",
                items: [
                    "Post-level actions depend on agency-specific credentials, rules, and approval gates.",
                    "Keeping those actions in context prevents cross-client mistakes.",
                ],
            },
        ],
    };
}

export function getSettingsRouteContent(selectedAgencyId?: string): RouteContent {
    return {
        title: "Agency AI Blogger Settings",
        description:
            "AI Blogger settings are managed per agency so each client can keep its own trends, research, publishing, and automation rules.",
        statusLabel: "Agency workspace",
        contextNote: selectedAgencyId
            ? "Open the selected agency to manage its live AI Blogger configuration."
            : "Choose an agency to manage its live AI Blogger configuration.",
        actions: [
            getPrimaryAgencyAction(selectedAgencyId),
            {
                href: "/super-admin/ai-blogger",
                label: "Back to Overview",
            },
        ],
        cards: [
            {
                title: "Available Controls",
                items: [
                    "Manage trends, SERP analysis, grounded research, Search Console, page performance, image generation, prompts, and publish rules per agency.",
                    "Review readiness before teams generate, approve, or publish content.",
                ],
            },
            {
                title: "Recommended Flow",
                items: [
                    "Select an agency, review configuration health, then adjust the settings that apply to that agency.",
                    "Use global reporting for monitoring and agency settings for operational changes.",
                ],
            },
            {
                title: "Why This Matters",
                items: [
                    "Agency-specific settings keep credentials, defaults, and automation windows isolated.",
                    "This makes publishing safer while still giving super-admin a clear governance path.",
                ],
            },
        ],
    };
}
