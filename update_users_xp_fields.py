#!/usr/bin/env python3
"""
Script to update existing users in MongoDB with XP and level fields.
This script adds the new fields required for the XP leveling system.
"""

import os
import sys
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime

def load_environment():
    """Load environment variables from .env file"""
    load_dotenv()
    return os.getenv('DATABASE_URL')

def connect_to_database(connection_string):
    """Connect to MongoDB database"""
    try:
        client = MongoClient(connection_string)
        # Extract database name from connection string
        # Format: mongodb+srv://user:pass@cluster.mongodb.net/dbname?options
        db_name = connection_string.split('/')[-1].split('?')[0]
        db = client[db_name]
        
        # Test the connection
        db.command('ping')
        print(f"✅ Successfully connected to MongoDB database: {db_name}")
        return db
    except Exception as e:
        print(f"❌ Error connecting to MongoDB: {e}")
        return None

def get_users_collection(db):
    """Get the users collection"""
    # The collection name should be 'userschemaclasses' based on NestJS naming convention
    collection = db['userschemaclasses']
    return collection

def analyze_users(collection):
    """Analyze current users and their fields"""
    print("\n📊 Analyzing current users...")
    
    total_users = collection.count_documents({})
    print(f"📝 Total users in database: {total_users}")
    
    if total_users == 0:
        print("ℹ️  No users found in database")
        return 0, 0
    
    # Check how many users are missing XP fields
    users_without_xp = collection.count_documents({"xp": {"$exists": False}})
    users_without_level = collection.count_documents({"level": {"$exists": False}})
    
    print(f"📝 Users missing 'xp' field: {users_without_xp}")
    print(f"📝 Users missing 'level' field: {users_without_level}")
    
    # Show sample user document (without sensitive data)
    sample_user = collection.find_one({}, {"password": 0, "socialId": 0})
    if sample_user:
        print("\n📄 Sample user document structure:")
        for key in sample_user.keys():
            if key not in ['password', 'socialId']:
                print(f"  - {key}: {type(sample_user[key]).__name__}")
    
    return users_without_xp, users_without_level

def update_users_with_xp_fields(collection):
    """Update users that are missing XP and level fields"""
    print("\n🔄 Updating users with XP and level fields...")
    
    # Update documents that don't have XP field
    xp_update_result = collection.update_many(
        {"xp": {"$exists": False}},
        {"$set": {"xp": 0}}
    )
    
    # Update documents that don't have level field
    level_update_result = collection.update_many(
        {"level": {"$exists": False}},
        {"$set": {"level": 1}}
    )
    
    print(f"✅ Updated {xp_update_result.modified_count} users with 'xp' field (set to 0)")
    print(f"✅ Updated {level_update_result.modified_count} users with 'level' field (set to 1)")
    
    return xp_update_result.modified_count, level_update_result.modified_count

def verify_updates(collection):
    """Verify that all users now have the required fields"""
    print("\n🔍 Verifying updates...")
    
    total_users = collection.count_documents({})
    users_with_xp = collection.count_documents({"xp": {"$exists": True}})
    users_with_level = collection.count_documents({"level": {"$exists": True}})
    
    print(f"📊 Total users: {total_users}")
    print(f"✅ Users with 'xp' field: {users_with_xp}")
    print(f"✅ Users with 'level' field: {users_with_level}")
    
    if users_with_xp == total_users and users_with_level == total_users:
        print("🎉 All users successfully updated!")
        return True
    else:
        print("⚠️  Some users are still missing required fields!")
        return False

def show_sample_updated_users(collection, limit=3):
    """Show a few sample users to verify the updates"""
    print(f"\n👥 Sample of updated users (showing {limit}):")
    
    users = collection.find({}, {
        "email": 1, 
        "firstName": 1, 
        "lastName": 1, 
        "xp": 1, 
        "level": 1, 
        "platinum": 1, 
        "gold": 1, 
        "silver": 1,
        "createdAt": 1
    }).limit(limit)
    
    for i, user in enumerate(users, 1):
        print(f"\n  User {i}:")
        print(f"    Email: {user.get('email', 'N/A')}")
        print(f"    Name: {user.get('firstName', '')} {user.get('lastName', '')}")
        print(f"    XP: {user.get('xp', 'N/A')}")
        print(f"    Level: {user.get('level', 'N/A')}")
        print(f"    Currency: {user.get('platinum', 0)}💎 {user.get('gold', 0)}🥇 {user.get('silver', 0)}🥈")
        print(f"    Created: {user.get('createdAt', 'N/A')}")

def main():
    """Main function"""
    print("🚀 MongoDB User XP Fields Update Script")
    print("=" * 50)
    
    # Load environment variables
    connection_string = load_environment()
    if not connection_string:
        print("❌ Error: DATABASE_URL not found in environment variables")
        print("Make sure .env file exists and contains DATABASE_URL")
        sys.exit(1)
    
    # Connect to database
    db = connect_to_database(connection_string)
    if db is None:
        sys.exit(1)
    
    # Get users collection
    collection = get_users_collection(db)
    
    try:
        # Analyze current state
        users_without_xp, users_without_level = analyze_users(collection)
        
        if users_without_xp == 0 and users_without_level == 0:
            print("\n✅ All users already have XP and level fields!")
            show_sample_updated_users(collection)
            return
        
        # Proceed with update automatically
        print(f"\n⚠️  About to update {max(users_without_xp, users_without_level)} users")
        print("This will add:")
        print("  - 'xp': 0 (for users missing XP field)")
        print("  - 'level': 1 (for users missing level field)")
        print("\n✅ Proceeding automatically...")
        
        # Update users
        xp_updates, level_updates = update_users_with_xp_fields(collection)
        
        # Verify updates
        success = verify_updates(collection)
        
        if success:
            show_sample_updated_users(collection)
            print(f"\n🎉 Update completed successfully!")
            print(f"📊 Summary:")
            print(f"  - XP field added to {xp_updates} users")
            print(f"  - Level field added to {level_updates} users")
        else:
            print("\n❌ Update completed with issues. Please check manually.")
            
    except Exception as e:
        print(f"\n❌ Error during update process: {e}")
        sys.exit(1)
    
    print("\n✅ Script completed!")

if __name__ == "__main__":
    main()