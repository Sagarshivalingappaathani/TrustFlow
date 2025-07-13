#!/usr/bin/env python3

import requests
import json

def test_product_access():
    """Test if we can access products on the blockchain through the backend"""
    
    # Test getting products for a specific user
    try:
        # Test getting all products
        response = requests.get('http://localhost:8002/products')
        print(f"All products endpoint: {response.status_code}")
        if response.status_code == 200:
            products = response.json()
            print(f"Found {len(products)} products")
            for i, product in enumerate(products[:5]):  # Show first 5
                print(f"  Product {i+1}: ID={product.get('id')}, Name='{product.get('name')}', Owner={product.get('currentOwner')}")
        else:
            print(f"Error: {response.text}")
            
        # Test getting a specific product by ID
        for product_id in [1, 2, 3, 4, 5]:
            try:
                response = requests.get(f'http://localhost:8002/product/{product_id}')
                if response.status_code == 200:
                    product = response.json()
                    print(f"Product {product_id}: exists={product.get('exists')}, name='{product.get('name')}'")
                else:
                    print(f"Product {product_id}: {response.status_code} - {response.text}")
            except Exception as e:
                print(f"Product {product_id}: Error - {e}")
            
    except Exception as e:
        print(f"Error testing product access: {e}")

if __name__ == "__main__":
    print("Testing product access through backend...")
    test_product_access()
