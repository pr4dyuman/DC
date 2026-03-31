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
        title: "Super-admin Generate Scope",
        description:
            "This route is now an honest scope page. Cross-agency draft generation is not implemented here yet, so super-admin work stays focused on agency configuration and readiness.",
        statusLabel: "Config-first",
        contextNote: selectedAgencyId
            ? "A selected agency is available, so the next valid step is to open its AI Blogger config and manage the generation stack there."
            : "No agency is selected right now. Choose an agency first before making AI Blogger generation decisions.",
        actions: [
            getPrimaryAgencyAction(selectedAgencyId),
            {
                href: "/super-admin/ai-blogger",
                label: "Back to Overview",
            },
        ],
        cards: [
            {
                title: "What Exists Today",
                items: [
                    "Per-agency AI Blogger configuration, readiness checks, provider keys, prompt controls, and refresh queue visibility are already supported.",
                    "Agency-side editors still use the real generation workflow in the AI Blogger dashboard.",
                ],
            },
            {
                title: "What Is Not Here Yet",
                items: [
                    "There is no cross-agency super-admin draft composer on this route.",
                    "There is no agency picker plus generation form combo here yet.",
                ],
            },
            {
                title: "Phase Decision",
                items: [
                    "Keep this route as a scope page until a true cross-agency generator is designed.",
                    "If product direction stays config-only, this route can be removed later without touching the agency dashboard workflow.",
                ],
            },
        ],
    };
}

export function getPostsRouteContent(selectedAgencyId?: string): RouteContent {
    return {
        title: "Super-admin Posts Scope",
        description:
            "This route is now explicit about scope. The platform super-admin area does not yet run a true cross-agency editorial queue, so this page points back to the supported agency-level control surface.",
        statusLabel: "Queue not implemented",
        contextNote: selectedAgencyId
            ? "A selected agency is available, but post operations still belong to the agency-side AI Blogger flow."
            : "Select an agency first if you want to review AI Blogger readiness or config before expanding this route.",
        actions: [
            getPrimaryAgencyAction(selectedAgencyId),
            {
                href: "/super-admin/ai-blogger",
                label: "Back to Overview",
            },
        ],
        cards: [
            {
                title: "What Exists Today",
                items: [
                    "The super-admin overview already shows agency-level published counts and refresh candidate summaries.",
                    "The agency config page already shows refresh queue readiness from stored Search Console data.",
                ],
            },
            {
                title: "What Is Missing",
                items: [
                    "There is no cross-agency posts list, filter set, or bulk operations workflow on this route.",
                    "There is no super-admin editor handoff for content updates, status changes, or publishing from here.",
                ],
            },
            {
                title: "Phase Decision",
                items: [
                    "Either build a real cross-agency queue here later or keep post operations on the agency side only.",
                    "Until then, this page prevents the old redirect-only dead route behavior.",
                ],
            },
        ],
    };
}

export function getPostDetailRouteContent(slug: string, selectedAgencyId?: string): RouteContent {
    return {
        title: "Super-admin Post Detail Scope",
        description:
            `The requested post detail route for "${slug}" is not a live cross-agency editor yet. This page keeps the route honest without pretending there is a working super-admin post editor behind it.`,
        statusLabel: "Editor not implemented",
        contextNote: selectedAgencyId
            ? "A selected agency is available, so the real next step is its AI Blogger config screen. Super-admin post editing still needs a dedicated design before it should exist here."
            : "No agency is selected right now. Cross-agency post detail is still a future scope decision.",
        actions: [
            getPrimaryAgencyAction(selectedAgencyId),
            {
                href: "/super-admin/ai-blogger/posts",
                label: "Open Posts Scope",
            },
        ],
        cards: [
            {
                title: "What Exists Today",
                items: [
                    "Agency-side post detail already covers SEO audit, cannibalization, grounded research, and performance loop workflows.",
                    "Super-admin currently governs configuration and readiness, not direct editorial operations.",
                ],
            },
            {
                title: "What Is Missing",
                items: [
                    "There is no secure cross-agency post loader, post editor form, or status controls on this route.",
                    "There is no super-admin publish or refresh-from-performance workflow here yet.",
                ],
            },
            {
                title: "Phase Decision",
                items: [
                    "Only implement this route after the product decides that super-admin should operate cross-agency content directly.",
                    "Until then, this page keeps routing clear and avoids the old redirect loop.",
                ],
            },
        ],
    };
}

export function getSettingsRouteContent(selectedAgencyId?: string): RouteContent {
    return {
        title: "Super-admin Settings Scope",
        description:
            "This route is now reserved for a future platform-level AI Blogger settings layer. The live settings workflow today is agency-specific and belongs inside each agency AI Blogger config screen.",
        statusLabel: "Agency-specific today",
        contextNote: selectedAgencyId
            ? "A selected agency is available, so the supported settings surface is its dedicated AI Blogger config page."
            : "No agency is selected. Pick an agency first to edit AI Blogger settings that are already live.",
        actions: [
            getPrimaryAgencyAction(selectedAgencyId),
            {
                href: "/super-admin/ai-blogger",
                label: "Back to Overview",
            },
        ],
        cards: [
            {
                title: "What Exists Today",
                items: [
                    "Agency-specific AI Blogger settings already include trends, SERP, grounded research, Search Console, page performance, image generation, prompts, and publish rules.",
                    "The agency-side settings page already handles editorial defaults and schedule creation.",
                ],
            },
            {
                title: "What Is Missing",
                items: [
                    "There is no separate platform-wide AI Blogger settings model on this route yet.",
                    "There is no shared inheritance UI for cross-agency AI Blogger settings here yet.",
                ],
            },
            {
                title: "Phase Decision",
                items: [
                    "Build this only if product needs a real platform-wide AI Blogger settings layer.",
                    "Otherwise, keep settings agency-specific and remove this route in a later cleanup phase.",
                ],
            },
        ],
    };
}
