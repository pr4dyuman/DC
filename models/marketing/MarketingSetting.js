import mongoose from 'mongoose';
import { getMarketingDbConnectionHandle } from '@/lib/marketing-db';

// Small named settings for the marketing site, one document per key. The
// portfolio uses one to remember that its case studies were set up in Super
// Admin, so deleting them all never brings back the built-in ones.
const MarketingSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true, minimize: false },
);

// Resolved on each use, like the Blog model, so a replaced database
// connection never leaves the model bound to a closed one.
export function getMarketingSettingModel() {
  const marketingConnection = getMarketingDbConnectionHandle();
  return (
    marketingConnection.models.MarketingSetting ||
    marketingConnection.model('MarketingSetting', MarketingSettingSchema)
  );
}

/** @type {any} */
const MarketingSettingModelProxy = new Proxy(function MarketingSettingModelProxy() {}, {
  get(_target, prop) {
    const model = getMarketingSettingModel();
    const value = model[prop];
    return typeof value === 'function' ? value.bind(model) : value;
  },
  construct(_target, args) {
    return Reflect.construct(getMarketingSettingModel(), args);
  },
});

export default MarketingSettingModelProxy;
