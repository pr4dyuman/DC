"use client";

import { useState } from "react";
import { Copy, Check, AlertCircle, Zap, Code2, X } from "lucide-react";
import { toast } from "sonner";
import { AIBloggerGlassCard } from "./AIBloggerPrimitives";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface WebhookDocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  webhookUrl?: string;
}

const codeExamples = {
  nodejs: `import { NextRequest, NextResponse } from "next/server";
import Blog from "@/models/Blog";
import dbConnect from "@/lib/db";

function getPresentedSecret(request: NextRequest) {
  const headerSecret = request.headers.get("x-ai-blogger-webhook-secret")?.trim() || "";
  const authorization = request.headers.get("authorization") || "";
  const bearerSecret = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  return headerSecret || bearerSecret;
}

function isAuthorized(request: NextRequest) {
  const expectedSecret = process.env.AI_BLOGGER_WEBHOOK_SECRET?.trim() || "";
  if (!expectedSecret) return false;

  return getPresentedSecret(request) === expectedSecret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    service: "AI Blogger Webhook Receiver",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    const { blog, source } = payload;

    if (!blog?.id || !blog?.slug || !blog?.title || !blog?.content) {
      return NextResponse.json({ error: "Invalid blog data" }, { status: 400 });
    }

    await dbConnect();

    const savedBlog = await Blog.findOneAndUpdate(
      { sourcePostId: blog.id },
      {
        sourcePostId: blog.id,
        slug: blog.slug,
        title: blog.title,
        content: blog.content,
        excerpt: blog.excerpt,
        metaTitle: blog.metaTitle,
        metaDescription: blog.metaDescription,
        metaKeywords: blog.metaKeywords || "",
        canonicalUrl: blog.canonicalUrl,
        category: blog.category || "AI Blogger",
        image: blog.image,
        imageAlt: blog.imageAlt,
        schemaMarkup: blog.schemaMarkup,
        faqItems: blog.faqItems || [],
        externalSources: blog.externalSources || [],
        peopleAlsoAsk: blog.peopleAlsoAsk || [],
        internalLinks: blog.internalLinks || [],
        contentClusterId: blog.contentClusterId,
        parentTopicSlug: blog.parentTopicSlug,
        targetKey: source?.targetKey,
        targetLabel: source?.targetLabel,
        targetWebsiteUrl: source?.targetWebsiteUrl,
        publishedAt: new Date(blog.publishedAt),
        status: "published",
      },
      { upsert: true, returnDocument: "after" }
    );

    return NextResponse.json(
      { success: true, message: "Blog saved", blogId: savedBlog._id },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Webhook Error]", error);
    return NextResponse.json({ error: "Failed to save blog" }, { status: 500 });
  }
}`,

  express: `const express = require("express");
const app = express();

app.use(express.json({ limit: "5mb" }));

function getPresentedSecret(req) {
  const headerSecret = (req.get("x-ai-blogger-webhook-secret") || "").trim();
  const authorization = req.get("authorization") || "";
  const bearerSecret = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  return headerSecret || bearerSecret;
}

function isAuthorized(req) {
  const expectedSecret = (process.env.AI_BLOGGER_WEBHOOK_SECRET || "").trim();
  return Boolean(expectedSecret) && getPresentedSecret(req) === expectedSecret;
}

app.get("/api/webhooks/blog-published", (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  res.json({
    success: true,
    service: "AI Blogger Webhook Receiver",
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/webhooks/blog-published", async (req, res) => {
  try {
    if (!isAuthorized(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { blog, source } = req.body;

    if (!blog?.id || !blog?.slug || !blog?.title || !blog?.content) {
      return res.status(400).json({ error: "Invalid blog data" });
    }

    const savedBlog = await Blog.findOneAndUpdate(
      { sourcePostId: blog.id },
      {
        sourcePostId: blog.id,
        slug: blog.slug,
        title: blog.title,
        content: blog.content,
        excerpt: blog.excerpt,
        metaTitle: blog.metaTitle,
        metaDescription: blog.metaDescription,
        metaKeywords: blog.metaKeywords || "",
        canonicalUrl: blog.canonicalUrl,
        category: blog.category || "AI Blogger",
        image: blog.image,
        imageAlt: blog.imageAlt,
        schemaMarkup: blog.schemaMarkup,
        faqItems: blog.faqItems || [],
        externalSources: blog.externalSources || [],
        peopleAlsoAsk: blog.peopleAlsoAsk || [],
        internalLinks: blog.internalLinks || [],
        contentClusterId: blog.contentClusterId,
        parentTopicSlug: blog.parentTopicSlug,
        targetKey: source?.targetKey,
        targetLabel: source?.targetLabel,
        targetWebsiteUrl: source?.targetWebsiteUrl,
        publishedAt: new Date(blog.publishedAt),
        status: "published",
      },
      { upsert: true, returnDocument: "after" }
    );

    res.json({ success: true, blogId: savedBlog._id });
  } catch (error) {
    console.error("[Webhook Error]", error);
    res.status(500).json({ error: "Failed to save blog" });
  }
});

app.listen(3000, () => {
  console.log("Webhook server running on port 3000");
});`,

  django: `from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import os
from .models import Blog

def get_presented_secret(request):
  header_secret = request.headers.get("x-ai-blogger-webhook-secret", "").strip()
  authorization = request.headers.get("authorization", "")
  bearer_secret = authorization.replace("Bearer ", "", 1).strip() if authorization.startswith("Bearer ") else ""
  return header_secret or bearer_secret

def is_authorized(request):
  expected_secret = os.environ.get("AI_BLOGGER_WEBHOOK_SECRET", "").strip()
  return bool(expected_secret) and get_presented_secret(request) == expected_secret

@csrf_exempt
@require_http_methods(["GET", "POST"])
def blog_webhook(request):
  if not is_authorized(request):
    return JsonResponse({"error": "Unauthorized"}, status=401)

  if request.method == "GET":
    return JsonResponse({
      "success": True,
      "service": "AI Blogger Webhook Receiver",
    })

  try:
    payload = json.loads(request.body)
    blog = payload.get("blog")
    source = payload.get("source", {})

    if not blog or not blog.get("id") or not blog.get("slug") or not blog.get("content"):
      return JsonResponse({"error": "Invalid blog data"}, status=400)

    blog_obj, created = Blog.objects.update_or_create(
      source_post_id=blog["id"],
      defaults={
        "slug": blog["slug"],
        "title": blog["title"],
        "content": blog["content"],
        "excerpt": blog.get("excerpt", ""),
        "meta_title": blog.get("metaTitle", ""),
        "meta_description": blog.get("metaDescription", ""),
        "meta_keywords": blog.get("metaKeywords", ""),
        "canonical_url": blog.get("canonicalUrl"),
        "category": blog.get("category", "AI Blogger"),
        "image": blog.get("image", ""),
        "image_alt": blog.get("imageAlt", ""),
        "schema_markup": blog.get("schemaMarkup"),
        "faq_items": blog.get("faqItems", []),
        "external_sources": blog.get("externalSources", []),
        "people_also_ask": blog.get("peopleAlsoAsk", []),
        "internal_links": blog.get("internalLinks", []),
        "content_cluster_id": blog.get("contentClusterId"),
        "parent_topic_slug": blog.get("parentTopicSlug"),
        "target_key": source.get("targetKey"),
        "target_label": source.get("targetLabel"),
        "target_website_url": source.get("targetWebsiteUrl"),
        "status": "published",
      }
    )

    return JsonResponse({"success": True, "blogId": str(blog_obj.id)})

  except Exception as error:
    print(f"[Webhook Error] {error}")
    return JsonResponse({"error": "Failed to save blog"}, status=500)`,

  laravel: `<?php

use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\Log;
use Illuminate\\Support\\Facades\\Route;

Route::match(['get', 'post'], '/api/webhooks/blog-published', function (Request $request) {
  $expectedSecret = trim(env('AI_BLOGGER_WEBHOOK_SECRET', ''));
  $headerSecret = trim($request->header('x-ai-blogger-webhook-secret', ''));
  $authorization = $request->header('authorization', '');
  $bearerSecret = str_starts_with($authorization, 'Bearer ')
    ? trim(substr($authorization, 7))
    : '';

  if (!$expectedSecret || ($headerSecret ?: $bearerSecret) !== $expectedSecret) {
    return response()->json(['error' => 'Unauthorized'], 401);
  }

  if ($request->isMethod('get')) {
    return response()->json([
      'success' => true,
      'service' => 'AI Blogger Webhook Receiver',
    ]);
  }

  try {
    $payload = $request->json()->all();
    $blog = $payload['blog'] ?? null;
    $source = $payload['source'] ?? [];

    if (!$blog || empty($blog['id']) || empty($blog['slug']) || empty($blog['content'])) {
      return response()->json(['error' => 'Invalid blog data'], 400);
    }

    $blogModel = Blog::updateOrCreate(
      ['source_post_id' => $blog['id']],
      [
        'slug' => $blog['slug'],
        'title' => $blog['title'],
        'content' => $blog['content'],
        'excerpt' => $blog['excerpt'] ?? '',
        'meta_title' => $blog['metaTitle'] ?? '',
        'meta_description' => $blog['metaDescription'] ?? '',
        'meta_keywords' => $blog['metaKeywords'] ?? '',
        'canonical_url' => $blog['canonicalUrl'] ?? null,
        'category' => $blog['category'] ?? 'AI Blogger',
        'image' => $blog['image'] ?? '',
        'image_alt' => $blog['imageAlt'] ?? '',
        'schema_markup' => $blog['schemaMarkup'] ?? null,
        'faq_items' => $blog['faqItems'] ?? [],
        'external_sources' => $blog['externalSources'] ?? [],
        'people_also_ask' => $blog['peopleAlsoAsk'] ?? [],
        'internal_links' => $blog['internalLinks'] ?? [],
        'content_cluster_id' => $blog['contentClusterId'] ?? null,
        'parent_topic_slug' => $blog['parentTopicSlug'] ?? null,
        'target_key' => $source['targetKey'] ?? null,
        'target_label' => $source['targetLabel'] ?? null,
        'target_website_url' => $source['targetWebsiteUrl'] ?? null,
        'status' => 'published',
      ]
    );

    return response()->json([
      'success' => true,
      'blogId' => $blogModel->id
    ]);

  } catch (Exception $error) {
    Log::error('[Webhook Error] ' . $error->getMessage());
    return response()->json(['error' => 'Failed to save blog'], 500);
  }
});
?>`,
};

const payloadExample = {
  event: "blog.published",
  blog: {
    id: "blog-567",
    title: "Complete Guide to SEO in 2026",
    slug: "complete-guide-seo-2026",
    content: "<h1>Complete Guide...</h1><p>Content here...</p>",
    excerpt: "Learn the best SEO practices...",
    metaKeywords: "SEO, search engine optimization, SEO guide 2026",
    metaTitle: "Complete Guide to SEO 2026",
    metaDescription: "Master modern SEO with comprehensive guide...",
    canonicalUrl: "https://yoursite.com/blog/complete-guide-seo-2026",
    image: "https://cdn.example.com/images/seo-guide.jpg",
    imageAlt: "SEO optimization checklist",
    schemaMarkup: '{"@context": "https://schema.org", "@type": "BlogPosting"...}',
    category: "SEO",
    externalSources: [
      {
        id: "source-1",
        title: "Google Search Central",
        url: "https://developers.google.com/search/docs",
        domain: "developers.google.com",
        summary: "Official guidance used while drafting.",
        type: "official",
        freshness: "current",
        trustLevel: "high",
      },
    ],
    faqItems: [
      {
        question: "What is SEO?",
        answer: "SEO (Search Engine Optimization) is the practice of improving...",
      },
      {
        question: "How long does SEO take?",
        answer: "SEO is a long-term strategy that typically takes 3-6 months...",
      },
    ],
    peopleAlsoAsk: [
      "What are the best SEO tools?",
      "How to do keyword research?",
    ],
    internalLinks: [
      {
        href: "/blog/keyword-research",
        title: "Keyword Research Guide",
        anchorText: "keyword research",
        source: "blog",
        relationType: "cluster-supporting",
        score: 85,
      },
    ],
    contentClusterId: "cluster-seo",
    parentTopicSlug: "seo-pillar",
    publishedAt: "2026-03-30T14:23:45Z",
  },
  source: {
    agencyId: "agency-123",
    agencyName: "Your Agency",
    publishedAt: "2026-03-30T14:23:45Z",
    targetKey: "client-site-main",
    targetLabel: "Client Site Main",
    targetWebsiteUrl: "https://yoursite.com",
  },
};

const headersExample = {
  "Content-Type": "application/json",
  "X-Webhook-Event": "blog.published",
  "X-Webhook-Timestamp": "2026-03-30T14:23:45.000Z",
  "X-AI-Blogger-Webhook-Secret": "your-shared-secret",
  Authorization: "Bearer your-shared-secret",
  "X-AI-Blogger-Agency-Id": "agency-123",
  "X-AI-Blogger-Target-Key": "client-site-main",
};

const healthCheckHeadersExample = {
  "Content-Type": "application/json",
  "X-Webhook-Event": "webhook.healthcheck",
  "X-Webhook-Timestamp": "2026-03-30T14:20:00.000Z",
  "X-AI-Blogger-Test": "healthcheck",
  "X-AI-Blogger-Webhook-Secret": "your-shared-secret",
  Authorization: "Bearer your-shared-secret",
  "X-AI-Blogger-Agency-Id": "agency-123",
};

const faqItems = [
  {
    question: "What is a webhook?",
    answer:
      "A webhook is an HTTP POST request we send when a blog is published. Your endpoint receives the blog data and saves it to your database.",
  },
  {
    question: "What should my endpoint return?",
    answer:
      'Your endpoint should return any 2xx status, usually HTTP 200, with JSON like {"success": true}. Retryable failures include timeouts, 408, 409, 425, 429, and 5xx responses.',
  },
  {
    question: "How many retries if it fails?",
    answer:
      "We retry failed webhook delivery automatically based on your retry setting. If delivery still fails, fix the receiver and publish again from the post workflow.",
  },
  {
    question: "What if I need to add authentication?",
    answer:
      "Set the same shared webhook secret in AI Blogger and on your website. We send it in both x-ai-blogger-webhook-secret and Authorization: Bearer headers.",
  },
  {
    question: "Can I test the webhook?",
    answer:
      "Yes. The Test Webhook button sends an authenticated GET health check to the same URL, with no blog payload, so your endpoint should support GET and POST.",
  },
  {
    question: "What if one agency publishes to multiple websites?",
    answer:
      "Each website connection has its own webhook URL, secret, and website URL. On publish, the selected website is sent in source.targetKey, source.targetLabel, source.targetWebsiteUrl, and the x-ai-blogger-target-key header.",
  },
  {
    question: "How do I know if webhooks are working?",
    answer:
      "Check the Publishing tab in Settings for the latest saved delivery result, and check the post workflow panel for any failed delivery error on that draft.",
  },
];

function CodeBlock({
  code,
  language,
}: {
  code: string;
  language: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-lg border border-border/40 bg-black/80 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-black/50">
        <span className="text-xs font-semibold text-primary uppercase tracking-widest">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-2 py-1 rounded border border-border/40 bg-background/20 hover:bg-background/40 transition-colors text-xs"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-500" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm text-muted-foreground font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function WebhookDocumentationModal({
  isOpen,
  onClose,
  webhookUrl,
}: WebhookDocumentationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <AIBloggerGlassCard className="w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8 sticky top-0 bg-inherit pb-4 border-b border-border/40">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Code2 className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold">Webhook Integration</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Set up your endpoint to receive published blogs in real time
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background/50 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* What is Webhook */}
          <section>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              How Webhooks Work
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              When you publish a blog, we send it to the selected website
              connection as an HTTP POST request. Your server receives the
              rendered blog data, saves it to your database, and returns a 2xx
              response.
            </p>
            <div className="bg-background/40 rounded-lg p-4 text-sm space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-primary font-semibold">1.</span>
                <span>You publish a blog in AI Blogger</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary font-semibold">2.</span>
                <span>We send HTTP POST to the selected website webhook URL</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary font-semibold">3.</span>
                <span>Your endpoint saves blog to database</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary font-semibold">4.</span>
                <span>Blog appears on your website automatically</span>
              </div>
            </div>
          </section>

          {/* Headers Reference */}
          <section>
            <h3 className="text-lg font-semibold mb-4">Request Headers</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Publish requests include these headers. If a shared secret is configured,
              verify either the secret header or the bearer token.
            </p>
            <CodeBlock
              code={JSON.stringify(headersExample, null, 2)}
              language="json"
            />
            <div className="mt-4 rounded-lg border border-border/40 bg-background/40 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Health check request</p>
              <p className="mt-1">
                The Test Webhook button sends a GET request to the same URL with
                no body. Your endpoint should return any 2xx response.
              </p>
              <div className="mt-3">
                <CodeBlock
                  code={JSON.stringify(healthCheckHeadersExample, null, 2)}
                  language="json"
                />
              </div>
            </div>
          </section>

          {/* Payload Reference */}
          <section>
            <h3 className="text-lg font-semibold mb-4">Webhook Payload</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Here&apos;s what we send in the POST body when a blog is published:
            </p>
            <CodeBlock
              code={JSON.stringify(payloadExample, null, 2)}
              language="json"
            />
          </section>

          {/* Setup Guide */}
          <section>
            <h3 className="text-lg font-semibold mb-4">Setup Guide</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Choose your framework and copy the code:
            </p>
            {webhookUrl ? (
              <div className="mb-4 rounded-lg border border-border/40 bg-background/40 p-4 text-sm">
                <p className="font-medium text-foreground">Current configured URL</p>
                <code className="mt-2 block break-all rounded bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                  {webhookUrl}
                </code>
              </div>
            ) : null}

            <Tabs defaultValue="nodejs" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-background/40 p-1 rounded-lg">
                <TabsTrigger value="nodejs" className="text-xs">
                  Next.js
                </TabsTrigger>
                <TabsTrigger value="express" className="text-xs">
                  Express
                </TabsTrigger>
                <TabsTrigger value="django" className="text-xs">
                  Django
                </TabsTrigger>
                <TabsTrigger value="laravel" className="text-xs">
                  Laravel
                </TabsTrigger>
              </TabsList>

              <div className="mt-4 space-y-4">
                <TabsContent value="nodejs" className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Create file:{" "}
                    <code className="bg-background/40 px-2 py-1 rounded text-xs">
                      app/api/webhooks/blog-published/route.ts
                    </code>
                  </p>
                  <CodeBlock code={codeExamples.nodejs} language="typescript" />
                </TabsContent>

                <TabsContent value="express" className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Add this route to your Express app:
                  </p>
                  <CodeBlock code={codeExamples.express} language="javascript" />
                </TabsContent>

                <TabsContent value="django" className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Add this view to your Django app:
                  </p>
                  <CodeBlock code={codeExamples.django} language="python" />
                </TabsContent>

                <TabsContent value="laravel" className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Add this route to your Laravel routes file:
                  </p>
                  <CodeBlock code={codeExamples.laravel} language="php" />
                </TabsContent>
              </div>
            </Tabs>
          </section>

          {/* Setup Steps */}
          <section>
            <h3 className="text-lg font-semibold mb-4">Configuration Steps</h3>
            <div className="space-y-3">
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
                  1
                </div>
                <div>
                  <p className="font-medium">Deploy your endpoint</p>
                  <p className="text-sm text-muted-foreground">
                    Make sure it&apos;s publicly accessible and returns a 2xx
                    response for both health checks and publish requests.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
                  2
                </div>
                <div>
                  <p className="font-medium">Enter webhook URL in settings</p>
                  <p className="text-sm text-muted-foreground">
                    Must be HTTPS (secure). Example:{" "}
                    <code className="bg-background/40 px-2 py-0.5 rounded text-xs">
                      https://your-site.com/api/webhooks/blog-published
                    </code>
                  </p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
                  3
                </div>
                <div>
                  <p className="font-medium">Click &quot;Test Webhook&quot;</p>
                  <p className="text-sm text-muted-foreground">
                    We&apos;ll send an authenticated GET health check. It should
                    verify your secret and return a 2xx response without creating content.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
                  4
                </div>
                <div>
                  <p className="font-medium">Publish a blog</p>
                  <p className="text-sm text-muted-foreground">
                    If multiple websites are connected, choose the publish website
                    in the post workflow before publishing.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Response Codes */}
          <section>
            <h3 className="text-lg font-semibold mb-4">Expected Response</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your endpoint should return:
            </p>
            <CodeBlock
              code={JSON.stringify(
                { success: true, message: "Blog saved" },
                null,
                2
              )}
              language="json"
            />
            <p className="text-sm text-muted-foreground mt-4">
              <strong>Status Code:</strong> HTTP 200 (any 2xx is accepted)
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              For conflicts, return HTTP 409. For temporary failures, return 5xx
              so AI Blogger can retry based on your retry settings.
            </p>
          </section>

          {/* Troubleshooting */}
          <section>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Common Issues
            </h3>
            <div className="space-y-4">
              {faqItems.map((item, idx) => (
                <div
                  key={idx}
                  className="border border-border/40 rounded-lg p-4 hover:bg-background/40 transition-colors"
                >
                  <p className="font-medium text-sm mb-2">{item.question}</p>
                  <p className="text-sm text-muted-foreground">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-border/40">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </div>
      </AIBloggerGlassCard>
    </div>
  );
}
