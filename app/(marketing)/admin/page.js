'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmModal from '@/components/marketing/ConfirmModal';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Blog Management State
  const [blogs, setBlogs] = useState([]);
  const [categories, setCategories] = useState([]);

  // Category Management State
  const [newCategory, setNewCategory] = useState('');
  const [categoryStatus, setCategoryStatus] = useState('');

  // Testimonial Management State
  const [testimonials, setTestimonials] = useState([]);
  const [showTestimonialForm, setShowTestimonialForm] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState(null);
  const [testimonialForm, setTestimonialForm] = useState({
    text: '',
    name: '',
    company: '',
    status: 'active',
    order: 0
  });

  // Confirmation Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [showTestimonialDeleteModal, setShowTestimonialDeleteModal] = useState(false);
  const [testimonialToDelete, setTestimonialToDelete] = useState(null);

  const router = useRouter();

  // Check Auth on Mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Fetch blogs, categories, and testimonials when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchBlogs();
      fetchCategories();
      fetchTestimonials();
    }
  }, [isAuthenticated]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setIsAuthenticated(true);
        }
      }
    } catch (e) {
      console.error('Auth check failed', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBlogs = async () => {
    try {
      const res = await fetch('/api/blog');
      if (res.ok) {
        const data = await res.json();
        setBlogs(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch blogs', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/category');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch categories', error);
    }
  };

  const fetchTestimonials = async () => {
    try {
      const res = await fetch('/api/testimonial');
      if (res.ok) {
        const data = await res.json();
        setTestimonials(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch testimonials', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsAuthenticated(true);
      } else {
        setLoginError(data.error || 'Login failed');
      }
    } catch {
      setLoginError('An error occurred. Please try again.');
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategory) return;

    setCategoryStatus('Adding...');
    try {
      const res = await fetch('/api/category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategory }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewCategory('');
        setCategoryStatus('');
        fetchCategories();
      } else {
        setCategoryStatus(data.error || 'Failed');
      }
    } catch {
      setCategoryStatus('Error');
    }
  };

  const openDeleteModal = (category) => {
    setCategoryToDelete(category);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setCategoryToDelete(null);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      const res = await fetch(`/api/category?id=${categoryToDelete._id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchCategories();
        closeDeleteModal();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this blog?')) return;

    try {
      const res = await fetch(`/api/blog/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchBlogs();
      } else {
        alert('Failed to delete blog');
      }
    } catch (error) {
      console.error('Error deleting blog:', error);
      alert('Error deleting blog');
    }
  };

  const handleCreateBlog = () => {
    router.push('/admin/create');
  };

  const handleEditBlog = (blogId) => {
    router.push(`/admin/create?id=${blogId}`);
  };

  // Testimonial Handlers
  const handleTestimonialFormChange = (field, value) => {
    setTestimonialForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateTestimonial = () => {
    setEditingTestimonial(null);
    setTestimonialForm({
      text: '',
      name: '',
      company: '',
      status: 'active',
      order: 0
    });
    setShowTestimonialForm(true);
  };

  const handleEditTestimonial = (testimonial) => {
    setEditingTestimonial(testimonial);
    setTestimonialForm({
      text: testimonial.text,
      name: testimonial.name,
      company: testimonial.company,
      status: testimonial.status,
      order: testimonial.order || 0
    });
    setShowTestimonialForm(true);
  };

  const handleSaveTestimonial = async (e) => {
    e.preventDefault();

    try {
      const method = editingTestimonial ? 'PUT' : 'POST';
      const body = editingTestimonial
        ? { id: editingTestimonial._id, ...testimonialForm }
        : testimonialForm;

      const res = await fetch('/api/testimonial', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        fetchTestimonials();
        setShowTestimonialForm(false);
        setEditingTestimonial(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save testimonial');
      }
    } catch (error) {
      console.error('Error saving testimonial:', error);
      alert('Error saving testimonial');
    }
  };

  const openTestimonialDeleteModal = (testimonial) => {
    setTestimonialToDelete(testimonial);
    setShowTestimonialDeleteModal(true);
  };

  const closeTestimonialDeleteModal = () => {
    setShowTestimonialDeleteModal(false);
    setTestimonialToDelete(null);
  };

  const confirmDeleteTestimonial = async () => {
    if (!testimonialToDelete) return;

    try {
      const res = await fetch(`/api/testimonial?id=${testimonialToDelete._id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchTestimonials();
        closeTestimonialDeleteModal();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-white bg-black font-etna">Loading...</div>;
  }

  // LOGIN FORM
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
        <div className="w-full max-w-md p-8 border border-white/10 rounded-2xl bg-zinc-900 shadow-2xl">
          <h1 className="text-3xl mb-6 text-center font-etna tracking-wide">Admin Access</h1>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block mb-2 text-sm text-gray-400 font-glacial">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black border border-zinc-700 rounded p-3 focus:outline-none focus:border-white transition-colors"
                placeholder="admin@example.com"
                required
              />
            </div>
            <div>
              <label className="block mb-2 text-sm text-gray-400 font-glacial">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black border border-zinc-700 rounded p-3 focus:outline-none focus:border-white transition-colors"
                placeholder="••••••••"
                required
              />
            </div>
            {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
            <button
              type="submit"
              className="w-full bg-white text-black font-etna py-3 rounded hover:bg-gray-200 transition-colors"
            >
              LOGIN
            </button>
          </form>
        </div>
      </div>
    );
  }

  // DASHBOARD
  return (
    <div className="min-h-screen bg-black text-white p-6 font-glacial">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-12 border-b border-zinc-800 pb-6">
          <h1 className="text-4xl font-etna">Admin Dashboard</h1>
          <div className="text-sm text-gray-400">Logged in as {email}</div>
        </header>

        <main className="space-y-8">

          {/* CATEGORY MANAGEMENT */}
          <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
            <h3 className="text-lg font-etna text-zinc-100 mb-4">Categories</h3>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New category..."
                className="flex-1 bg-black border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-white"
              />
              <button
                onClick={handleCreateCategory}
                disabled={!newCategory}
                className="bg-zinc-700 hover:bg-white hover:text-black text-white px-4 py-2 rounded text-sm font-bold transition-all disabled:opacity-50"
              >
                ADD
              </button>
            </div>
            {categoryStatus && <p className="text-xs text-gray-400 mb-2">{categoryStatus}</p>}

            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <span key={cat._id} className="bg-black border border-zinc-700 px-3 py-1 rounded-full text-xs flex items-center gap-2 group">
                  {cat.name}
                  <button
                    onClick={() => openDeleteModal(cat)}
                    className="text-zinc-500 hover:text-red-500 text-lg leading-none"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* BLOG LIST */}
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
                    {/* Thumbnail */}
                    <div className="w-24 h-24 flex-shrink-0 bg-black rounded-lg overflow-hidden border border-zinc-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={blog.image} alt={blog.title} className="w-full h-full object-cover" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-lg leading-tight truncate pr-2">{blog.title}</h3>
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${blog.status === 'published' ? 'bg-green-900 text-green-400' : 'bg-yellow-900 text-yellow-400'}`}>
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
                        >
                          View Live ↗
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* TESTIMONIAL MANAGEMENT */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-etna text-zinc-100 flex items-center gap-4">
                <span>Manage Testimonials</span>
                <span className="text-sm font-sans font-normal text-gray-500 bg-zinc-900 px-3 py-1 rounded-full">
                  {testimonials.length} items
                </span>
              </h2>
              <button
                onClick={handleCreateTestimonial}
                className="bg-white text-black font-etna px-6 py-3 rounded-lg hover:bg-gray-200 transition-all shadow-lg hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
              >
                + ADD TESTIMONIAL
              </button>
            </div>

            {/* Testimonial Form */}
            {showTestimonialForm && (
              <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 mb-6">
                <h3 className="text-lg font-etna text-zinc-100 mb-4">
                  {editingTestimonial ? 'Edit Testimonial' : 'New Testimonial'}
                </h3>
                <form onSubmit={handleSaveTestimonial} className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Client Name</label>
                    <input
                      type="text"
                      value={testimonialForm.name}
                      onChange={(e) => handleTestimonialFormChange('name', e.target.value)}
                      className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-white"
                      placeholder="e.g., RAJESH KUMAR, CEO"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Company</label>
                    <input
                      type="text"
                      value={testimonialForm.company}
                      onChange={(e) => handleTestimonialFormChange('company', e.target.value)}
                      className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-white"
                      placeholder="e.g., TECHVERSE SOLUTIONS (BANGALORE)"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Testimonial Text</label>
                    <textarea
                      value={testimonialForm.text}
                      onChange={(e) => handleTestimonialFormChange('text', e.target.value)}
                      className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-white min-h-[100px]"
                      placeholder="Enter the testimonial text..."
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Status</label>
                      <select
                        value={testimonialForm.status}
                        onChange={(e) => handleTestimonialFormChange('status', e.target.value)}
                        className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-white"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Display Order</label>
                      <input
                        type="number"
                        value={testimonialForm.order}
                        onChange={(e) => handleTestimonialFormChange('order', parseInt(e.target.value) || 0)}
                        className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-white"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      className="bg-white text-black font-bold px-6 py-2 rounded hover:bg-gray-200 transition-colors"
                    >
                      {editingTestimonial ? 'UPDATE' : 'CREATE'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTestimonialForm(false)}
                      className="bg-zinc-700 text-white font-bold px-6 py-2 rounded hover:bg-zinc-600 transition-colors"
                    >
                      CANCEL
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Testimonial List */}
            <div className="space-y-4">
              {testimonials.length === 0 ? (
                <div className="text-gray-500 text-center py-10 bg-zinc-900/50 rounded-xl border border-zinc-800 border-dashed">
                  No testimonials found. Add your first one!
                </div>
              ) : (
                testimonials.map((testimonial) => (
                  <div key={testimonial._id} className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 hover:border-zinc-600 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-white">{testimonial.name}</h4>
                          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${testimonial.status === 'active' ? 'bg-green-900 text-green-400' : 'bg-gray-900 text-gray-400'}`}>
                            {testimonial.status}
                          </span>
                          <span className="text-xs text-gray-500">Order: {testimonial.order}</span>
                        </div>
                        <p className="text-sm text-[#F5EE30] mb-2">{testimonial.company}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 mb-4 italic">&quot;{testimonial.text}&quot;</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleEditTestimonial(testimonial)}
                        className="text-xs font-bold text-white bg-zinc-700 hover:bg-zinc-600 px-3 py-1.5 rounded transition-colors"
                      >
                        EDIT
                      </button>
                      <button
                        onClick={() => openTestimonialDeleteModal(testimonial)}
                        className="text-xs font-bold text-red-400 hover:text-red-300 px-2 py-1.5 rounded transition-colors"
                      >
                        DELETE
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Category Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={closeDeleteModal}
        onConfirm={confirmDeleteCategory}
        title="Delete Category"
        message={`Are you sure you want to delete the category "${categoryToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />

      {/* Testimonial Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showTestimonialDeleteModal}
        onClose={closeTestimonialDeleteModal}
        onConfirm={confirmDeleteTestimonial}
        title="Delete Testimonial"
        message={`Are you sure you want to delete the testimonial from "${testimonialToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}
