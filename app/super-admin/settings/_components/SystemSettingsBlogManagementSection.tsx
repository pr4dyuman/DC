"use client";

import { useState, useEffect } from "react";
import { FileText, BookOpen, Settings, Link as LinkIcon, Loader2 } from "lucide-react";
import Link from "next/link";
import { getBlogStats } from "@/lib/actions/super-admin-blog-management";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type BlogStats = Awaited<ReturnType<typeof getBlogStats>>;
type RecentBlog = BlogStats["recentlyUpdated"][number];

export function SystemSettingsBlogManagementSection() {
  const [stats, setStats] = useState<BlogStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        const data = await getBlogStats();
        setStats(data);
      } catch (err) {
        console.error("Failed to load blog stats:", err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Blogs</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.totalBlogs}</p>
            </div>
            <BookOpen className="w-8 h-8 text-blue-500 opacity-50" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Published</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.publishedBlogs}</p>
            </div>
            <BookOpen className="w-8 h-8 text-green-500 opacity-50" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Drafts</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{stats.draftBlogs}</p>
            </div>
            <FileText className="w-8 h-8 text-orange-500 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Recently Updated */}
      {stats.recentlyUpdated.length > 0 && (
        <div className="bg-muted/30 border rounded-lg p-4">
          <h3 className="font-semibold text-foreground mb-3">Recently Updated</h3>
          <div className="space-y-2">
            {stats.recentlyUpdated.map((blog: RecentBlog) => (
              <div
                key={blog._id}
                className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded transition-colors"
              >
                <div className="text-xs font-semibold text-muted-foreground mt-1 min-w-fit">
                  {new Date(blog.updatedAt).toLocaleDateString()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{blog.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{blog.slug}</p>
                </div>
                <div className="text-xs">
                  <span className={`px-2 py-1 rounded ${blog.status === 'published' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-100' : 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-100'}`}>
                    {blog.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Link href="/super-admin/blogs">
            <Button variant="outline" className="w-full justify-start gap-2">
              <BookOpen className="w-4 h-4" />
              Manage All Blogs
            </Button>
          </Link>
          <Link href="/super-admin/blogs/new">
            <Button variant="outline" className="w-full justify-start gap-2">
              <FileText className="w-4 h-4" />
              Create New Blog
            </Button>
          </Link>
          <Link href="/super-admin/ai-blogger">
            <Button variant="outline" className="w-full justify-start gap-2">
              <LinkIcon className="w-4 h-4" />
              AI Blogger Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Info */}
      <div className="bg-muted/30 border rounded-lg p-4 text-sm text-muted-foreground">
        <p>
          Blog management allows you to view, edit, and manage all published blogs from AI Blogger and
          other sources. Changes here directly affect the public blog pages.
        </p>
      </div>
    </div>
  );
}
