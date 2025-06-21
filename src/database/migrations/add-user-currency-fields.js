// Manual migration to add currency fields to users collection
// Run this with: node src/database/migrations/add-user-currency-fields.js

const { MongoClient } = require('mongodb');

async function addUserCurrencyFields() {
  // Get MongoDB URL from environment or use default
  const mongoUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/api';
  
  const client = new MongoClient(mongoUrl);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const usersCollection = db.collection('userschemaclasses');

    // Update all existing users to add currency fields
    const result = await usersCollection.updateMany(
      {}, // Empty filter = all documents
      {
        $set: {
          platinum: 0,    // All users start with 0 platinum
          gold: 0,        // All users start with 0 gold
          silver: 0       // All users start with 0 silver
        }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} users with currency fields`);

    // Create indexes for efficient queries on currency fields
    await usersCollection.createIndex({ platinum: 1 });
    await usersCollection.createIndex({ gold: 1 });
    await usersCollection.createIndex({ silver: 1 });
    console.log('✅ Created indexes for currency fields');

    // Also create a compound index for all currency fields
    await usersCollection.createIndex({ platinum: 1, gold: 1, silver: 1 });
    console.log('✅ Created compound index for all currency fields');

  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('Migration completed');
  }
}

// Run the migration
addUserCurrencyFields();