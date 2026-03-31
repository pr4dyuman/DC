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
  imageAlt: {
    type: String,
    trim: true,
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
  metaTitle: {
    type: String,
    trim: true,
  },
  metaDescription: {
    type: String,
    trim: true,
  },
  canonicalUrl: {
    type: String,
    trim: true,
  },
  faqItems: [
    {
      question: {
        type: String,
        trim: true,
      },
      answer: {
        type: String,
        trim: true,
      },
    },
  ],
  schemaMarkup: {
    type: String,
  },
  contentClusterId: {
    type: String,
    index: true,
  },
  parentTopicSlug: {
    type: String,
    index: true,
  },
  internalLinks: [
    {
      href: {
        type: String,
        required: true,
      },
      title: {
        type: String,
        required: true,
      },
      anchorText: {
        type: String,
        required: true,
      },
      source: {
        type: String,
        enum: ["service", "page", "blog"],
        required: true,
      },
      relationType: {
        type: String,
        enum: [
          "cluster-parent",
          "cluster-supporting",
          "pillar-parent",
          "pillar-supporting",
          "service-authority",
          "related-reading",
          "site-supporting",
        ],
        required: true,
      },
      score: {
        type: Number,
        default: 0,
      },
      matchReason: {
        type: String,
        default: "",
      },
      clusterAligned: {
        type: Boolean,
        default: false,
      },
      suggestedSectionHeading: String,
      targetPostSlug: String,
      targetClusterId: String,
      targetParentTopicSlug: String,
      placement: {
        type: String,
        enum: ["introduction", "body", "faq", "conclusion"],
      },
    },
  ],
  publishedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Simple slug generator pre-save with duplicate handling
BlogSchema.pre('save', async function() {
  this.updatedAt = new Date();
  if (this.title && !this.slug) {
    let baseSlug = this.title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    let slug = baseSlug;
    let counter = 1;
    while (await mongoose.models.Blog?.exists({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    this.slug = slug;
  }
});

// Add indexes for better query performance
// Note: slug already has an index from unique: true, so we don't add it again
// Note: contentClusterId and parentTopicSlug have index: true in schema, so don't add again
BlogSchema.index({ createdAt: -1 }); // For sorting by date
BlogSchema.index({ status: 1 }); // For filtering by status
BlogSchema.index({ category: 1 }); // For filtering by category
BlogSchema.index({ contentClusterId: 1, createdAt: -1 }); // For sorted cluster queries

export default mongoose.models.Blog || mongoose.model('Blog', BlogSchema);
