#!/usr/bin/env python3

import requests
import json

def test_product_5():
    """Test product 5 with the correct user address"""
    
    try:
        test_data = {
            "product_id": 5,
            "user_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",  # Correct owner
            "private_key": "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"  # Private key for this address
        }
        
        response = requests.post(
            'http://localhost:8002/product/auto-decide',
            headers={'Content-Type': 'application/json'},
            json=test_data
        )
        
        print(f"Product 5 test: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"Success! Response: {json.dumps(result, indent=2)}")
        else:
            print(f"Error response: {response.text}")
            
    except Exception as e:
        print(f"Product 5 test error: {e}")

if __name__ == "__main__":
    print("Testing product 5 with correct user address...")
    test_product_5()
