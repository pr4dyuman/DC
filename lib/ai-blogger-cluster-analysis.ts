/**
 * AI Blogger Cluster Analysis & Visualization
 * Builds cluster structure for pillar/supporting post relationships
 */

import type { BlogStudioPost } from "./types-ai-blogger";

export type ClusterPost = {
    id: string;
    slug: string;
    title: string;
    publishedEntrySlug?: string;
    status: string;
    publishedAt?: string;
    wordCount?: number;
    seoScore?: number;
    internalLinkCount: number;
    isParent: boolean;
};

export type ClusterHealth = "strong" | "developing" | "weak" | "orphaned";

export type ClusterMetrics = {
    totalPosts: number;
    publishedPosts: number;
    hasPillarPost: boolean;
    pillarPublished: boolean;
    avgSeoScore: number;
    totalWordCount: number;
    internalLinkDensity: number;
    health: ClusterHealth;
};

export type ContentCluster = {
    clusterId: string;
    pillarSlug: string;
    pillarTitle: string;
    pillarPost?: ClusterPost;
    supportingPosts: ClusterPost[];
    metrics: ClusterMetrics;
};

export type ClusterAnalysis = {
    clusters: ContentCluster[];
    orphanedPosts: ClusterPost[];
    totalClusters: number;
    coveragePercentage: number;
    totalPosts: number;
    averageClusterSize: number;
    analyzedAt: string;
};

/**
 * Analyzes cluster structure from all posts
 */
export function analyzeBlogStudioClusters(posts: BlogStudioPost[]): ClusterAnalysis {
    const now = new Date().toISOString();
    const publishedPosts = posts.filter((p) => p.status === "Published");

    if (publishedPosts.length === 0) {
        return {
            clusters: [],
            orphanedPosts: [],
            totalClusters: 0,
            coveragePercentage: 0,
            totalPosts: 0,
            averageClusterSize: 0,
            analyzedAt: now,
        };
    }

    // Group posts by clusterId
    const clusterMap = new Map<string, BlogStudioPost[]>();

    publishedPosts.forEach((post) => {
        const clusterId = post.contentClusterId || "orphaned";
        if (!clusterMap.has(clusterId)) {
            clusterMap.set(clusterId, []);
        }
        clusterMap.get(clusterId)!.push(post);
    });

    // Build cluster objects
    const clusters: ContentCluster[] = [];
    const orphanedPosts: ClusterPost[] = [];

    clusterMap.forEach((postsInCluster, clusterId) => {
        if (clusterId === "orphaned") {
            // Handle orphaned posts (no contentClusterId)
            postsInCluster.forEach((post) => {
                orphanedPosts.push(buildClusterPost(post));
            });
            return;
        }

        // Find the pillar post (matches parentTopicSlug)
        const parentTopicSlug = postsInCluster[0]?.parentTopicSlug;
        const pillarPost = parentTopicSlug
            ? postsInCluster.find((p) => p.slug === parentTopicSlug)
            : null;

        const supportingPosts = postsInCluster.filter((p) => p.id !== pillarPost?.id);

        const clusterMetrics = calculateClusterMetrics(
            pillarPost || null,
            postsInCluster,
            supportingPosts
        );

        clusters.push({
            clusterId,
            pillarSlug: pillarPost?.slug || parentTopicSlug || "unknown",
            pillarTitle: pillarPost?.title || "Unnamed Pillar",
            pillarPost: pillarPost ? buildClusterPost(pillarPost) : undefined,
            supportingPosts: supportingPosts.map(buildClusterPost),
            metrics: clusterMetrics,
        });
    });

    // Calculate summary metrics
    const clusteredPostCount = clusters.reduce((sum, c) => sum + c.metrics.totalPosts, 0);
    const coveragePercentage =
        publishedPosts.length > 0 ? Math.round((clusteredPostCount / publishedPosts.length) * 100) : 0;
    const averageClusterSize = clusters.length > 0 ? Math.round(clusteredPostCount / clusters.length) : 0;

    // Sort clusters by health
    clusters.sort((a, b) => {
        const healthOrder = { strong: 0, developing: 1, weak: 2, orphaned: 3 };
        return healthOrder[a.metrics.health] - healthOrder[b.metrics.health];
    });

    return {
        clusters,
        orphanedPosts: orphanedPosts.sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || "")),
        totalClusters: clusters.length,
        coveragePercentage,
        totalPosts: publishedPosts.length,
        averageClusterSize,
        analyzedAt: now,
    };
}

/**
 * Converts a BlogStudioPost to ClusterPost
 */
function buildClusterPost(post: BlogStudioPost): ClusterPost {
    return {
        id: post.id,
        slug: post.slug,
        title: post.title,
        publishedEntrySlug: post.publishedEntrySlug,
        status: post.status,
        publishedAt: post.publishedAt,
        wordCount: post.wordCount,
        seoScore: post.seoScore,
        internalLinkCount: post.internalLinks?.length || 0,
        isParent: false,
    };
}

/**
 * Calculates health metrics for a cluster
 */
function calculateClusterMetrics(
    pillarPost: BlogStudioPost | null,
    allPosts: BlogStudioPost[],
    supportingPosts: BlogStudioPost[]
): ClusterMetrics {
    const publishedCount = allPosts.filter((p) => p.status === "Published").length;
    const seoScores = allPosts.map((p) => p.seoScore || 0).filter((s) => s > 0);
    const avgSeoScore = seoScores.length > 0 ? Math.round(seoScores.reduce((a, b) => a + b) / seoScores.length) : 0;
    const totalWordCount = allPosts.reduce((sum, p) => sum + (p.wordCount || 0), 0);
    const totalInternalLinks = allPosts.reduce((sum, p) => sum + (p.internalLinks?.length || 0), 0);
    const internalLinkDensity = allPosts.length > 0 ? totalInternalLinks / allPosts.length : 0;
    void supportingPosts;

    // Determine health
    let health: ClusterHealth = "weak";

    if (pillarPost && publishedCount >= 3) {
        if (avgSeoScore >= 75 && totalWordCount >= 15000) {
            health = "strong";
        } else if (avgSeoScore >= 60 && totalWordCount >= 10000) {
            health = "developing";
        }
    } else if (pillarPost && publishedCount >= 1) {
        health = "developing";
    }

    if (!pillarPost) {
        health = "orphaned";
    }

    return {
        totalPosts: allPosts.length,
        publishedPosts: publishedCount,
        hasPillarPost: !!pillarPost,
        pillarPublished: pillarPost?.status === "Published",
        avgSeoScore,
        totalWordCount,
        internalLinkDensity: Math.round(internalLinkDensity * 100) / 100,
        health,
    };
}

/**
 * Get health status label and color
 */
export function getClusterHealthLabel(health: ClusterHealth): {
    label: string;
    description: string;
    color: string;
} {
    switch (health) {
        case "strong":
            return {
                label: "Strong Cluster",
                description: "3+ posts, good SEO, substantial wordcount",
                color: "text-emerald-600 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
            };
        case "developing":
            return {
                label: "Developing",
                description: "1-2 posts or needs optimization",
                color: "text-blue-600 dark:text-blue-300 bg-blue-500/10 border-blue-500/20",
            };
        case "weak":
            return {
                label: "Weak Cluster",
                description: "Poor metrics, needs support",
                color: "text-amber-600 dark:text-amber-300 bg-amber-500/10 border-amber-500/20",
            };
        case "orphaned":
            return {
                label: "Orphaned",
                description: "No cluster assigned",
                color: "text-gray-600 dark:text-gray-300 bg-gray-500/10 border-gray-500/20",
            };
    }
}
