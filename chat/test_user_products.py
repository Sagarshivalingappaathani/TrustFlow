#!/usr/bin/env python3

import requests
import json

def test_user_products():
    """Test the debug endpoint to see what products exist for users"""
    
    # Test addresses from the frontend/blockchain
    test_addresses = [
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",  # Default test address
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",  # Second test address
        "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",  # Third test address
    ]
    
    for address in test_addresses:
        try:
            response = requests.get(f'http://localhost:8002/debug/user-products/{address}')
            
            print(f"\nUser: {address}")
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"Product count: {result['product_count']}")
                print(f"Product IDs: {result['product_ids']}")
                for product in result['products']:
                    print(f"  - Product {product['id']}: {product['name']} (Owner: {product['currentOwner']})")
            else:
                print(f"Error: {response.text}")
                
        except Exception as e:
            print(f"Error testing address {address}: {e}")

if __name__ == "__main__":
    print("Testing user products debug endpoint...")
    test_user_products()
