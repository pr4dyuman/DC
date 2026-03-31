"use client";

import Link from "next/link";
import { AlertCircle, BookOpen, BarChart, TrendingUp } from "lucide-react";
import { AIBloggerGlassCard, AIBloggerSectionEyebrow } from "@/components/ai-blogger/AIBloggerPrimitives";
import { Badge } from "@/components/ui/badge";
import type { ClusterAnalysis, ContentCluster } from "@/lib/ai-blogger-cluster-analysis";
import { getClusterHealthLabel } from "@/lib/ai-blogger-cluster-analysis";

interface ClusterDashboardProps {
    analysis: ClusterAnalysis;
}

function formatCompactNumber(value: number) {
    return new Intl.NumberFormat("en", {
        notation: value >= 1000 ? "compact" : "standard",
        maximumFractionDigits: value >= 1000 ? 1 : 0,
    }).format(Math.round(value));
}

export function ClusterDashboard({ analysis }: ClusterDashboardProps) {
    const { clusters, orphanedPosts, totalClusters, coveragePercentage, totalPosts, averageClusterSize } = analysis;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="space-y-2">
                <AIBloggerSectionEyebrow>Content Clustering</AIBloggerSectionEyebrow>
                <div>
                    <h1 className="text-3xl font-bold">Cluster Overview</h1>
                    <p className="mt-2 text-muted-foreground">
                        Pillar posts with supporting content organized by topic clusters for better SEO authority.
                    </p>
                </div>
            </div>

            {/* Summary Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <AIBloggerGlassCard className="p-5">
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Total Clusters</p>
                    <p className="mt-3 text-3xl font-bold">{totalClusters}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Pillars + supporting posts
                    </p>
                </AIBloggerGlassCard>

                <AIBloggerGlassCard className="p-5">
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Coverage</p>
                    <p className="mt-3 text-3xl font-bold text-emerald-600 dark:text-emerald-300">
                        {coveragePercentage}%
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {totalPosts - orphanedPosts.length} of {totalPosts} posts
                    </p>
                </AIBloggerGlassCard>

                <AIBloggerGlassCard className="p-5">
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Avg Size</p>
                    <p className="mt-3 text-3xl font-bold">{averageClusterSize}</p>
                    <p className="mt-1 text-xs text-muted-foreground">posts per cluster</p>
                </AIBloggerGlassCard>

                <AIBloggerGlassCard className="p-5">
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Orphaned</p>
                    <p className="mt-3 text-3xl font-bold text-amber-600 dark:text-amber-300">
                        {orphanedPosts.length}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">need clustering</p>
                </AIBloggerGlassCard>
            </div>

            {/* Cluster Cards */}
            {clusters.length > 0 ? (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold">
                        {totalClusters} {totalClusters === 1 ? "Cluster" : "Clusters"}
                    </h2>

                    <div className="grid gap-4 lg:grid-cols-2">
                        {clusters.map((cluster) => (
                            <ClusterCard key={cluster.clusterId} cluster={cluster} />
                        ))}
                    </div>
                </div>
            ) : (
                <AIBloggerGlassCard className="rounded-[24px] border-dashed border-border/60 bg-background/40 px-6 py-12 text-center">
                    <div className="space-y-2">
                        <p className="text-base font-medium">No clusters yet</p>
                        <p className="text-sm text-muted-foreground">
                            Create pillar posts and assign related content to contentClusterId to build clusters.
                        </p>
                    </div>
                </AIBloggerGlassCard>
            )}

            {/* Orphaned Posts */}
            {orphanedPosts.length > 0 && (
                <AIBloggerGlassCard className="border-amber-500/30 bg-amber-500/5 p-5">
                    <div className="flex items-start gap-4">
                        <AlertCircle className="mt-1 h-5 w-5 text-amber-600 dark:text-amber-300" />
                        <div className="flex-1">
                            <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                                {orphanedPosts.length} Orphaned {orphanedPosts.length === 1 ? "Post" : "Posts"}
                            </h3>
                            <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                                These published posts aren&apos;t assigned to any cluster. Consider grouping them with related content for better SEO authority.
                            </p>
                            <div className="mt-4 space-y-2">
                                {orphanedPosts.slice(0, 5).map((post) => (
                                    <div key={post.id} className="text-sm">
                                        <Link
                                            href={`/dashboard/ai-blogger/posts/${post.slug}`}
                                            className="transition-colors hover:text-amber-700 dark:hover:text-amber-200"
                                        >
                                            {post.title}
                                        </Link>
                                    </div>
                                ))}
                                {orphanedPosts.length > 5 && (
                                    <p className="text-xs text-amber-700 dark:text-amber-300">
                                        +{orphanedPosts.length - 5} more orphaned posts
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </AIBloggerGlassCard>
            )}
        </div>
    );
}

interface ClusterCardProps {
    cluster: ContentCluster;
}

function ClusterCard({ cluster }: ClusterCardProps) {
    const healthLabel = getClusterHealthLabel(cluster.metrics.health);
    const totalPosts = cluster.metrics.totalPosts;
    const publishedPosts = cluster.metrics.publishedPosts;
    const coverage = totalPosts > 0 ? Math.round((publishedPosts / totalPosts) * 100) : 0;

    return (
        <AIBloggerGlassCard className={`border p-5 transition-colors hover:bg-background/50 ${healthLabel.color}`}>
            <div className="space-y-4">
                {/* Header */}
                <div>
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                            <Link
                                href={`/dashboard/ai-blogger/posts/${cluster.pillarSlug}`}
                                className="t text-lg font-semibold transition-colors hover:text-primary"
                            >
                                {cluster.pillarTitle}
                            </Link>
                            <p className="mt-1 text-xs text-muted-foreground">Pillar Post</p>
                        </div>
                        <Badge variant="outline" className={`rounded-full ${healthLabel.color}`}>
                            {healthLabel.label}
                        </Badge>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{healthLabel.description}</p>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-border/40 bg-background/50 px-2.5 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Posts</p>
                        <p className="mt-1 text-sm font-semibold">{totalPosts}</p>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-background/50 px-2.5 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Published</p>
                        <p className="mt-1 text-sm font-semibold">{publishedPosts}</p>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-background/50 px-2.5 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Coverage</p>
                        <p className="mt-1 text-sm font-semibold">{coverage}%</p>
                    </div>
                </div>

                {/* Expanded metrics */}
                <div className="border-t border-border/40 pt-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">Avg SEO:</span>
                            <span className="font-semibold">{cluster.metrics.avgSeoScore}/100</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">Words:</span>
                            <span className="font-semibold">{formatCompactNumber(cluster.metrics.totalWordCount)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <BarChart className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">Link Density:</span>
                            <span className="font-semibold">{cluster.metrics.internalLinkDensity.toFixed(1)}</span>
                        </div>
                    </div>
                </div>

                {/* Supporting posts */}
                {cluster.supportingPosts.length > 0 && (
                    <div className="border-t border-border/40 pt-3">
                        <p className="text-xs font-medium text-muted-foreground">
                            {cluster.supportingPosts.length} Supporting {cluster.supportingPosts.length === 1 ? "Post" : "Posts"}
                        </p>
                        <div className="mt-2 space-y-1">
                            {cluster.supportingPosts.slice(0, 3).map((post) => (
                                <Link
                                    key={post.id}
                                    href={`/dashboard/ai-blogger/posts/${post.slug}`}
                                    className="flex items-center justify-between text-xs transition-colors hover:text-primary"
                                >
                                    <span className="line-clamp-1">{post.title}</span>
                                    {post.seoScore && <span className="text-muted-foreground">{post.seoScore}/100</span>}
                                </Link>
                            ))}
                            {cluster.supportingPosts.length > 3 && (
                                <p className="text-xs text-muted-foreground">
                                    +{cluster.supportingPosts.length - 3} more
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AIBloggerGlassCard>
    );
}
