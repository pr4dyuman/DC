"use client";

import {
    Globe,
    TrendingUp,
    Search,
    BookOpen,
    ShieldCheck,
    BarChart3,
    CheckCircle2,
    AlertTriangle,
} from "lucide-react";
import type { AIBloggerConfig } from "@/lib/types";
import type { AIConfig } from "@/lib/types";

interface ReviewPipelineOverviewProps {
    config: AIBloggerConfig;
    baseAiConfig?: AIConfig | null;
}

interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    status: "on" | "off" | "fallback" | "needs-key" | "needs-config";
    details?: string;
}

interface StrategySectionProps {
    title: string;
    items: string[];
}

function StatusBadge({ status }: { status: string }) {
    const configs = {
        on: { label: "ON", bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30" },
        off: { label: "OFF", bg: "bg-slate-500/20", text: "text-slate-400", border: "border-slate-500/30" },
        fallback: { label: "FALLBACK", bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
        "needs-key": { label: "NO KEY", bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" },
        "needs-config": { label: "NEEDS CONFIG", bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30" },
    };
    const config = configs[status as keyof typeof configs] || configs.off;
    return <span className={`rounded-full border ${config.border} ${config.bg} px-2.5 py-0.5 text-xs font-bold ${config.text}`}>
        {config.label}
    </span>;
}

function FeatureCard({ icon, title, description, status, details }: FeatureCardProps) {
    const borderColors = {
        on: "border-emerald-500/30",
        off: "border-slate-500/30",
        fallback: "border-blue-500/30",
        "needs-key": "border-amber-500/30",
        "needs-config": "border-red-500/30",
    };

    const bgColors = {
        on: "bg-emerald-500/5",
        off: "bg-slate-500/5",
        fallback: "bg-blue-500/5",
        "needs-key": "bg-amber-500/5",
        "needs-config": "bg-red-500/5",
    };

    return (
        <div className={`rounded-2xl border ${borderColors[status]} ${bgColors[status]} p-5`}>
            <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-background/50">
                            {icon}
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground">{title}</h3>
                            <p className="text-xs text-muted-foreground">{description}</p>
                        </div>
                    </div>
                    <StatusBadge status={status} />
                </div>
                {details && (
                    <div className="text-xs text-muted-foreground pl-13">
                        {details}
                    </div>
                )}
            </div>
        </div>
    );
}

function StrategySection({ title, items }: StrategySectionProps) {
    return (
        <div className="rounded-2xl border border-border bg-card p-5">
            <div className="space-y-4">
                <h3 className="font-semibold text-foreground">{title}</h3>
                <div className="space-y-2.5">
                    {items.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-3 text-sm">
                            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400 mt-0.5" />
                            <span className="text-foreground">{item}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function ReviewPipelineOverview({ config }: ReviewPipelineOverviewProps) {
    // Determine feature statuses
    const websiteCrawlStatus = config.crawl.enabled ? "on" : "off";
    const trendsStatus = config.trends.enabled
        ? config.trends.apiKey ? "on" : "needs-key"
        : config.trends.fallbackToAi ? "fallback" : "off";

    const serpStatus = config.serp.enabled
        ? config.serp.apiKey || config.trends.apiKey ? "on" : "needs-key"
        : "off";

    const groundedResearchStatus = config.groundedResearch.enabled
        ? config.serp.enabled ? "on" : "needs-config"
        : "off";

    const approvalGateStatus = config.publishRules.requireManualApproval ? "on" : "off";
    const pagePerformanceStatus = config.pagePerformance.enabled
        ? config.pagePerformance.apiKey ? "on" : "needs-key"
        : "off";

    const searchConsoleStatus = config.searchConsole.enabled
        ? config.searchConsole.authStatus === "configured" ? "on" : "needs-config"
        : "off";

    const imageGenStatus = config.imageGeneration.enabled
        ? config.imageGeneration.apiKey ? "on" : "needs-key"
        : "off";

    const aiReviewStatus = config.publishRules.aiReviewPolicy.enableFinalChecker
        ? config.publishRules.aiReviewPolicy.apiKey ? "on" : "needs-key"
        : "off";

    // Count active features
    const activeFeatures = [
        websiteCrawlStatus === "on",
        trendsStatus === "on",
        serpStatus === "on",
        groundedResearchStatus === "on",
        approvalGateStatus === "on",
        pagePerformanceStatus === "on",
        searchConsoleStatus === "on",
        imageGenStatus === "on",
        aiReviewStatus === "on",
    ].filter(Boolean).length;

    const seoPlanItems = [
        `${config.publishRules.minimumSeoScore} SEO score minimum`,
        config.publishRules.requireMetaDescription ? "Meta descriptions required" : "Meta descriptions optional",
        config.publishRules.requireInternalLinks ? "Internal links required" : "Internal links optional",
        config.publishRules.requireImageAltText ? "Image alt text required" : "Image alt text optional",
        config.publishRules.requireSchemaMarkup ? "Schema markup required" : "Schema markup optional",
        config.publishRules.requireCanonicalUrl ? "Canonical URLs enforced" : "Canonical URLs optional",
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">Review Pipeline Plan</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Complete AI Blogger generation and safety flow configuration
                        </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card/50 px-4 py-2">
                        <p className="text-xs font-medium text-muted-foreground">FEATURES ACTIVE</p>
                        <p className="text-2xl font-bold text-foreground">{activeFeatures}/9</p>
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                {/* Left Column: Active Generation Features */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">ACTIVE GENERATION FEATURES</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <FeatureCard
                            icon={<Globe className="h-5 w-5 text-foreground" />}
                            title="Website Intelligence"
                            description={`Crawls up to ${config.crawl.maxPages} pages and reuses snapshots for 24h.`}
                            status={websiteCrawlStatus}
                            details={`${config.crawl.maxPages} pages • ${config.crawl.timeoutMs}ms timeout`}
                        />

                        <FeatureCard
                            icon={<TrendingUp className="h-5 w-5 text-foreground" />}
                            title="Live Google Trends"
                            description="Scoring candidate topics with live Google Trends for US. AI fallback is ready."
                            status={trendsStatus}
                            details={trendsStatus === "needs-key" ? "Missing SerpAPI key" : undefined}
                        />

                        <FeatureCard
                            icon={<Search className="h-5 w-5 text-foreground" />}
                            title="SERP Analysis"
                            description="Snapshots Google results for US on desktop to capture intent, competitors, and PAA."
                            status={serpStatus}
                            details={serpStatus === "needs-key" ? "Missing SerpAPI key" : `${config.serp.maxCompetitors} competitors`}
                        />

                        <FeatureCard
                            icon={<BookOpen className="h-5 w-5 text-foreground" />}
                            title="Grounded Research"
                            description="Fetches small trusted source pack from ranking pages for grounded evidence."
                            status={groundedResearchStatus}
                            details={groundedResearchStatus === "needs-config" ? "Requires SERP enabled" : `${config.groundedResearch.maxSources} sources`}
                        />

                        <FeatureCard
                            icon={<ShieldCheck className="h-5 w-5 text-foreground" />}
                            title="Approval Gate"
                            description="Approval required before manual export handoff."
                            status={approvalGateStatus}
                            details="Final checkpoint before publishing"
                        />

                        <FeatureCard
                            icon={<BarChart3 className="h-5 w-5 text-foreground" />}
                            title="Page Performance Config"
                            description="Saved as pagespeed (both) with 75 threshold, 168h refresh window."
                            status={pagePerformanceStatus}
                            details={pagePerformanceStatus === "needs-key" ? "Missing PageSpeed API key" : `${config.pagePerformance.strategy} • ${config.pagePerformance.performanceThreshold} threshold`}
                        />
                    </div>

                    {/* Additional Features */}
                    <div className="pt-4 border-t border-border">
                        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-4">RESEARCH & SAFETY</h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FeatureCard
                                icon={<Globe className="h-5 w-5 text-foreground" />}
                                title="Search Console"
                                description="Real-time search performance and query data integration."
                                status={searchConsoleStatus}
                                details={searchConsoleStatus === "needs-config" ? "Needs authentication" : "Connected"}
                            />

                            <FeatureCard
                                icon={<TrendingUp className="h-5 w-5 text-foreground" />}
                                title="Featured Image Generation"
                                description="Auto-generate production-ready featured images."
                                status={imageGenStatus}
                                details={imageGenStatus === "needs-key" ? "Missing image API key" : config.imageGeneration.provider}
                            />

                            <FeatureCard
                                icon={<ShieldCheck className="h-5 w-5 text-foreground" />}
                                title="AI Final Review"
                                description="Flag weak business fit, tone mismatches, and claim validation."
                                status={aiReviewStatus}
                                details={aiReviewStatus === "off" ? "Manual review mode" : "AI review active"}
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column: Draft Strategy */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">DRAFT STRATEGY</h3>

                    <StrategySection
                        title="Topic Source"
                        items={["Website crawl + content inference from submitted URL"]}
                    />

                    <StrategySection
                        title="Audience & Tone"
                        items={[
                            "Audience: Agency owners, operators, marketing teams",
                            "Tone: Clear, practical, confident"
                        ]}
                    />

                    <StrategySection
                        title="Call-to-Action"
                        items={["Invite one clear next step without sounding pushy"]}
                    />

                    <StrategySection
                        title="SEO Rules"
                        items={seoPlanItems}
                    />

                    <StrategySection
                        title="Publish Flow"
                        items={[
                            "Approval required before manual",
                            "Export handoff to DC"
                        ]}
                    />

                    {/* Status Overview */}
                    <div className="pt-4 border-t border-border">
                        <div className="rounded-xl border border-border bg-card/50 p-4 space-y-3">
                            <h3 className="text-sm font-semibold text-foreground">Status Summary</h3>
                            <div className="space-y-2">
                                {config.publishRules.aiReviewPolicy.enableFinalChecker && config.publishRules.aiReviewPolicy.apiKey && (
                                    <div className="flex items-center gap-2 text-xs text-emerald-400">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        AI review configured
                                    </div>
                                )}
                                {config.publishRules.requireManualApproval && (
                                    <div className="flex items-center gap-2 text-xs text-emerald-400">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Manual approval required
                                    </div>
                                )}
                                {(config.trends.enabled || config.serp.enabled || config.groundedResearch.enabled) && (
                                    <div className="flex items-center gap-2 text-xs text-emerald-400">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Research stack active
                                    </div>
                                )}
                                {config.pagePerformance.enabled && (
                                    <div className="flex items-center gap-2 text-xs text-emerald-400">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Performance monitoring
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Warnings */}
            {(
                (config.trends.enabled && !config.trends.apiKey && !config.trends.fallbackToAi) ||
                (config.serp.enabled && !config.serp.apiKey && !config.trends.apiKey) ||
                (config.pagePerformance.enabled && !config.pagePerformance.apiKey)
            ) && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                    <div className="flex gap-3">
                        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-400 mt-0.5" />
                        <div>
                            <p className="font-semibold text-amber-300">Configuration Incomplete</p>
                            <p className="mt-1 text-sm text-amber-100/80">Some enabled features are missing API keys. Check the settings below to configure them.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
