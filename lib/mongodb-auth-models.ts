import mongoose, { Model, Schema } from "mongoose";

type OtpDoc = {
    email: string;
    otp: string;
    attempts: number;
    purpose: "signup" | "password-reset";
    expiresAt: Date;
};

type RateLimitDoc = {
    key: string;
    count: number;
    expiresAt: Date;
};

const OtpSchema = new Schema({
    email: { type: String, required: true },
    otp: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    purpose: { type: String, enum: ["signup", "password-reset"], default: "signup" },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});
OtpSchema.index({ email: 1, purpose: 1 }, { unique: true });

const RateLimitSchema = new Schema({
    key: { type: String, required: true, unique: true },
    count: { type: Number, default: 1 },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

export const OtpModel = (mongoose.models.Otp as Model<OtpDoc>) || mongoose.model<OtpDoc>("Otp", OtpSchema);
export const RateLimitModel = (mongoose.models.RateLimit as Model<RateLimitDoc>) || mongoose.model<RateLimitDoc>("RateLimit", RateLimitSchema);
