import mongoose from 'mongoose';
import { getMarketingDbConnectionHandle } from '@/lib/marketing-db';

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
  sourcePostId: {
    type: String,
    trim: true,
  },
  content: {
    type: String,
    required: [true, 'Please provide content'],
  },
  image: {
    type: String, // URL path to the uploaded image
    default: '',
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
  externalSources: [
    {
      id: {
        type: String,
        trim: true,
      },
      title: {
        type: String,
        trim: true,
      },
      url: {
        type: String,
        trim: true,
      },
      domain: {
        type: String,
        trim: true,
      },
      summary: {
        type: String,
        trim: true,
      },
      type: {
        type: String,
        trim: true,
      },
      freshness: {
        type: String,
        trim: true,
      },
      trustLevel: {
        type: String,
        trim: true,
      },
      publishedAt: {
        type: String,
        trim: true,
      },
      keyClaims: [
        {
          type: String,
          trim: true,
        },
      ],
      citationBlock: {
        type: String,
        trim: true,
      },
    },
  ],
  peopleAlsoAsk: [
    {
      type: String,
      trim: true,
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
  if (typeof this.canonicalUrl === 'string') {
    const normalizedCanonicalUrl = this.canonicalUrl.trim();
    this.canonicalUrl = normalizedCanonicalUrl || undefined;
  }

  this.updatedAt = new Date();
  if (this.title && !this.slug) {
    const BlogModel = this.constructor;
    let baseSlug = this.title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    let slug = baseSlug;
    let counter = 1;
    while (await BlogModel.exists({ slug, _id: { $ne: this._id } })) {
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
BlogSchema.index({ sourcePostId: 1 }, { unique: true, sparse: true }); // Stable webhook upserts
BlogSchema.index(
  { canonicalUrl: 1 },
  {
    unique: true,
    partialFilterExpression: {
      canonicalUrl: { $exists: true, $gt: '' },
    },
  }
);

export function getMarketingBlogModel() {
  const marketingConnection = getMarketingDbConnectionHandle();
  return marketingConnection.models.Blog || marketingConnection.model('Blog', BlogSchema);
}

/** @type {any} */
const MarketingBlogModelProxy = new Proxy(function MarketingBlogModelProxy() {}, {
  get(_target, prop) {
    const model = getMarketingBlogModel();
    const value = model[prop];
    return typeof value === 'function' ? value.bind(model) : value;
  },
  apply(_target, _thisArg, args) {
    const model = getMarketingBlogModel();
    return model.apply(model, args);
  },
  construct(_target, args) {
    const model = getMarketingBlogModel();
    return Reflect.construct(model, args);
  },
});

export default MarketingBlogModelProxy;
