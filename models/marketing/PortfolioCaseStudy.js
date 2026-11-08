import mongoose from 'mongoose';
import { getMarketingDbConnectionHandle } from '@/lib/marketing-db';

// One portfolio case study, edited in Super Admin → Case Studies. `data` holds
// the whole case study as the site draws it (the PortfolioCaseStudy type in
// lib/marketing-portfolio.ts). Slug, status and order sit outside it so lists
// can be filtered and sorted.
const PortfolioCaseStudySchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    status: { type: String, enum: ['draft', 'sample', 'published'], default: 'draft' },
    order: { type: Number, default: 0 },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    // Who confirmed that a published case study uses real, approved results.
    publishConfirmation: {
      confirmedAt: Date,
      confirmedBy: String,
    },
  },
  { timestamps: true, minimize: false },
);

PortfolioCaseStudySchema.index({ status: 1, order: 1 });

// Resolved on each use, like the Blog model, so a replaced database
// connection never leaves the model bound to a closed one.
export function getPortfolioCaseStudyModel() {
  const marketingConnection = getMarketingDbConnectionHandle();
  return (
    marketingConnection.models.PortfolioCaseStudy ||
    marketingConnection.model('PortfolioCaseStudy', PortfolioCaseStudySchema)
  );
}

/** @type {any} */
const PortfolioCaseStudyModelProxy = new Proxy(function PortfolioCaseStudyModelProxy() {}, {
  get(_target, prop) {
    const model = getPortfolioCaseStudyModel();
    const value = model[prop];
    return typeof value === 'function' ? value.bind(model) : value;
  },
  construct(_target, args) {
    return Reflect.construct(getPortfolioCaseStudyModel(), args);
  },
});

export default PortfolioCaseStudyModelProxy;
