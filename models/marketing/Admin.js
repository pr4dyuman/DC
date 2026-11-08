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

// Hash password before saving. Mongoose 9 passes no next() to hooks.
AdminSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

AdminSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const marketingConnection = getMarketingDbConnectionHandle();

export default marketingConnection.models.Admin || marketingConnection.model('Admin', AdminSchema);
