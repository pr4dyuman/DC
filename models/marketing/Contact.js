import mongoose from 'mongoose';
import { getMarketingDbConnectionHandle } from '@/lib/marketing-db';

const ContactSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please provide a valid email',
    ],
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    required: [true, 'Please provide a phone number'],
    trim: true,
  },
  companyName: {
    type: String,
    trim: true,
  },
  message: {
    type: String,
    required: [true, 'Please provide a message'],
    minlength: [10, 'Message must be at least 10 characters long'],
  },
  source: {
    type: String,
    default: 'contact_page',
    trim: true,
  },
  userEmailStatus: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'skipped'],
    default: 'pending',
  },
  adminEmailStatus: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'skipped'],
    default: 'pending',
  },
  emailError: {
    type: String,
    trim: true,
  },
  readAt: {
    type: Date,
  },
}, { timestamps: true });

const marketingConnection = getMarketingDbConnectionHandle();

export default marketingConnection.models.Contact || marketingConnection.model('Contact', ContactSchema);
