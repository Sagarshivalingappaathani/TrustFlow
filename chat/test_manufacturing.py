#!/usr/bin/env python3

"""
Test script to verify manufacturing and product creation is working correctly
"""

import requests
import json

# Test configuration
BASE_URL = "http://localhost:8002"
TEST_USER = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"

def test_user_data():
    """Test fetching user data"""
    print("🔍 Testing user data retrieval...")
    
    response = requests.get(f"{BASE_URL}/blockchain/user/{TEST_USER}")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ User data retrieved successfully")
        print(f"   Company: {data['company']['name']}")
        print(f"   Products: {len(data['products'])}")
        print(f"   Product IDs: {[p.get('id', 'Unknown') for p in data['products']]}")
        return data['products']
    else:
        print(f"❌ Failed to retrieve user data: {response.status_code}")
        return []

def test_health():
    """Test health endpoint"""
    print("🏥 Testing health endpoint...")
    
    response = requests.get(f"{BASE_URL}/health")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Health check passed")
        print(f"   Web3 connected: {data['web3_connected']}")
        print(f"   Gemini connected: {data['gemini_connected']}")
        return True
    else:
        print(f"❌ Health check failed: {response.status_code}")
        return False

def test_market_data():
    """Test market data retrieval"""
    print("🏪 Testing market data retrieval...")
    
    response = requests.get(f"{BASE_URL}/blockchain/market")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Market data retrieved successfully")
        print(f"   Active listings: {len(data.get('activeListings', []))}")
        print(f"   Products: {len(data.get('products', []))}")
        return data
    else:
        print(f"❌ Failed to retrieve market data: {response.status_code}")
        return {}

def main():
    """Run all tests"""
    print("🚀 Starting manufacturing and blockchain tests...\n")
    
    # Test 1: Health check
    if not test_health():
        print("\n❌ Health check failed, aborting tests")
        return
    print()
    
    # Test 2: User data
    products = test_user_data()
    print()
    
    # Test 3: Market data
    market_data = test_market_data()
    print()
    
    # Summary
    print("📊 Test Summary:")
    print(f"   Health Status: ✅ Healthy")
    print(f"   User Products: {len(products)} products found")
    print(f"   Market Listings: {len(market_data.get('activeListings', []))} active listings")
    
    if len(products) == 0:
        print("\n💡 No products found for the test user.")
        print("   This explains why the AI decision system fails with 'Product not found'.")
        print("   Try manufacturing a product first through the frontend.")
    else:
        print(f"\n✅ Products are available! IDs: {[p.get('id') for p in products]}")

if __name__ == "__main__":
    main()
