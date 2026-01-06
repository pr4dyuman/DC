# MongoDB Setup Guide for Agency-OS

## Overview

This guide covers the complete MongoDB integration for the agency-os project. The system has been migrated from JSON file-based storage to MongoDB Atlas.

## Prerequisites

- MongoDB Atlas account with a cluster
- Node.js and npm installed
- Mongoose package (already installed)

## Environment Configuration

### Step 1: Set Up Environment Variables

You need to add your MongoDB connection string to the `.env.local` file:

```env
MONGODB_URI=mongodb+srv://maharshiankit05_db_user:iahVxbjfNs0hQYbS@cluster0.7i5lvqh.mongodb.net/AgencyOS?retryWrites=true&w=majority
```

**Important Notes:**
- The `.env.local` file is gitignored for security
- If your password contains special characters, you may need to URL-encode them
- The connection string includes `retryWrites=true&w=majority` for reliability

### Step 2: Verify Connection

Test your MongoDB connection:

```bash
npx tsx scripts/test-connection.ts
```

If successful, you'll see:
```
✅ MongoDB Connected Successfully
✅ Connection successful!
```

## Database Schema

The following collections have been created with Mongoose schemas:

### Collections

1. **users** - User accounts (admin, employees, specialists)
2. **clients** - Client information and company details
3. **projects** - Project management with services and payment configs
4. **tasks** - Task assignments with comments and priorities
5. **invoices** - Invoice tracking and payment status
6. **transactions** - Financial transactions (income/expense)
7. **services** - Service definitions with job listings
8. **notifications** - User notifications
9. **activities** - System activity logs
10. **assets** - Project assets and files
11. **messages** - User messaging system
12. **leaveRequests** - Leave management
13. **settings** - System-wide configuration

### Key Features

- **Indexes**: Optimized queries on frequently accessed fields (id, email, projectId, etc.)
- **Timestamps**: Automatic createdAt and updatedAt fields
- **Validation**: Schema-level validation matching TypeScript types
- **Embedded Documents**: Support for nested data (comments, payment configs)

## Data Migration

### Running the Migration

To import your existing data from `data/db.json` into MongoDB:

```bash
npm run migrate
```

### What the Migration Does

1. Connects to MongoDB Atlas
2. Clears existing collections (if any)
3. Reads data from `data/db.json`
4. Validates and inserts data into MongoDB
5. Creates indexes for performance
6. Provides a detailed summary

### Migration Output

You'll see progress for each collection:

```
🚀 Starting MongoDB Migration...
📡 Connecting to MongoDB...
✅ Connected to MongoDB

📖 Reading db.json...
✅ Successfully read db.json

🗑️  Clearing existing collections...
✅ Collections cleared

👥 Migrating 2 users...
✅ Users migrated

🏢 Migrating 1 clients...
✅ Clients migrated

... (and so on for all collections)

📊 Migration Summary:
====================
Users:         2
Clients:       1
Projects:      1
Tasks:         2
Invoices:      2
Transactions:  1
Services:      3
...

✅ Migration completed successfully!
```

## Application Structure

### Core Files

#### `lib/mongodb.ts`
- MongoDB connection management
- Mongoose schema definitions
- Model exports

#### `lib/db.ts`
- Database abstraction layer
- Maintains backward compatibility with existing code
- Provides `db.get()` and `db.update()` methods

#### `lib/actions.ts`
- Server actions for data operations
- Uses the db layer for all database interactions

#### `scripts/migrate-to-mongodb.ts`
- One-time migration script
- Imports data from db.json to MongoDB

## Troubleshooting

### Connection Issues

**Problem**: "MongoServerError: bad auth"
- **Solution**: Verify your username and password in the connection string
- Check that the database user has proper permissions in MongoDB Atlas

**Problem**: "MongoNetworkError: connection timeout"
- **Solution**: 
  - Check your internet connection
  - Verify that your IP address is whitelisted in MongoDB Atlas
  - Go to Network Access in Atlas and add your current IP or use `0.0.0.0/0` for all IPs (development only)

**Problem**: Special characters in password
- **Solution**: URL-encode special characters in your password
  - Example: `p@ssw0rd!` becomes `p%40ssw0rd%21`

### Migration Issues

**Problem**: "Database not found" error
- **Solution**: Ensure `data/db.json` exists and contains valid JSON

**Problem**: Duplicate key errors
- **Solution**: Clear the MongoDB collections manually or run the migration script again (it clears collections automatically)

### Application Issues

**Problem**: App can't connect to database
- **Solution**: 
  - Restart the development server: `npm run dev`
  - Check that `.env.local` is in the project root
  - Verify the MONGODB_URI environment variable is set correctly

## MongoDB Atlas Configuration

### Network Access

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Go to "Network Access" in the left sidebar
3. Click "Add IP Address"
4. Either:
   - Add your current IP address
   - Add `0.0.0.0/0` to allow access from anywhere (development only, not recommended for production)

### Database User

1. Go to "Database Access" in MongoDB Atlas
2. Verify your user (`maharshiankit05_db_user`) has:
   - Read and write permissions
   - Access to the `AgencyOS` database

## Performance Optimization

### Indexes

The following indexes are automatically created:

- **Users**: `id`, `email`, `username`
- **Clients**: `id`, `email`, `username`, `archived`
- **Projects**: `id`, `clientId`, `status`, `slug`
- **Tasks**: `id`, `projectId`, `assigneeId`, `status`, `createdBy`
- **Transactions**: `id`, `projectId`, `userId`, `type`, `category`, `date`
- And more...

### Query Optimization

- Use `.lean()` for read-only queries (faster, returns plain objects)
- Use projections to fetch only needed fields
- Leverage indexes for filtering and sorting

## Backup and Restore

### Manual Backup

Export data from MongoDB:

```bash
mongodump --uri="your-connection-string" --out=./backup
```

### Restore from Backup

```bash
mongorestore --uri="your-connection-string" ./backup
```

### Backup db.json

Your original `data/db.json` file is preserved and can serve as a backup.

## Next Steps

1. ✅ MongoDB schemas created
2. ✅ Connection module implemented
3. ✅ Migration script ready
4. ✅ Database layer refactored
5. ⏳ **Verify MongoDB connection** (check Network Access in Atlas)
6. ⏳ **Run migration** (`npm run migrate`)
7. ⏳ **Test application** (`npm run dev`)
8. ⏳ **Verify all features work** with MongoDB

## Support

If you encounter issues:

1. Check the MongoDB Atlas dashboard for connection logs
2. Verify your network access settings
3. Ensure the database user has proper permissions
4. Check the console for detailed error messages

## Security Best Practices

- ✅ Never commit `.env.local` to version control
- ✅ Use strong passwords for database users
- ✅ Restrict IP access in production
- ✅ Use environment-specific connection strings
- ✅ Regularly rotate database credentials
