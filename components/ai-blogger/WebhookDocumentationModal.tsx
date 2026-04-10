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

function isAuthorized(request: NextRequest) {
  const expectedSecret = process.env.AI_BLOGGER_WEBHOOK_SECRET?.trim() || "";
  if (!expectedSecret) return true;

  const receivedSecret = request.headers.get("x-ai-blogger-webhook-secret")?.trim() || "";
  return receivedSecret === expectedSecret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    message: "Webhook reachable",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = await request.json();
    const { blog, source } = payload;

    // Validate
    if (!blog?.slug) {
      return NextResponse.json(
        { error: "Invalid blog data" },
        { status: 400 }
      );
    }

    // Connect & save
    await dbConnect();
    await Blog.findOneAndUpdate(
      { slug: blog.slug },
      {
        title: blog.title,
        content: blog.content,
        excerpt: blog.excerpt,
        metaTitle: blog.metaTitle,
        metaDescription: blog.metaDescription,
        metaKeywords: blog.metaKeywords,
        canonicalUrl: blog.canonicalUrl,
        category: blog.category,
        image: blog.image,
        imageAlt: blog.imageAlt,
        schemaMarkup: blog.schemaMarkup,
        faqItems: blog.faqItems,
        peopleAlsoAsk: blog.peopleAlsoAsk,
        internalLinks: blog.internalLinks,
        contentClusterId: blog.contentClusterId,
        parentTopicSlug: blog.parentTopicSlug,
        publishedAt: new Date(blog.publishedAt),
        status: "published",
      },
      { upsert: true, returnDocument: 'after' }
    );

    return NextResponse.json(
      { success: true, message: "Blog saved" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Webhook Error]", error);
    return NextResponse.json(
      { error: "Failed to save blog" },
      { status: 500 }
    );
  }
}`,

  express: `const express = require("express");
const app = express();

app.use(express.json());

app.post("/api/webhooks/blog-published", async (req, res) => {
  try {
    const { blog, source } = req.body;

    // Validate
    if (!blog?.slug) {
      return res.status(400).json({ error: "Invalid blog data" });
    }

    // Save to database
    const savedBlog = await Blog.findOneAndUpdate(
      { slug: blog.slug },
      {
        title: blog.title,
        content: blog.content,
        excerpt: blog.excerpt,
        metaTitle: blog.metaTitle,
        metaDescription: blog.metaDescription,
        metaKeywords: blog.metaKeywords,
        canonicalUrl: blog.canonicalUrl,
        category: blog.category,
        image: blog.image,
        imageAlt: blog.imageAlt,
        schemaMarkup: blog.schemaMarkup,
        faqItems: blog.faqItems,
        peopleAlsoAsk: blog.peopleAlsoAsk,
        internalLinks: blog.internalLinks,
        contentClusterId: blog.contentClusterId,
        publishedAt: new Date(blog.publishedAt),
        status: "published",
      },
      { upsert: true, returnDocument: 'after' }
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
from django.views.decorators.http import require_http_methods
import json
from .models import Blog

@require_http_methods(["POST"])
def blog_webhook(request):
  try:
    payload = json.loads(request.body)
    blog = payload.get("blog")
    source = payload.get("source")

    # Validate
    if not blog or not blog.get("slug"):
      return JsonResponse(
        {"error": "Invalid blog data"},
        status=400
      )

    # Save to database
    blog_obj, created = Blog.objects.update_or_create(
      slug=blog["slug"],
      defaults={
        "title": blog["title"],
        "content": blog["content"],
        "excerpt": blog.get("excerpt", ""),
        "meta_title": blog["metaTitle"],
        "meta_description": blog["metaDescription"],
        "meta_keywords": blog.get("metaKeywords", ""),
        "canonical_url": blog.get("canonicalUrl"),
        "category": blog.get("category", ""),
        "image": blog.get("image", ""),
        "image_alt": blog.get("imageAlt", ""),
        "schema_markup": blog.get("schemaMarkup"),
        "faq_items": blog.get("faqItems", []),
        "people_also_ask": blog.get("peopleAlsoAsk", []),
        "internal_links": blog.get("internalLinks", []),
        "content_cluster_id": blog.get("contentClusterId"),
        "parent_topic_slug": blog.get("parentTopicSlug"),
        "status": "published",
      }
    )

    return JsonResponse({
      "success": True,
      "blogId": str(blog_obj.id)
    })

  except Exception as error:
    print(f"[Webhook Error] {error}")
    return JsonResponse(
      {"error": "Failed to save blog"},
      status=500
    )`,

  laravel: `<?php

Route::post('/api/webhooks/blog-published', function (Request $request) {
  try {
    $payload = $request->json();
    $blog = $payload['blog'];
    $source = $payload['source'];

    // Validate
    if (!$blog || !isset($blog['slug'])) {
      return response()->json(
        ['error' => 'Invalid blog data'],
        400
      );
    }

    // Save to database
    $blogModel = Blog::updateOrCreate(
      ['slug' => $blog['slug']],
      [
        'title' => $blog['title'],
        'content' => $blog['content'],
        'excerpt' => $blog['excerpt'] ?? '',
        'meta_title' => $blog['metaTitle'],
        'meta_description' => $blog['metaDescription'],
        'meta_keywords' => $blog['metaKeywords'] ?? '',
        'canonical_url' => $blog['canonicalUrl'] ?? null,
        'category' => $blog['category'] ?? '',
        'image' => $blog['image'] ?? '',
        'image_alt' => $blog['imageAlt'] ?? '',
        'schema_markup' => $blog['schemaMarkup'] ?? null,
        'faq_items' => $blog['faqItems'] ?? [],
        'people_also_ask' => $blog['peopleAlsoAsk'] ?? [],
        'internal_links' => $blog['internalLinks'] ?? [],
        'content_cluster_id' => $blog['contentClusterId'] ?? null,
        'parent_topic_slug' => $blog['parentTopicSlug'] ?? null,
        'status' => 'published',
      ]
    );

    return response()->json([
      'success' => true,
      'blogId' => $blogModel->id
    ]);

  } catch (Exception $error) {
    Log::error('[Webhook Error] ' . $error->getMessage());
    return response()->json(
      ['error' => 'Failed to save blog'],
      500
    );
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
  },
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
      'Your endpoint should return HTTP 200 status with JSON: {"success": true}. Any non-200 status will trigger automatic retries.',
  },
  {
    question: "How many retries if it fails?",
    answer:
      "We retry failed webhook delivery automatically based on your retry setting. If delivery still fails, fix the receiver and publish again from the post workflow.",
  },
  {
    question: "What if I need to add authentication?",
    answer:
      "Set a shared webhook secret in AI Blogger and on your website. We send it in the x-ai-blogger-webhook-secret header on every request.",
  },
  {
    question: "Can I test the webhook?",
    answer:
      "Yes. The Test Webhook button sends an authenticated GET health check so you can verify the endpoint without creating blog content.",
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
              Setup your endpoint to receive published blogs in real-time
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
              When you publish a blog, we send it to your endpoint as an HTTP
              POST request. Your server receives the data and saves it to your
              database. No need to export or copy-paste!
            </p>
            <div className="bg-background/40 rounded-lg p-4 text-sm space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-primary font-semibold">1.</span>
                <span>You publish a blog in AI Blogger</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary font-semibold">2.</span>
                <span>We send HTTP POST to your webhook URL</span>
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

          {/* Payload Reference */}
          <section>
            <h3 className="text-lg font-semibold mb-4">Webhook Payload</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Here&apos;s what we send to your endpoint:
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
                    Make sure it&apos;s publicly accessible and returns HTTP 200
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
                    We&apos;ll send a sample blog to verify everything works
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
                    Your blog will be sent to the webhook automatically
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
            <Button className="flex-1 bg-primary hover:bg-primary/90">
              Test Webhook
            </Button>
          </div>
        </div>
      </AIBloggerGlassCard>
    </div>
  );
}
