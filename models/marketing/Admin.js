import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { getMarketingDbConnectionHandle } from '@/lib/marketing-db';

const AdminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
});

// Hash password before saving
AdminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

AdminSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const marketingConnection = getMarketingDbConnectionHandle();

export default marketingConnection.models.Admin || marketingConnection.model('Admin', AdminSchema);
