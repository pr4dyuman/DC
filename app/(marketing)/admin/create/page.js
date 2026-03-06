'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

// Import ReactQuill dynamically for SSR compatibility
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });
import 'react-quill-new/dist/quill.snow.css';

function CreateBlogForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const blogId = searchParams.get('id');
  const isEditing = !!blogId;

  const [isLoading, setIsLoading] = useState(isEditing);
  const [categories, setCategories] = useState([]);

  // Form State
  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('draft');
  const [metaKeywords, setMetaKeywords] = useState('');
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState('');
  
  const [formStatus, setFormStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessActions, setShowSuccessActions] = useState(false);

  // Modules for ReactQuill
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
      ['link', 'image'],
      ['clean']
    ],
  };

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'indent',
    'link', 'image'
  ];

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Load blog data if editing
  useEffect(() => {
    if (blogId) {
      loadBlogData(blogId);
    }
  }, [blogId]);

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

  const loadBlogData = async (id) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/blog/${id}`);
      if (res.ok) {
        const data = await res.json();
        const blog = data.data;
        setTitle(blog.title);
        setShortDescription(blog.shortDescription || '');
        setCategory(blog.category || '');
        setStatus(blog.status || 'draft');
        setMetaKeywords(blog.metaKeywords || '');
        setContent(blog.content);
        setExistingImageUrl(blog.image);
      } else {
        setFormStatus('Error: Blog not found');
      }
    } catch (error) {
      console.error('Failed to load blog', error);
      setFormStatus('Error loading blog data');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setShortDescription('');
    setCategory('');
    setStatus('draft');
    setMetaKeywords('');
    setContent('');
    setImageFile(null);
    setExistingImageUrl('');
    setFormStatus('');
    setShowSuccessActions(false);
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleCreateNew = () => {
    resetForm();
    router.push('/admin/create');
  };

  const handleBackToList = () => {
    router.push('/admin');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !content || (!imageFile && !existingImageUrl)) {
      setFormStatus('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setFormStatus(isEditing ? 'Updating blog...' : 'Creating blog...');
    setShowSuccessActions(false);

    try {
      let imageUrl = existingImageUrl;

      // 1. Upload new image if selected
      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) throw new Error('Image upload failed');
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
      }

      // 2. Create or Update Blog Post
      const payload = {
        title,
        shortDescription,
        category,
        status,
        metaKeywords,
        content,
        image: imageUrl,
      };

      let res;
      if (isEditing) {
        res = await fetch(`/api/blog/${blogId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/blog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Operation failed');

      setFormStatus(isEditing ? '✓ Blog updated successfully!' : '✓ Blog created successfully!');
      setShowSuccessActions(true);
      
      // Update existing image URL if we uploaded a new one
      if (imageFile) {
        setExistingImageUrl(imageUrl);
        setImageFile(null);
      }

    } catch (err) {
      console.error(err);
      setFormStatus('Error: ' + err.message);
      setShowSuccessActions(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-black font-etna">
        Loading blog data...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-glacial">
      <div className="w-full max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-8 pb-6 border-b border-zinc-800">
          <div>
            <button
              onClick={handleBackToList}
              className="text-sm text-gray-400 hover:text-white mb-2 flex items-center gap-2 transition-colors"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-4xl font-etna">
              {isEditing ? 'Edit Blog Post' : 'Create New Blog Post'}
            </h1>
          </div>
        </header>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Title */}
          <div>
            <label className="block mb-3 text-lg text-gray-300 font-medium">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-lg focus:outline-none focus:border-white transition-colors"
              placeholder="Enter an engaging blog title..."
              required
            />
          </div>

          {/* Short Description */}
          <div>
            <label className="block mb-3 text-lg text-gray-300 font-medium">
              Short Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              className="w-full h-32 bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-lg focus:outline-none focus:border-white transition-colors resize-none"
              placeholder="Brief summary for cards and previews..."
              required
            />
          </div>

          {/* Category & Status Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-3 text-lg text-gray-300 font-medium">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-lg focus:outline-none focus:border-white transition-colors text-white"
                required
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-3 text-lg text-gray-300 font-medium">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-lg focus:outline-none focus:border-white transition-colors text-white"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>

          {/* Meta Keywords */}
          <div>
            <label className="block mb-3 text-lg text-gray-300 font-medium">Meta Keywords</label>
            <input
              type="text"
              value={metaKeywords}
              onChange={(e) => setMetaKeywords(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-lg focus:outline-none focus:border-white transition-colors"
              placeholder="keyword1, keyword2, keyword3"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block mb-3 text-lg text-gray-300 font-medium">
              Cover Image <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-zinc-700 rounded-lg p-8 flex flex-col items-center justify-center text-gray-400 hover:border-zinc-500 transition-colors cursor-pointer relative bg-zinc-900">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {imageFile ? (
                <div className="text-center">
                  <p className="text-white font-medium text-lg mb-2">✓ New image selected</p>
                  <p className="text-sm text-gray-400 break-all">{imageFile.name}</p>
                </div>
              ) : existingImageUrl ? (
                <div className="text-center">
                  <p className="text-green-500 mb-2 text-lg">✓ Image Set</p>
                  <p className="text-xs text-gray-500 break-all mb-2">{existingImageUrl}</p>
                  <p className="text-sm text-gray-400">Click to replace</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-lg mb-2">📁 Click to upload image</p>
                  <p className="text-sm text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Rich Text Editor */}
          <div>
            <label className="block mb-3 text-lg text-gray-300 font-medium">
              Content <span className="text-red-500">*</span>
            </label>
            <div className="bg-white text-black rounded-lg overflow-hidden">
              <ReactQuill 
                theme="snow" 
                value={content} 
                onChange={setContent}
                modules={quillModules}
                formats={quillFormats}
                className="h-[500px] mb-12" // Large height for distraction-free writing
                placeholder="Start writing your blog content here..."
              />
            </div>
          </div>

          {/* Status Message */}
          {formStatus && (
            <div className={`p-6 rounded-lg text-center text-lg font-medium ${
              formStatus.includes('Error') 
                ? 'bg-red-900/20 text-red-200 border border-red-800' 
                : 'bg-green-900/20 text-green-200 border border-green-800'
            }`}>
              {formStatus}
            </div>
          )}

          {/* Action Buttons */}
          {showSuccessActions ? (
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={handleBackToList}
                className="flex-1 py-5 text-lg font-etna rounded-lg transition-all bg-white text-black hover:bg-gray-200 shadow-lg"
              >
                ← BACK TO BLOG LIST
              </button>
              <button
                type="button"
                onClick={handleCreateNew}
                className="flex-1 py-5 text-lg font-etna rounded-lg transition-all bg-zinc-700 text-white hover:bg-zinc-600 shadow-lg"
              >
                + CREATE NEW BLOG
              </button>
            </div>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-5 text-xl font-etna rounded-lg transition-all ${
                isSubmitting 
                  ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed' 
                  : 'bg-white text-black hover:bg-gray-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] shadow-lg'
              }`}
            >
              {isSubmitting 
                ? (isEditing ? 'UPDATING...' : 'PUBLISHING...') 
                : (isEditing ? 'UPDATE BLOG' : 'PUBLISH BLOG')
              }
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

// Wrap in Suspense to fix Next.js build error with useSearchParams
export default function CreateBlogPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-white bg-black font-etna">
        Loading...
      </div>
    }>
      <CreateBlogForm />
    </Suspense>
  );
}
