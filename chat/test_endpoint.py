#!/usr/bin/env python3

import requests
import json

def test_backend():
    """Test if the backend is running and responsive"""
    
    # Test health endpoint
    try:
        response = requests.get('http://localhost:8002/health')
        print(f"Health endpoint: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"Health endpoint error: {e}")
        return False
    
    # Test product auto-decide endpoint with a mock request
    try:
        test_data = {
            "product_id": 4,  # Use a known existing product
            "user_address": "0x70997970c51812dc3a010c7d01b50e0d17dc79c8"  # Test address
        }
        
        response = requests.post(
            'http://localhost:8002/product/auto-decide',
            headers={'Content-Type': 'application/json'},
            json=test_data
        )
        
        print(f"Auto-decide endpoint: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"Response: {json.dumps(result, indent=2)}")
        else:
            print(f"Error response: {response.text}")
            
    except Exception as e:
        print(f"Auto-decide endpoint error: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("Testing backend endpoints...")
    test_backend()
