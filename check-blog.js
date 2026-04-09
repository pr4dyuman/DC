const mongoose = require('mongoose');

async function check() {
  try {
    const conn = await mongoose.createConnection('mongodb+srv://chandanvsharma00_agencyos:tUhRWo1W1PdzfsJI@cluster0.o2mv8lz.mongodb.net/', {
      dbName: 'marketing-blog',
      serverSelectionTimeoutMS: 15000,
      tls: true,
    }).asPromise();
    
    const BlogSchema = new mongoose.Schema({ 
      title: String, slug: String, content: String, image: String, imageAlt: String,
      shortDescription: String, schemaMarkup: String, faqItems: Array, peopleAlsoAsk: Array,
      internalLinks: Array, status: String, publishedAt: Date, createdAt: Date, updatedAt: Date,
      metaTitle: String, metaDescription: String, metaKeywords: String, canonicalUrl: String,
      category: String
    });
    const Blog = conn.model('Blog', BlogSchema);
    
    const blog = await Blog.findOne({ slug: 'how-to-manage-your-company-using-ai-powered-tools-2026-strategy' }).lean();
    
    if (!blog) {
      console.log('NOT FOUND');
      process.exit(0);
    }
    
    console.log('All fields:', Object.keys(blog));
    
    function toIsoDate(value, fallback) {
      const candidate = value != null ? value : fallback;
      if (!candidate) return undefined;
      const parsed = candidate instanceof Date ? candidate : new Date(candidate);
      return isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
    }
    
    const post = {
      ...blog,
      _id: blog._id.toString(),
      image: blog.image,
      publishedAt: toIsoDate(blog.publishedAt),
      createdAt: toIsoDate(blog.createdAt) || new Date().toISOString(),
      updatedAt: toIsoDate(blog.updatedAt, blog.createdAt) || new Date().toISOString(),
    };
    
    console.log('post.image:', post.image);
    console.log('post.canonicalUrl:', post.canonicalUrl);
    console.log('post.publishedAt:', post.publishedAt);
    console.log('internalLinks count:', (post.internalLinks || []).length);
    if (post.internalLinks && post.internalLinks.length > 0) {
      console.log('first internalLink:', JSON.stringify(post.internalLinks[0]));
    }
    
    // Test schemaMarkup parsing
    if (post.schemaMarkup) {
      try {
        const parsed = JSON.parse(post.schemaMarkup);
        const serialized = JSON.stringify(parsed).replace(/</g, '\\u003c');
        console.log('schemaMarkup: OK, length:', serialized.length);
      } catch(e) {
        console.log('schemaMarkup ERROR:', e.message);
      }
    } else {
      console.log('schemaMarkup: MISSING');
    }
    
    // Check internalLinks schema compliance
    if (post.internalLinks) {
      post.internalLinks.forEach((link, i) => {
        const relationType = link.relationType;
        const validRelationTypes = ["cluster-parent", "cluster-supporting", "pillar-parent", "pillar-supporting", "service-authority", "related-reading", "site-supporting"];
        const source = link.source;
        const validSources = ["service", "page", "blog"];
        console.log(`link[${i}]: source="${source}" (${validSources.includes(source) ? 'OK' : 'INVALID'}), relationType="${relationType}" (${validRelationTypes.includes(relationType) ? 'OK' : 'INVALID'}), href="${link.href}"`);
      });
    }
    
    await conn.close();
    process.exit(0);
  } catch(e) {
    console.error('ERROR:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
}

check();
