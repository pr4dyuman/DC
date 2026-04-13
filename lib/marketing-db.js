import mongoose from 'mongoose';

const MARKETING_DB_URI = process.env.MARKETING_DB_URI || process.env.MONGODB_URI;

if (!MARKETING_DB_URI) {
  throw new Error(
    'Please define the MARKETING_DB_URI or MONGODB_URI environment variable inside .env.local'
  );
}

let cached = global.marketingMongoose;

if (!cached) {
  cached = global.marketingMongoose = { conn: null, promise: null };
}

function createMarketingConnection() {
  const conservativePoolProfile = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.SERVERLESS
  );

  return mongoose.createConnection(MARKETING_DB_URI, {
    dbName: 'marketing-blog',
    bufferCommands: false,
    serverSelectionTimeoutMS: conservativePoolProfile ? 5000 : 10000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: conservativePoolProfile ? 8000 : 10000,
    tls: true,
    tlsInsecure: false,
    retryWrites: true,
    maxPoolSize: conservativePoolProfile ? 3 : 10,
    minPoolSize: 0,
    maxIdleTimeMS: conservativePoolProfile ? 30000 : 60000,
    maxConnecting: conservativePoolProfile ? 2 : 4,
  });
}

export function getMarketingDbConnectionHandle() {
  if (cached.conn && cached.conn.readyState !== 0 && cached.conn.readyState !== 3) {
    return cached.conn;
  }

  cached.conn = createMarketingConnection();
  return cached.conn;
}

async function dbConnect() {
  if (cached.conn && cached.conn.readyState === 1) {
    return cached.conn;
  }

  if (cached.conn && cached.conn.readyState === 2 && cached.promise) {
    cached.conn = await cached.promise;
    return cached.conn;
  }

  if (cached.conn && (cached.conn.readyState === 0 || cached.conn.readyState === 3)) {
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise) {
    const connection = getMarketingDbConnectionHandle();
    cached.promise = connection.asPromise()
      .then(() => connection)
      .catch((error) => {
        cached.promise = null;
        cached.conn = null;
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
