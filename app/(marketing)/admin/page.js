'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmModal from '@/components/marketing/ConfirmModal';
import { AdminBlogsPanel } from './_components/AdminBlogsPanel';
import { AdminCategoriesPanel } from './_components/AdminCategoriesPanel';
import { AdminLoginForm } from './_components/AdminLoginForm';
import { AdminTestimonialsPanel } from './_components/AdminTestimonialsPanel';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [blogs, setBlogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [categoryStatus, setCategoryStatus] = useState('');
  const [testimonials, setTestimonials] = useState([]);
  const [showTestimonialForm, setShowTestimonialForm] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState(null);
  const [testimonialForm, setTestimonialForm] = useState({
    text: '',
    name: '',
    company: '',
    status: 'active',
    order: 0,
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [showTestimonialDeleteModal, setShowTestimonialDeleteModal] = useState(false);
  const [testimonialToDelete, setTestimonialToDelete] = useState(null);

  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

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
        method: 'DELETE',
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

  const handleTestimonialFormChange = (field, value) => {
    setTestimonialForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateTestimonial = () => {
    setEditingTestimonial(null);
    setTestimonialForm({
      text: '',
      name: '',
      company: '',
      status: 'active',
      order: 0,
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
      order: testimonial.order || 0,
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
        method: 'DELETE',
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

  if (!isAuthenticated) {
    return (
      <AdminLoginForm
        email={email}
        password={password}
        loginError={loginError}
        setEmail={setEmail}
        setPassword={setPassword}
        handleLogin={handleLogin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 font-glacial">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-12 border-b border-zinc-800 pb-6">
          <h1 className="text-4xl font-etna">Admin Dashboard</h1>
          <div className="text-sm text-gray-400">Logged in as {email}</div>
        </header>

        <main className="space-y-8">
          <AdminCategoriesPanel
            newCategory={newCategory}
            setNewCategory={setNewCategory}
            categoryStatus={categoryStatus}
            categories={categories}
            handleCreateCategory={handleCreateCategory}
            openDeleteModal={openDeleteModal}
          />

          <AdminBlogsPanel
            blogs={blogs}
            handleCreateBlog={handleCreateBlog}
            handleEditBlog={handleEditBlog}
            handleDelete={handleDelete}
          />

          <AdminTestimonialsPanel
            testimonials={testimonials}
            showTestimonialForm={showTestimonialForm}
            editingTestimonial={editingTestimonial}
            testimonialForm={testimonialForm}
            handleCreateTestimonial={handleCreateTestimonial}
            handleTestimonialFormChange={handleTestimonialFormChange}
            handleSaveTestimonial={handleSaveTestimonial}
            setShowTestimonialForm={setShowTestimonialForm}
            handleEditTestimonial={handleEditTestimonial}
            openTestimonialDeleteModal={openTestimonialDeleteModal}
          />
        </main>
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={closeDeleteModal}
        onConfirm={confirmDeleteCategory}
        title="Delete Category"
        message={`Are you sure you want to delete the category "${categoryToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />

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
