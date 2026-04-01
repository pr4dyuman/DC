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
  return mongoose.createConnection(MARKETING_DB_URI, {
    dbName: 'marketing-blog',
    bufferCommands: false,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    tls: true,
    tlsInsecure: false,
    retryWrites: true,
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 60000,
  });
}

export function getMarketingDbConnectionHandle() {
  if (cached.conn) {
    return cached.conn;
  }

  cached.conn = createMarketingConnection();
  return cached.conn;
}

async function dbConnect() {
  if (cached.conn && cached.conn.readyState === 1) {
    return cached.conn;
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
