/**
 * Migration to set existing users to minimum currency amounts
 * Sets all users with less than 200 silver to 200 silver
 * Sets all users with less than 10 gold to 10 gold
 * This is a JavaScript file to work with both MongoDB and PostgreSQL
 */

const { MongoClient } = require('mongodb');
const { Pool } = require('pg');

async function migrateMongoDb() {
  const mongoUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/nest-boilerplate';
  const client = new MongoClient(mongoUrl);
  
  try {
    await client.connect();
    const db = client.db();
    const users = db.collection('users');
    
    console.log('🔄 [MIGRATION] Starting MongoDB currency migration...');
    
    // Update users with less than 200 silver
    const silverResult = await users.updateMany(
      { $or: [{ silver: { $lt: 200 } }, { silver: { $exists: false } }] },
      { $set: { silver: 200 } }
    );
    
    // Update users with less than 10 gold
    const goldResult = await users.updateMany(
      { $or: [{ gold: { $lt: 10 } }, { gold: { $exists: false } }] },
      { $set: { gold: 10 } }
    );
    
    // Ensure platinum exists (default to 0 if missing)
    const platinumResult = await users.updateMany(
      { platinum: { $exists: false } },
      { $set: { platinum: 0 } }
    );
    
    console.log(`✅ [MIGRATION] MongoDB migration complete:`);
    console.log(`   - Silver updated: ${silverResult.modifiedCount} users`);
    console.log(`   - Gold updated: ${goldResult.modifiedCount} users`);
    console.log(`   - Platinum initialized: ${platinumResult.modifiedCount} users`);
    
  } catch (error) {
    console.error('❌ [MIGRATION] MongoDB migration error:', error);
    throw error;
  } finally {
    await client.close();
  }
}

async function migratePostgreSQL() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL_ENABLED === 'true' ? { rejectUnauthorized: false } : false,
  });
  
  try {
    console.log('🔄 [MIGRATION] Starting PostgreSQL currency migration...');
    
    // Update users with less than 200 silver or null silver
    const silverResult = await pool.query(
      'UPDATE "user" SET silver = 200 WHERE silver < 200 OR silver IS NULL'
    );
    
    // Update users with less than 10 gold or null gold
    const goldResult = await pool.query(
      'UPDATE "user" SET gold = 10 WHERE gold < 10 OR gold IS NULL'
    );
    
    // Ensure platinum exists (default to 0 if missing)
    const platinumResult = await pool.query(
      'UPDATE "user" SET platinum = 0 WHERE platinum IS NULL'
    );
    
    console.log(`✅ [MIGRATION] PostgreSQL migration complete:`);
    console.log(`   - Silver updated: ${silverResult.rowCount} users`);
    console.log(`   - Gold updated: ${goldResult.rowCount} users`);
    console.log(`   - Platinum initialized: ${platinumResult.rowCount} users`);
    
  } catch (error) {
    console.error('❌ [MIGRATION] PostgreSQL migration error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

async function main() {
  const databaseType = process.env.DATABASE_TYPE || 'postgres';
  
  console.log(`🚀 [MIGRATION] Starting currency migration for ${databaseType}...`);
  
  try {
    if (databaseType === 'mongo') {
      await migrateMongoDb();
    } else {
      await migratePostgreSQL();
    }
    
    console.log('🎉 [MIGRATION] Currency migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('💥 [MIGRATION] Migration failed:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { migrateMongoDb, migratePostgreSQL };