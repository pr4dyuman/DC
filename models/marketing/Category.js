import mongoose from 'mongoose';
import { getMarketingDbConnectionHandle } from '@/lib/marketing-db';

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a category name'],
    unique: true,
    trim: true,
  },
  slug: {
    type: String,
    unique: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Simple slug generator pre-save
CategorySchema.pre('save', async function() {
  if (this.name && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
});

const marketingConnection = getMarketingDbConnectionHandle();

export default marketingConnection.models.Category || marketingConnection.model('Category', CategorySchema);
