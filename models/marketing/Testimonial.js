import mongoose from 'mongoose';

const TestimonialSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Please provide testimonial text'],
    trim: true,
  },
  name: {
    type: String,
    required: [true, 'Please provide client name'],
    trim: true,
  },
  company: {
    type: String,
    required: [true, 'Please provide company name'],
    trim: true,
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  order: {
    type: Number,
    default: 0,
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

// Update the updatedAt timestamp before saving
TestimonialSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

// Add indexes for better query performance
TestimonialSchema.index({ status: 1 });
TestimonialSchema.index({ order: 1 });
TestimonialSchema.index({ createdAt: -1 });

export default mongoose.models.Testimonial || mongoose.model('Testimonial', TestimonialSchema);
