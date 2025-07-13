#!/usr/bin/env python3

import requests
import json

def test_auto_decide():
    """Test the auto-decide endpoint with a known working product"""
    
    try:
        test_data = {
            "product_id": 4,  # Known existing product
            "user_address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",  # Test address
            "private_key": "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"  # Test private key
        }
        
        response = requests.post(
            'http://localhost:8002/product/auto-decide',
            headers={'Content-Type': 'application/json'},
            json=test_data
        )
        
        print(f"Auto-decide endpoint: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"Success! Response: {json.dumps(result, indent=2)}")
        else:
            print(f"Error response: {response.text}")
            
    except Exception as e:
        print(f"Auto-decide endpoint error: {e}")

def test_with_new_product():
    """Test with a potentially new product ID"""
    
    try:
        test_data = {
            "product_id": 5,  # The product ID from the error
            "user_address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",  # Test address
            "private_key": "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"  # Test private key
        }
        
        response = requests.post(
            'http://localhost:8002/product/auto-decide',
            headers={'Content-Type': 'application/json'},
            json=test_data
        )
        
        print(f"New product test: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"Success! Response: {json.dumps(result, indent=2)}")
        else:
            print(f"Error response: {response.text}")
            
    except Exception as e:
        print(f"New product test error: {e}")

if __name__ == "__main__":
    print("Testing auto-decide endpoint...")
    test_auto_decide()
    print("\nTesting with new product ID...")
    test_with_new_product()
