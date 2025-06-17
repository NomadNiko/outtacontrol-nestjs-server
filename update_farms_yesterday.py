#!/usr/bin/env python3
"""
Script to update all farms' lastHarvestAt to yesterday for testing harvest functionality.
"""

import os
from datetime import datetime, timedelta
from pymongo import MongoClient
from bson import ObjectId

def main():
    # MongoDB connection string
    mongodb_url = "mongodb+srv://nomadniko:123QWEasd@cluster0.vf9ss.mongodb.net/recipes-rn-boiler?retryWrites=true&w=majority&appName=Cluster0"
    
    try:
        # Connect to MongoDB
        client = MongoClient(mongodb_url)
        db = client.get_default_database()
        farms_collection = db['farmschemaclasses']
        
        print(f"🔌 Connected to MongoDB...")
        
        # Set yesterday's date
        yesterday = datetime.utcnow() - timedelta(days=1)
        
        print(f"📅 Setting all farms' lastHarvestAt to: {yesterday}")
        
        # Update all farms
        result = farms_collection.update_many(
            {},
            {
                "$set": {
                    "lastHarvestAt": yesterday,
                    "health": 100,
                    "updatedAt": datetime.utcnow()
                }
            }
        )
        
        print(f"✅ Updated {result.modified_count} farms")
        
        # Show a few farms to verify
        print(f"\n📋 Sample farms after update:")
        farms = list(farms_collection.find().limit(3))
        for farm in farms:
            print(f"  Farm: {farm.get('name', 'N/A')}")
            print(f"    lastHarvestAt: {farm.get('lastHarvestAt', 'MISSING')}")
            print(f"    health: {farm.get('health', 'MISSING')}")
            
            # Calculate expected harvest
            if farm.get('lastHarvestAt'):
                time_diff = datetime.utcnow() - farm['lastHarvestAt']
                total_minutes = int(time_diff.total_seconds() / 60)
                harvest_cycles = total_minutes // 5
                silver_earned = harvest_cycles * 1  # Level 1 farm = 1 silver per cycle
                print(f"    Expected harvest: {silver_earned} silver ({harvest_cycles} cycles)")
            print()
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        if 'client' in locals():
            client.close()

if __name__ == "__main__":
    main()