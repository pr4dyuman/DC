"use client";

export function AdminBlogsPanel({
  blogs,
  handleCreateBlog,
  handleEditBlog,
  handleDelete,
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-etna text-zinc-100 flex items-center gap-4">
          <span>Manage Blogs</span>
          <span className="text-sm font-sans font-normal text-gray-500 bg-zinc-900 px-3 py-1 rounded-full">
            {blogs.length} items
          </span>
        </h2>
        <button
          onClick={handleCreateBlog}
          className="bg-white text-black font-etna px-6 py-3 rounded-lg hover:bg-gray-200 transition-all shadow-lg hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
        >
          + CREATE BLOG
        </button>
      </div>

      <div className="space-y-4 max-h-[calc(100vh-400px)] overflow-y-auto pr-2 custom-scrollbar">
        {blogs.length === 0 ? (
          <div className="text-gray-500 text-center py-10 bg-zinc-900/50 rounded-xl border border-zinc-800 border-dashed">
            No blogs found. Create your first one!
          </div>
        ) : (
          blogs.map((blog) => (
            <div key={blog._id} className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 hover:border-zinc-600 transition-colors flex gap-4">
              <div className="w-24 h-24 flex-shrink-0 bg-black rounded-lg overflow-hidden border border-zinc-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={blog.image} alt={blog.title} className="w-full h-full object-cover" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-lg leading-tight truncate pr-2">{blog.title}</h3>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${blog.status === "published" ? "bg-green-900 text-green-400" : "bg-yellow-900 text-yellow-400"}`}>
                    {blog.status}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mb-2 truncate">{blog.category}</p>
                <p className="text-xs text-gray-500 line-clamp-2">{blog.shortDescription}</p>

                <div className="flex gap-3 mt-3">
                  <button
                    onClick={() => handleEditBlog(blog._id)}
                    className="text-xs font-bold text-white bg-zinc-700 hover:bg-zinc-600 px-3 py-1.5 rounded transition-colors"
                  >
                    EDIT
                  </button>
                  <button
                    onClick={() => handleDelete(blog._id)}
                    className="text-xs font-bold text-red-400 hover:text-red-300 px-2 py-1.5 rounded transition-colors"
                  >
                    DELETE
                  </button>
                  <a
                    href={`/blog/${blog.slug}`}
                    target="_blank"
                    className="text-xs text-gray-500 hover:text-white flex items-center gap-1 ml-auto"
                    rel="noreferrer"
                  >
                    View Live -&gt;
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
