import DOMPurify from 'isomorphic-dompurify';

import { normalizeMarketingImageSrc } from '@/lib/marketing-blog-utils';
import { sanitizeName, sanitizeString } from '@/lib/validation';

/**
 * The fields the content admin at /admin may set on a blog post, cleaned.
 * Fields that were not sent are left out, so an update only changes what the
 * form sent.
 */
export function readBlogInput(body) {
  const input = body && typeof body === 'object' ? body : {};
  const fields = {};

  if (typeof input.title === 'string') fields.title = sanitizeName(input.title, 500);
  if (typeof input.shortDescription === 'string') fields.shortDescription = sanitizeString(input.shortDescription, 1000);
  if (typeof input.content === 'string') fields.content = DOMPurify.sanitize(input.content);
  if (typeof input.category === 'string') fields.category = sanitizeName(input.category, 200);
  if (input.status === 'published' || input.status === 'draft') fields.status = input.status;
  if (typeof input.image === 'string') fields.image = normalizeMarketingImageSrc(sanitizeString(input.image, 2000), '');
  if (typeof input.metaKeywords === 'string') fields.metaKeywords = sanitizeString(input.metaKeywords, 500);

  return fields;
}

/** Which required fields are empty, in words for the form. */
export function missingBlogFields(fields) {
  const labels = {
    title: 'title',
    shortDescription: 'short description',
    category: 'category',
    content: 'content',
    image: 'cover image',
  };
  return Object.entries(labels)
    .filter(([key]) => {
      const value = typeof fields[key] === 'string' ? fields[key] : '';
      // An editor with nothing typed still holds markup like <p><br></p>.
      const text = key === 'content' ? value.replace(/<[^>]*>/g, '') : value;
      return !text.trim();
    })
    .map(([, label]) => label);
}

/** A readable message for a failed save. */
export function describeBlogSaveError(error) {
  if (error && typeof error === 'object' && error.code === 11000) {
    const field = Object.keys(error.keyPattern || error.keyValue || {})[0] || '';
    if (field === 'canonicalUrl') return { status: 409, message: 'Another post already uses this canonical URL.' };
    if (field === 'slug') return { status: 409, message: 'Another post already uses this address.' };
    return { status: 409, message: 'Another post already uses one of these values.' };
  }
  if (error && typeof error === 'object' && error.name === 'ValidationError') {
    const messages = Object.values(error.errors || {})
      .map((item) => item && item.message)
      .filter(Boolean);
    return { status: 400, message: messages.join(' ') || 'Some fields are missing.' };
  }
  return { status: 500, message: 'Server error. Try again in a moment.' };
}
