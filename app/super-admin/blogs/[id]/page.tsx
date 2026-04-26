"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { Loader2, Trash2, ArrowLeft, Eye } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";
import {
  getBlogById,
  updateBlog,
  validateBlogSEOMetadata,
  deleteBlog,
} from "@/lib/actions/super-admin-blog-management";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

interface BlogData {
  _id?: string;
  title: string;
  slug: string;
  content: string;
  image: string;
  imageAlt: string;
  shortDescription: string;
  category: string;
  status: "draft" | "published";
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  canonicalUrl: string;
  schemaMarkup: string;
  faqItems: Array<{ question: string; answer: string }>;
  contentClusterId: string;
  parentTopicSlug: string;
  publishedAt?: string;
}

type BlogDataInput = Partial<Omit<BlogData, "faqItems" | "publishedAt">> & {
  faqItems?: Array<{ question?: string; answer?: string }>;
  publishedAt?: string | Date;
};

const CATEGORIES = [
  "Technology",
  "Business",
  "Marketing",
  "Design",
  "Development",
  "SEO",
  "Content",
  "Analytics",
  "Other",
];

function toBlogData(data: BlogDataInput): BlogData {
  return {
    _id: data._id,
    title: data.title || "",
    slug: data.slug || "",
    content: data.content || "",
    image: data.image || "",
    imageAlt: data.imageAlt || "",
    shortDescription: data.shortDescription || "",
    category: data.category || "Technology",
    status: data.status === "published" ? "published" : "draft",
    metaTitle: data.metaTitle || "",
    metaDescription: data.metaDescription || "",
    metaKeywords: data.metaKeywords || "",
    canonicalUrl: data.canonicalUrl || "",
    schemaMarkup: data.schemaMarkup || "",
    faqItems: (data.faqItems || []).map((item) => ({
      question: item.question || "",
      answer: item.answer || "",
    })),
    contentClusterId: data.contentClusterId || "",
    parentTopicSlug: data.parentTopicSlug || "",
    publishedAt: data.publishedAt instanceof Date ? data.publishedAt.toISOString() : data.publishedAt,
  };
}

export default function BlogEditorPage() {
  const router = useRouter();
  const params = useParams();
  const blogId = params?.id as string | undefined;
  const isNewBlog = blogId === "new" || !blogId;

  const [blog, setBlog] = useState<BlogData>({
    title: "",
    slug: "",
    content: "",
    image: "",
    imageAlt: "",
    shortDescription: "",
    category: "Technology",
    status: "draft",
    metaTitle: "",
    metaDescription: "",
    metaKeywords: "",
    canonicalUrl: "",
    schemaMarkup: "",
    faqItems: [],
    contentClusterId: "",
    parentTopicSlug: "",
  });

  const [loading, setLoading] = useState(!isNewBlog);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [seoErrors, setSeoErrors] = useState<string[]>([]);

  // Load blog if editing
  useEffect(() => {
    if (isNewBlog) {
      setLoading(false);
      return;
    }

    const loadBlog = async () => {
      try {
        setLoading(true);
        const data = await getBlogById(blogId);
        setBlog(toBlogData(data));
      } catch (err) {
        console.error("Failed to load blog:", err);
        toast.error("Failed to load blog");
        router.push("/super-admin/blogs");
      } finally {
        setLoading(false);
      }
    };

    loadBlog();
  }, [blogId, isNewBlog, router]);

  const handleFieldChange = useCallback(
    (field: keyof BlogData, value: unknown) => {
      setBlog((prev) => ({ ...prev, [field]: value }));

      // Auto-generate slug from title if new blog
      if (field === "title" && isNewBlog && !blog.slug) {
        const titleValue = typeof value === "string" ? value : "";
        const newSlug = titleValue
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, "")
          .replace(/[\s_-]+/g, "-")
          .replace(/^-+|-+$/g, "");
        setBlog((prev) => ({ ...prev, slug: newSlug }));
      }
    },
    [isNewBlog, blog.slug]
  );

  const handleSave = useCallback(
    async (newStatus?: "draft" | "published") => {
      try {
        setSaving(true);

        const dataToSave = { ...blog };
        if (newStatus) {
          dataToSave.status = newStatus;
        }

        // Validate SEO for published blogs
        if (dataToSave.status === "published") {
          const validation = await validateBlogSEOMetadata({
            metaTitle: dataToSave.metaTitle,
            metaDescription: dataToSave.metaDescription,
            status: "published",
          });

          if (!validation.valid) {
            setSeoErrors(validation.errors);
            toast.error("SEO validation failed");
            return;
          }
        }

        setSeoErrors([]);

        if (isNewBlog) {
          // Create new blog
          const response = await fetch("/api/super-admin/blogs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dataToSave),
          });

          if (!response.ok) {
            const errorBody = await response.json().catch(() => null);
            throw new Error(errorBody?.error || "Failed to create blog");
          }

          const createdBlog = await response.json();
          toast.success("Blog created successfully");
          router.push(`/super-admin/blogs/${createdBlog._id}`);
        } else {
          // Update existing blog
          const { publishedAt: _publishedAt, ...blogUpdate } = dataToSave;
          void _publishedAt;
          const updatedBlog = await updateBlog(blog._id!, blogUpdate);
          setBlog(toBlogData(updatedBlog));
          toast.success("Blog updated successfully");
        }
      } catch (err) {
        console.error("Failed to save blog:", err);
        toast.error(err instanceof Error ? err.message : "Failed to save blog");
      } finally {
        setSaving(false);
      }
    },
    [blog, isNewBlog, router]
  );

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteBlog(blog._id!);
      toast.success("Blog deleted successfully");
      router.push("/super-admin/blogs");
    } catch (err) {
      console.error("Failed to delete blog:", err);
      toast.error("Failed to delete blog");
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  const addFaqItem = () => {
    setBlog((prev) => ({
      ...prev,
      faqItems: [...(prev.faqItems || []), { question: "", answer: "" }],
    }));
  };

  const removeFaqItem = (index: number) => {
    setBlog((prev) => ({
      ...prev,
      faqItems: prev.faqItems?.filter((_, i) => i !== index) || [],
    }));
  };

  const updateFaqItem = (
    index: number,
    field: "question" | "answer",
    value: string
  ) => {
    setBlog((prev) => {
      const newFaqItems = [...(prev.faqItems || [])];
      newFaqItems[index] = { ...newFaqItems[index], [field]: value };
      return { ...prev, faqItems: newFaqItems };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const metaTitleLength = blog.metaTitle.length;
  const metaDescLength = blog.metaDescription.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/super-admin/blogs")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {isNewBlog ? "Create Blog" : "Edit Blog"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isNewBlog
                ? "Create a new blog post"
                : `Last updated: ${blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString() : "Not published"}`}
            </p>
          </div>
        </div>
        {!isNewBlog && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.open(`/blog/${blog.slug}`, "_blank")}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              View
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </Button>
          </div>
        )}
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2">
        <Badge variant={blog.status === "published" ? "default" : "outline"}>
          {blog.status}
        </Badge>
      </div>

      {/* Main content with tabs style */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column - main form */}
        <div className="space-y-6 lg:col-span-2">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Title, content, and basic metadata</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={blog.title}
                  onChange={(e) => handleFieldChange("title", e.target.value)}
                  placeholder="Enter blog title"
                  className="mt-2"
                />
              </div>

              {/* Slug */}
              <div>
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={blog.slug}
                  onChange={(e) => handleFieldChange("slug", e.target.value)}
                  placeholder="blog-post-slug"
                  className="mt-2"
                />
              </div>

              {/* Category */}
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={blog.category}
                  onValueChange={(val) => handleFieldChange("category", val)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Short Description */}
              <div>
                <Label htmlFor="shortDesc">Short Description *</Label>
                <Textarea
                  id="shortDesc"
                  value={blog.shortDescription}
                  onChange={(e) =>
                    handleFieldChange("shortDescription", e.target.value)
                  }
                  placeholder="Brief description for previews..."
                  rows={3}
                  className="mt-2"
                />
              </div>

              {/* Content Editor */}
              <div>
                <Label htmlFor="content">Content *</Label>
                <div className="mt-2 rounded-lg border">
                  <Suspense
                    fallback={
                      <div className="h-96 flex items-center justify-center bg-muted/30">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    }
                  >
                    <ReactQuill
                      value={blog.content}
                      onChange={(val) => handleFieldChange("content", val)}
                      theme="snow"
                      modules={{
                        toolbar: [
                          [{ header: [1, 2, 3, false] }],
                          ["bold", "italic", "underline", "strike"],
                          [{ list: "ordered" }, { list: "bullet" }],
                          ["blockquote", "code-block"],
                          ["link", "image"],
                          ["clean"],
                        ],
                      }}
                      style={{ height: "400px" }}
                    />
                  </Suspense>
                </div>
              </div>

              {/* Image */}
              <div>
                <Label htmlFor="image">Featured Image URL *</Label>
                <Input
                  id="image"
                  value={blog.image}
                  onChange={(e) => handleFieldChange("image", e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="mt-2"
                />
                {blog.image && (
                  <div className="mt-2 rounded-lg overflow-hidden h-40">
                    <picture>
                      <img src={blog.image} alt="Preview" className="w-full h-full object-cover" />
                    </picture>
                  </div>
                )}
              </div>

              {/* Image Alt */}
              <div>
                <Label htmlFor="imageAlt">Image Alt Text *</Label>
                <Input
                  id="imageAlt"
                  value={blog.imageAlt}
                  onChange={(e) => handleFieldChange("imageAlt", e.target.value)}
                  placeholder="Describe the image for accessibility"
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* SEO */}
          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
              <CardDescription>
                Optimize for search engines (required for publishing)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {seoErrors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm font-medium text-red-900 dark:text-red-100">
                    SEO Validation Errors:
                  </p>
                  <ul className="text-sm text-red-800 dark:text-red-200 mt-2 space-y-1">
                    {seoErrors.map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Meta Title */}
              <div>
                <div className="flex justify-between">
                  <Label htmlFor="metaTitle">Meta Title *</Label>
                  <span className={`text-xs ${metaTitleLength > 60 ? "text-orange-500" : "text-muted-foreground"}`}>
                    {metaTitleLength}/60
                  </span>
                </div>
                <Input
                  id="metaTitle"
                  value={blog.metaTitle}
                  onChange={(e) => handleFieldChange("metaTitle", e.target.value)}
                  placeholder="Optimized title for search results"
                  className="mt-2"
                />
              </div>

              {/* Meta Description */}
              <div>
                <div className="flex justify-between">
                  <Label htmlFor="metaDesc">Meta Description *</Label>
                  <span className={`text-xs ${metaDescLength > 160 ? "text-orange-500" : "text-muted-foreground"}`}>
                    {metaDescLength}/160
                  </span>
                </div>
                <Textarea
                  id="metaDesc"
                  value={blog.metaDescription}
                  onChange={(e) => handleFieldChange("metaDescription", e.target.value)}
                  placeholder="Brief description shown in search results"
                  rows={3}
                  className="mt-2"
                />
              </div>

              {/* Meta Keywords */}
              <div>
                <Label htmlFor="keywords">Meta Keywords</Label>
                <Input
                  id="keywords"
                  value={blog.metaKeywords}
                  onChange={(e) => handleFieldChange("metaKeywords", e.target.value)}
                  placeholder="Comma-separated keywords"
                  className="mt-2"
                />
              </div>

              {/* Canonical URL */}
              <div>
                <Label htmlFor="canonical">Canonical URL</Label>
                <Input
                  id="canonical"
                  value={blog.canonicalUrl}
                  onChange={(e) => handleFieldChange("canonicalUrl", e.target.value)}
                  placeholder="https://example.com/page"
                  className="mt-2"
                />
              </div>

              {/* Schema Markup */}
              <div>
                <Label htmlFor="schema">Schema Markup (JSON)</Label>
                <Textarea
                  id="schema"
                  value={blog.schemaMarkup}
                  onChange={(e) => handleFieldChange("schemaMarkup", e.target.value)}
                  placeholder='{"@context": "https://schema.org", ...}'
                  rows={4}
                  className="mt-2 font-mono text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* FAQ */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>FAQ Items</CardTitle>
                <CardDescription>Add frequently asked questions</CardDescription>
              </div>
              <Button size="sm" onClick={addFaqItem} variant="outline">
                + Add FAQ
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {(blog.faqItems || []).map((item, idx) => (
                <div
                  key={idx}
                  className="border rounded-lg p-4 space-y-3 relative"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 text-destructive"
                    onClick={() => removeFaqItem(idx)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <div>
                    <Label htmlFor={`faq-q-${idx}`}>Question</Label>
                    <Input
                      id={`faq-q-${idx}`}
                      value={item.question}
                      onChange={(e) =>
                        updateFaqItem(idx, "question", e.target.value)
                      }
                      placeholder="Enter question"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`faq-a-${idx}`}>Answer</Label>
                    <Textarea
                      id={`faq-a-${idx}`}
                      value={item.answer}
                      onChange={(e) =>
                        updateFaqItem(idx, "answer", e.target.value)
                      }
                      placeholder="Enter answer"
                      rows={3}
                      className="mt-2"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Advanced */}
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Content Cluster ID */}
              <div>
                <Label htmlFor="clusterId">Content Cluster ID</Label>
                <Input
                  id="clusterId"
                  value={blog.contentClusterId}
                  onChange={(e) => handleFieldChange("contentClusterId", e.target.value)}
                  placeholder="cluster-123"
                  className="mt-2"
                />
              </div>

              {/* Parent Topic Slug */}
              <div>
                <Label htmlFor="parentTopic">Parent Topic Slug</Label>
                <Input
                  id="parentTopic"
                  value={blog.parentTopicSlug}
                  onChange={(e) => handleFieldChange("parentTopicSlug", e.target.value)}
                  placeholder="parent-topic-slug"
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column - sticky sidebar */}
        <div className="col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Publish</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Current Status</p>
                <p className="text-sm text-muted-foreground">
                  {blog.status === "published"
                    ? `Published on ${blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString() : "—"}`
                    : "This blog is currently a draft"}
                </p>
              </div>

              {/* Word Count */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Word Count</p>
                <p className="text-sm text-muted-foreground">
                  {blog.content.split(/\s+/).filter(Boolean).length} words
                </p>
              </div>

              {/* FAQ Count */}
              <div className="space-y-2">
                <p className="text-sm font-medium">FAQ Items</p>
                <p className="text-sm text-muted-foreground">
                  {(blog.faqItems || []).length} items
                </p>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <Button
                  onClick={() => handleSave("draft")}
                  disabled={saving}
                  variant="outline"
                  className="w-full"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Save as Draft
                </Button>
                <Button
                  onClick={() => handleSave("published")}
                  disabled={saving}
                  className="w-full"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Publish
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Blog</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this blog? This action cannot be undone.
          </AlertDialogDescription>
          <div className="flex justify-end gap-3 mt-6">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
