// Manual migration to add health fields to walls collection
// Run this with: node src/database/migrations/add-wall-health-fields.js

const { MongoClient } = require('mongodb');

async function addWallHealthFields() {
  // Get MongoDB URL from environment or use default
  const mongoUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/api';
  
  const client = new MongoClient(mongoUrl);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const wallsCollection = db.collection('wallschemaclasses');

    // Update all existing walls to add health fields
    const result = await wallsCollection.updateMany(
      {}, // Empty filter = all documents
      {
        $set: {
          health: 100,      // All walls start at full health
          level: 1,         // All walls start at level 1
          lastDamageAt: null,
          lastHealAt: null
        }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} walls with health fields`);

    // Create indexes for efficient queries
    await wallsCollection.createIndex({ health: 1 });
    await wallsCollection.createIndex({ level: 1 });
    console.log('✅ Created indexes for health and level fields');

  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('Migration completed');
  }
}

// Run the migration
addWallHealthFields();