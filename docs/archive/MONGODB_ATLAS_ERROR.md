# MongoDB Atlas Error 8000 - Troubleshooting Guide

## Current Error

```
MongoServerError: AtlasError
code: 8000
codeName: 'AtlasError'
```

## What This Means

Error code 8000 from MongoDB Atlas typically indicates one of the following issues:

### 1. **Database User Not Configured Properly** (Most Likely)

The database user `maharshiankit05_db_user` may not exist or may not have the correct permissions for the `AgencyOS` database.

**Solution:**
1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Select your project
3. Click "Database Access" in the left sidebar
4. Check if user `maharshiankit05_db_user` exists
5. If it exists, click "Edit" and ensure:
   - Password is set to: `pVqBK5hxBhNylA6P`
   - "Database User Privileges" is set to "Atlas admin" or at least "Read and write to any database"
   - Or specifically grant access to the `AgencyOS` database
6. If the user doesn't exist, create it with the above settings

### 2. **Network Access Not Configured**

Your IP address may not be whitelisted.

**Solution:**
1. Go to "Network Access" in MongoDB Atlas
2. Click "Add IP Address"
3. Either:
   - Click "Add Current IP Address"
   - Or add `0.0.0.0/0` to allow all IPs (development only)
4. Click "Confirm"

### 3. **Incorrect Database Name**

The database name in the connection string might not match what's configured in Atlas.

**Current database name:** `AgencyOS`

**Solution:**
- Verify in Atlas that you want to use `AgencyOS` as the database name
- Or change it in the connection string if needed

### 4. **Cluster Not Ready**

If you just created the cluster, it might still be provisioning.

**Solution:**
- Wait a few minutes for the cluster to fully provision
- Check the Atlas dashboard to ensure the cluster status is "Active"

## Steps to Fix

### Step 1: Verify Database User

```
1. Login to MongoDB Atlas
2. Go to "Database Access"
3. Find or create user: maharshiankit05_db_user
4. Set password: pVqBK5hxBhNylA6P
5. Grant "Read and write to any database" permission
6. Click "Update User" or "Add User"
```

### Step 2: Whitelist IP Address

```
1. Go to "Network Access"
2. Click "Add IP Address"
3. Add your current IP or 0.0.0.0/0
4. Click "Confirm"
```

### Step 3: Test Connection

After making the above changes, test the connection:

```bash
npx tsx scripts/test-connection.ts
```

You should see:
```
✅ MongoDB Connected Successfully
✅ Connection successful!
```

### Step 4: Run Migration

Once the connection is successful:

```bash
npm run migrate
```

## Alternative: Create New Database User

If the current user has issues, create a new one:

1. Go to "Database Access" in Atlas
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Username: `agency_os_user` (or any name you prefer)
5. Password: Create a strong password (no special characters to avoid encoding issues)
6. Database User Privileges: "Read and write to any database"
7. Click "Add User"
8. Update the connection string in `lib/mongodb.ts`:

```typescript
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://NEW_USERNAME:NEW_PASSWORD@cluster0.7i5lvqh.mongodb.net/AgencyOS?retryWrites=true&w=majority';
```

## Common Mistakes

❌ **Wrong password** - Ensure password matches exactly  
❌ **IP not whitelisted** - Check Network Access settings  
❌ **User doesn't have permissions** - Grant proper database access  
❌ **Special characters in password** - May need URL encoding  
❌ **Cluster not active** - Wait for provisioning to complete  

## Next Steps

1. Fix the database user configuration in Atlas
2. Whitelist your IP address
3. Test the connection
4. Run the migration
5. Start your application

## Need Help?

If you continue to experience issues:
1. Check the MongoDB Atlas dashboard for any alerts
2. Verify the cluster is in "Active" state
3. Try creating a new database user with a simple password (no special characters)
4. Ensure you're using the correct cluster URL
