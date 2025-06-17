#!/usr/bin/env python3
"""
Script to test the harvest endpoint and see backend logging.
"""

import requests
import json

def main():
    base_url = "http://192.168.0.194:3030/api/v1"
    
    print("🔐 Logging in...")
    
    # Login to get JWT token
    login_response = requests.post(f"{base_url}/auth/email/login", json={
        "email": "aloha@ixplor.app",
        "password": "password"
    })
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code} - {login_response.text}")
        return
    
    login_data = login_response.json()
    token = login_data.get("token")
    
    if not token:
        print(f"❌ No token received from login")
        return
    
    print(f"✅ Login successful")
    
    # Get user's farms
    print(f"\n🚜 Getting user's farms...")
    farms_response = requests.get(f"{base_url}/farms/my-farms", headers={
        "Authorization": f"Bearer {token}"
    })
    
    if farms_response.status_code != 200:
        print(f"❌ Failed to get farms: {farms_response.status_code} - {farms_response.text}")
        return
    
    farms = farms_response.json()
    print(f"📋 Found {len(farms)} farm(s)")
    
    if not farms:
        print("❌ No farms found to harvest")
        return
    
    # Use the first farm
    farm = farms[0]
    farm_id = farm["id"]
    print(f"🎯 Using farm: {farm['name']} (ID: {farm_id})")
    print(f"   LastHarvestAt: {farm.get('lastHarvestAt', 'N/A')}")
    print(f"   Health: {farm.get('health', 'N/A')}")
    
    # Get current user data before harvest
    print(f"\n👤 Getting current user data...")
    user_response = requests.get(f"{base_url}/auth/me", headers={
        "Authorization": f"Bearer {token}"
    })
    
    if user_response.status_code == 200:
        user_data = user_response.json()
        print(f"💰 Current currency:")
        print(f"   Platinum: {user_data.get('platinum', 'N/A')}")
        print(f"   Gold: {user_data.get('gold', 'N/A')}")
        print(f"   Silver: {user_data.get('silver', 'N/A')}")
    
    # Harvest the farm
    print(f"\n🌾 Harvesting farm {farm_id}...")
    harvest_response = requests.post(f"{base_url}/farms/{farm_id}/harvest", headers={
        "Authorization": f"Bearer {token}"
    })
    
    print(f"📡 Harvest response status: {harvest_response.status_code}")
    
    if harvest_response.status_code == 200:
        harvest_data = harvest_response.json()
        print(f"✅ Harvest successful!")
        print(f"🎉 Response data:")
        print(json.dumps(harvest_data, indent=2))
        
        # Get user data after harvest to confirm currency update
        print(f"\n👤 Getting updated user data...")
        updated_user_response = requests.get(f"{base_url}/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        
        if updated_user_response.status_code == 200:
            updated_user_data = updated_user_response.json()
            print(f"💰 Updated currency:")
            print(f"   Platinum: {updated_user_data.get('platinum', 'N/A')}")
            print(f"   Gold: {updated_user_data.get('gold', 'N/A')}")
            print(f"   Silver: {updated_user_data.get('silver', 'N/A')}")
    else:
        print(f"❌ Harvest failed: {harvest_response.text}")

if __name__ == "__main__":
    main()