#!/usr/bin/env python3
"""
Script to update farms' lastHarvestAt to yesterday for testing harvest functionality.
"""

import os
from datetime import datetime, timedelta
from pymongo import MongoClient
from urllib.parse import quote_plus

def main():
    # MongoDB connection string from .env
    mongodb_url = "mongodb+srv://nomadniko:123QWEasd@cluster0.vf9ss.mongodb.net/recipes-rn-boiler?retryWrites=true&w=majority&appName=Cluster0"
    
    try:
        # Connect to MongoDB
        client = MongoClient(mongodb_url)
        db = client.get_default_database()
        farms_collection = db['farmschemaclasses']
        
        # Calculate yesterday's date
        yesterday = datetime.utcnow() - timedelta(days=1)
        
        print(f"Connecting to MongoDB...")
        print(f"Setting lastHarvestAt to: {yesterday.isoformat()}Z")
        
        # Update all farms to have lastHarvestAt set to yesterday and add missing fields
        result = farms_collection.update_many(
            {},  # Empty filter = all documents
            {
                "$set": {
                    "lastHarvestAt": yesterday,
                    "health": 100,  # Add health field if missing
                    "updatedAt": datetime.utcnow()
                }
            }
        )
        
        print(f"✅ Updated {result.modified_count} farms")
        
        # Show updated farms
        farms = list(farms_collection.find({}, {
            "name": 1, 
            "lastHarvestAt": 1, 
            "health": 1,
            "level": 1,
            "owner": 1
        }))
        
        print(f"\n📋 Found {len(farms)} farms:")
        for farm in farms:
            health = farm.get('health', 'N/A')
            level = farm.get('level', 1)
            print(f"  - {farm['name']} (Level {level}, Health {health})")
            print(f"    Last Harvest: {farm['lastHarvestAt']}")
            print(f"    Owner: {farm['owner']}")
            print()
        
        # Calculate expected silver for each farm
        now = datetime.utcnow()
        time_diff = now - yesterday
        minutes_passed = int(time_diff.total_seconds() / 60)
        harvest_cycles = minutes_passed // 5  # 5 minutes per cycle
        expected_silver = harvest_cycles * 1  # 1 silver per cycle for level 1
        
        print(f"⏰ Time since yesterday: {minutes_passed} minutes")
        print(f"🔄 Harvest cycles available: {harvest_cycles}")
        print(f"🪙 Expected silver per Level 1 farm: {expected_silver}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        if 'client' in locals():
            client.close()

if __name__ == "__main__":
    main()