#!/usr/bin/env python3

"""
Test script to debug the ABI mismatch issue
"""

import sys
import os
sys.path.append('/home/sagar0418/scm/backend_copy')

from web3_service import web3_service

def test_product_access():
    """Test direct access to blockchain products"""
    print("🔍 Testing direct blockchain product access...\n")
    
    test_user = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"  # Proper checksum format
    
    # Test connection
    if not web3_service.is_connected():
        print("❌ Web3 service not connected")
        return
    
    print("✅ Web3 service connected")
    
    # Test getting user's product IDs
    try:
        product_ids = web3_service.contract.functions.getProductsByOwner(test_user).call()
        print(f"📦 User's product IDs: {list(product_ids)}")
        
        # Test accessing each product
        for product_id in product_ids:
            print(f"\n🔍 Testing product ID {product_id}:")
            try:
                # Try raw contract call
                raw_product = web3_service.contract.functions.getProduct(product_id).call()
                print(f"   ✅ Raw call successful, data length: {len(raw_product) if isinstance(raw_product, (list, tuple)) else 'N/A'}")
                print(f"   📊 Raw data preview: {str(raw_product)[:100]}...")
                
                # Try the service method
                product_details = web3_service.get_product_details(product_id)
                if product_details:
                    print(f"   ✅ Service method successful: {product_details.get('name', 'Unknown')}")
                else:
                    print(f"   ❌ Service method failed")
                    
            except Exception as e:
                print(f"   ❌ Error accessing product {product_id}: {e}")
    
    except Exception as e:
        print(f"❌ Error getting product IDs: {e}")

if __name__ == "__main__":
    test_product_access()
