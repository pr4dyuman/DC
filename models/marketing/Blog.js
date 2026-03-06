import mongoose from 'mongoose';

const BlogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a title'],
    trim: true,
  },
  slug: {
    type: String,
    unique: true,
    trim: true,
  },
  content: {
    type: String,
    required: [true, 'Please provide content'],
  },
  image: {
    type: String, // URL path to the uploaded image
    required: [true, 'Please upload an image'],
  },
  shortDescription: {
    type: String,
    required: [true, 'Please provide a short description'],
    trim: true,
  },
  category: {
    type: String,
    required: [true, 'Please provide a category'],
    trim: true,
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft',
  },
  metaKeywords: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Simple slug generator pre-save
BlogSchema.pre('save', async function() {
  if (this.title && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
});

// Add indexes for better query performance
// Note: slug already has an index from unique: true, so we don't add it again
BlogSchema.index({ createdAt: -1 }); // For sorting by date
BlogSchema.index({ status: 1 }); // For filtering by status
BlogSchema.index({ category: 1 }); // For filtering by category

export default mongoose.models.Blog || mongoose.model('Blog', BlogSchema);
