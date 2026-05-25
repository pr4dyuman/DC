import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/marketing-db";
import Blog from "@/models/marketing/Blog";
import { verifySuperAdmin } from "@/lib/actions/super-admin-shared";
import { normalizeMarketingCanonicalUrl, normalizeMarketingImageSrc } from "@/lib/marketing-blog-utils";

export async function POST(request: NextRequest) {
  try {
    await verifySuperAdmin();
    await dbConnect();

    const body = await request.json();
    const normalizedCanonicalUrl = normalizeMarketingCanonicalUrl(
      body.canonicalUrl || "",
      body.slug || undefined,
    );

    // Validate required fields
    const required = ["title", "slug", "content", "shortDescription", "category"];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const existingSlug = await Blog.findOne({ slug: body.slug }).select("slug").lean();
    if (existingSlug) {
      return NextResponse.json(
        { error: "Slug already exists" },
        { status: 409 }
      );
    }

    if (normalizedCanonicalUrl) {
      const existingCanonical = await Blog.findOne({ canonicalUrl: normalizedCanonicalUrl })
        .select("slug")
        .lean();
      if (existingCanonical) {
        return NextResponse.json(
          { error: `Canonical URL already exists on blog "${existingCanonical.slug}"` },
          { status: 409 }
        );
      }
    }

    const normalizedImage = normalizeMarketingImageSrc(body.image || "", "");

    // Create new blog
    const blog = new Blog({
      title: body.title,
      slug: body.slug,
      content: body.content,
      image: normalizedImage,
      imageAlt: normalizedImage ? body.imageAlt || body.title : "",
      shortDescription: body.shortDescription,
      category: body.category,
      status: body.status || "draft",
      metaTitle: body.metaTitle || "",
      metaDescription: body.metaDescription || "",
      metaKeywords: body.metaKeywords || "",
      canonicalUrl: normalizedCanonicalUrl || undefined,
      schemaMarkup: body.schemaMarkup || "",
      faqItems: body.faqItems || [],
      contentClusterId: body.contentClusterId || "",
      parentTopicSlug: body.parentTopicSlug || "",
      internalLinks: body.internalLinks || [],
      publishedAt: body.status === "published" ? new Date() : undefined,
    });

    await blog.save();

    // Revalidate cache
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/blog");
    revalidatePath(`/blog/${blog.slug}`);
    revalidatePath("/sitemap.xml");

    return NextResponse.json(blog.toObject(), { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating blog:", error);

    if (error instanceof Error && "code" in error && error.code === 11000) {
      const duplicateField =
        typeof (error as { keyPattern?: Record<string, unknown>; keyValue?: Record<string, unknown> }).keyPattern === "object"
          ? Object.keys((error as { keyPattern?: Record<string, unknown> }).keyPattern || {})[0]
          : Object.keys((error as { keyValue?: Record<string, unknown> }).keyValue || {})[0];
      return NextResponse.json(
        { error: duplicateField === "canonicalUrl" ? "Canonical URL already exists" : "Slug already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create blog" },
      { status: 500 }
    );
  }
}
