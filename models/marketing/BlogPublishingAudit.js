import mongoose from 'mongoose';
import { getMarketingDbConnectionHandle } from '@/lib/marketing-db';

const BlogPublishingAuditSchema = new mongoose.Schema({
  // Association with the published blog
  blogSlug: {
    type: String,
    required: true,
    index: true,
  },
  blogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blog',
    index: true,
  },

  // Source information from AI Blogger
  sourcePostId: {
    type: String,
    description: 'Original post ID from AI Blogger system',
  },
  agencyId: {
    type: String,
    required: true,
    index: true,
    description: 'Which agency published this blog',
  },
  agencyName: {
    type: String,
    description: 'Agency display name',
  },

  // Event information
  publishingEvent: {
    type: String,
    enum: ['blog.published', 'blog.updated', 'blog.deleted'],
    default: 'blog.published',
    index: true,
  },

  // Timestamps
  publishedByAIBlogger: {
    type: Date,
    description: 'When AI Blogger published this (source.publishedAt)',
  },
  receivedByDC: {
    type: Date,
    default: Date.now,
    description: 'When DC webhook received the blog',
  },

  // Webhook delivery info
  webhookUrl: {
    type: String,
    description: 'Which webhook URL received this blog',
  },
  webhookStatus: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'pending',
  },
  webhookError: {
    type: String,
    description: 'If webhook delivery failed, capture the error',
  },

  // Content metadata snapshot (for audit trail)
  contentSnapshot: {
    title: String,
    wordCount: Number,
    hasInternalLinks: Boolean,
    internalLinkCount: Number,
    hasFaqItems: Boolean,
    faqItemCount: Number,
    hasSchemaMarkup: Boolean,
    metaKeywordsCount: Number,
  },

  // Status tracking
  status: {
    type: String,
    enum: ['received', 'stored', 'published', 'archived'],
    default: 'received',
    index: true,
  },

  // Notes and logs
  notes: [
    {
      timestamp: Date,
      message: String,
    },
  ],

  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for common queries
BlogPublishingAuditSchema.index({ agencyId: 1, createdAt: -1 });
BlogPublishingAuditSchema.index({ publishingEvent: 1, createdAt: -1 });
BlogPublishingAuditSchema.index({ blogSlug: 1, publishingEvent: 1 });

const marketingConnection = getMarketingDbConnectionHandle();

export default marketingConnection.models.BlogPublishingAudit ||
  marketingConnection.model('BlogPublishingAudit', BlogPublishingAuditSchema);
