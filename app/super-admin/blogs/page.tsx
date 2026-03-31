"use client";

import { useState, useEffect } from "react";
import { Loader2, Trash2, Edit2, Plus, Eye, Search, FilterX } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  getBlogsListPaginated,
  deleteBlog,
  bulkDeleteBlogs,
  getBlogCategories,
} from "@/lib/actions/super-admin-blog-management";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface Blog {
  _id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  category: string;
  publishedAt?: string;
  updatedAt: string;
  createdAt: string;
}

interface PaginatedBlogsResult {
  blogs: Blog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function BlogListPage() {
  const router = useRouter();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"" | "draft" | "published">("");
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedBlogs, setSelectedBlogs] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await getBlogCategories();
        setCategories(cats);
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    };
    loadCategories();
  }, []);

  // Load blogs
  useEffect(() => {
    const loadBlogs = async () => {
      try {
        setLoading(true);
        const result: PaginatedBlogsResult = await getBlogsListPaginated(
          currentPage,
          50,
          {
            search: searchTerm || undefined,
            category: selectedCategory || undefined,
            status: selectedStatus || undefined,
          },
          { field: "updatedAt", order: "desc" }
        );
        setBlogs(result.blogs);
        setTotalPages(result.totalPages);
      } catch (err) {
        console.error("Failed to load blogs:", err);
        toast.error("Failed to load blogs");
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(loadBlogs, 300); // Debounce search
    return () => clearTimeout(timer);
  }, [currentPage, searchTerm, selectedCategory, selectedStatus]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteBlog(id);
      setBlogs((prev) => prev.filter((b) => b._id !== id));
      setDeleteConfirmId(null);
      toast.success("Blog deleted successfully");
    } catch (err) {
      console.error("Failed to delete blog:", err);
      toast.error("Failed to delete blog");
    } finally {
      setDeleting(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedBlogs.size === 0) return;

    setDeleting("bulk");
    try {
      await bulkDeleteBlogs(Array.from(selectedBlogs));
      setBlogs((prev) =>
        prev.filter((b) => !selectedBlogs.has(b._id))
      );
      setSelectedBlogs(new Set());
      setBulkDeleteOpen(false);
      toast.success(`${selectedBlogs.size} blogs deleted successfully`);
    } catch (err) {
      console.error("Failed to delete blogs:", err);
      toast.error("Failed to delete blogs");
    } finally {
      setDeleting(null);
    }
  };

  const toggleBlogSelection = (id: string) => {
    const newSelected = new Set(selectedBlogs);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedBlogs(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedBlogs.size === blogs.length) {
      setSelectedBlogs(new Set());
    } else {
      setSelectedBlogs(new Set(blogs.map((b) => b._id)));
    }
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setSelectedStatus("");
    setCurrentPage(1);
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const activeFilters =
    searchTerm || selectedCategory || selectedStatus;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Blog Management</h1>
          <p className="text-muted-foreground mt-1">
            View, edit, and manage all published blogs
          </p>
        </div>
        <Button
          onClick={() => router.push("/super-admin/blogs/new")}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          New Blog
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-card border rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search title, slug, content..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <Select
            value={selectedCategory}
            onValueChange={(val) => {
              setSelectedCategory(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={selectedStatus}
            onValueChange={(val) => {
              setSelectedStatus(val as "" | "draft" | "published");
              setCurrentPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {activeFilters && (
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="gap-2"
            >
              <FilterX className="w-4 h-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Selected count & bulk actions */}
      {selectedBlogs.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {selectedBlogs.size} blog{selectedBlogs.size !== 1 ? "s" : ""} selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setBulkDeleteOpen(true)}
            disabled={deleting === "bulk"}
            className="gap-2"
          >
            {deleting === "bulk" && <Loader2 className="w-4 h-4 animate-spin" />}
            Delete Selected
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center p-8">
            <p className="text-muted-foreground">No blogs found</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        blogs.length > 0 && selectedBlogs.size === blogs.length
                      }
                      indeterminate={
                        selectedBlogs.size > 0 &&
                        selectedBlogs.size < blogs.length
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blogs.map((blog) => (
                  <TableRow key={blog._id} className="hover:bg-muted/50">
                    <TableCell>
                      <Checkbox
                        checked={selectedBlogs.has(blog._id)}
                        onCheckedChange={() => toggleBlogSelection(blog._id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium max-w-xs truncate">
                      {blog.title}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {blog.category}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          blog.status === "published" ? "default" : "outline"
                        }
                      >
                        {blog.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(blog.publishedAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(blog.updatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(`/super-admin/blogs/${blog._id}`)
                          }
                          title="Edit blog"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            window.open(`/blog/${blog.slug}`, "_blank")
                          }
                          title="View on public site"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirmId(blog._id)}
                          disabled={deleting === blog._id}
                          title="Delete blog"
                        >
                          {deleting === blog._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t p-4 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages} ({blogs.length} results)
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete confirmation dialogs */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Blog</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this blog? This action cannot be undone.
          </AlertDialogDescription>
          <div className="flex justify-end gap-3 mt-6">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmId) {
                  handleDelete(deleteConfirmId);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Multiple Blogs</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {selectedBlogs.size} blog
            {selectedBlogs.size !== 1 ? "s" : ""}? This action cannot be undone.
          </AlertDialogDescription>
          <div className="flex justify-end gap-3 mt-6">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
