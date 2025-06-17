#!/usr/bin/env python3
"""
Script to check the user document in MongoDB and see the actual field structure.
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
        users_collection = db['userschemaclasses']
        
        print(f"Connecting to MongoDB...")
        
        # Find all users first to see the ID format
        print("📋 All users in collection:")
        all_users = list(users_collection.find({}, {"_id": 1, "email": 1, "platinum": 1, "gold": 1, "silver": 1}))
        for u in all_users:
            print(f"  ID: {u['_id']} (type: {type(u['_id'])}) - Email: {u.get('email', 'N/A')}")
            print(f"    Currency: P={u.get('platinum', 'MISSING')} G={u.get('gold', 'MISSING')} S={u.get('silver', 'MISSING')}")
        
        # Find the test user by email
        user = users_collection.find_one({"email": "aloha@ixplor.app"})
        
        if user:
            print(f"✅ Found user: {user.get('email', 'N/A')}")
            print(f"📄 Full user document:")
            
            # Print all fields in the user document
            for key, value in user.items():
                print(f"  {key}: {value}")
            
            print(f"\n🏦 Currency fields:")
            print(f"  platinum: {user.get('platinum', 'MISSING')}")
            print(f"  gold: {user.get('gold', 'MISSING')}")
            print(f"  silver: {user.get('silver', 'MISSING')}")
            
            # Check if currency fields exist at all
            has_platinum = 'platinum' in user
            has_gold = 'gold' in user
            has_silver = 'silver' in user
            
            print(f"\n✅ Field existence:")
            print(f"  platinum exists: {has_platinum}")
            print(f"  gold exists: {has_gold}")
            print(f"  silver exists: {has_silver}")
            
            # Try to update the user with currency values
            print(f"\n🔄 Updating user with test currency...")
            result = users_collection.update_one(
                {"email": "aloha@ixplor.app"},
                {
                    "$set": {
                        "platinum": 10,
                        "gold": 20,
                        "silver": 30,
                        "updatedAt": datetime.utcnow()
                    }
                }
            )
            
            print(f"✅ Update result: {result.modified_count} document(s) modified")
            
            # Read the user again to confirm update
            updated_user = users_collection.find_one({"email": "aloha@ixplor.app"})
            if updated_user:
                print(f"\n💰 Updated currency values:")
                print(f"  platinum: {updated_user.get('platinum', 'MISSING')}")
                print(f"  gold: {updated_user.get('gold', 'MISSING')}")
                print(f"  silver: {updated_user.get('silver', 'MISSING')}")
                print(f"  updatedAt: {updated_user.get('updatedAt', 'MISSING')}")
        else:
            print(f"❌ User not found with ID: {user_id}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        if 'client' in locals():
            client.close()

if __name__ == "__main__":
    main()