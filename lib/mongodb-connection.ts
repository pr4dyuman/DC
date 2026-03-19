import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error("Please define the MONGODB_URI environment variable in .env.local");
}

const mongoUri: string = MONGODB_URI;

interface MongooseConnection {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
}

declare global {
    var mongoose: MongooseConnection | undefined;
}

const cached: MongooseConnection = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
    global.mongoose = cached;
}

export async function connectMongo() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        };

        console.log("Attempting to connect to MongoDB...");

        cached.promise = mongoose.connect(mongoUri, opts)
            .then((mongooseInstance) => {
                console.log("MongoDB connected successfully");
                return mongooseInstance;
            })
            .catch((error) => {
                console.error("MongoDB connection error:", error.message);
                throw error;
            });
    }

    try {
        cached.conn = await cached.promise;
    } catch (error: unknown) {
        cached.promise = null;
        console.error("Failed to establish MongoDB connection:", error instanceof Error ? error.message : String(error));
        throw error;
    }

    return cached.conn;
}
