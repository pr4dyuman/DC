import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/marketing-db";
import Blog from "@/models/marketing/Blog";
import { verifySuperAdmin } from "@/lib/actions/super-admin-shared";

export async function POST(request: NextRequest) {
  try {
    await verifySuperAdmin();
    await dbConnect();

    const body = await request.json();

    // Validate required fields
    const required = ["title", "slug", "content", "image", "imageAlt", "shortDescription", "category"];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Create new blog
    const blog = new Blog({
      title: body.title,
      slug: body.slug,
      content: body.content,
      image: body.image,
      imageAlt: body.imageAlt,
      shortDescription: body.shortDescription,
      category: body.category,
      status: body.status || "draft",
      metaTitle: body.metaTitle || "",
      metaDescription: body.metaDescription || "",
      metaKeywords: body.metaKeywords || "",
      canonicalUrl: body.canonicalUrl || "",
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

    return NextResponse.json(blog.toObject(), { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating blog:", error);

    if (error instanceof Error && "code" in error && error.code === 11000) {
      return NextResponse.json(
        { error: "Slug already exists" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create blog" },
      { status: 500 }
    );
  }
}
