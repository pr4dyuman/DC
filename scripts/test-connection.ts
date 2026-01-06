import { connectDB } from '../lib/mongodb';

async function testConnection() {
    try {
        console.log('Testing MongoDB connection...');
        await connectDB();
        console.log('✅ Connection successful!');
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Connection failed:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    }
}

testConnection();
