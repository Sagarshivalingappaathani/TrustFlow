#!/usr/bin/env python3
"""
Comprehensive Test Script for Agentic Product Decision System
This script tests all the components of the agentic decision system.
"""

import requests
import json
import time
from typing import Dict, Any

# Configuration
BACKEND_URL = "http://localhost:8002"
TEST_USER_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"  # Hardhat account 0
TEST_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"  # Hardhat account 0 private key

class SystemTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.user_address = TEST_USER_ADDRESS
        self.private_key = TEST_PRIVATE_KEY
        self.test_results = []

    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })

    def test_backend_connection(self):
        """Test if backend is running and accessible"""
        try:
            response = requests.get(f"{self.base_url}/health", timeout=5)
            if response.status_code == 200:
                data = response.json()
                details = f"Gemini: {data.get('gemini_connected')}, Web3: {data.get('web3_connected')}"
                self.log_test("Backend Connection", True, details)
                return True
            else:
                self.log_test("Backend Connection", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Backend Connection", False, str(e))
            return False

    def test_blockchain_data(self):
        """Test blockchain data retrieval"""
        try:
            response = requests.get(f"{self.base_url}/blockchain/user/{self.user_address}")
            if response.status_code == 200:
                data = response.json()
                details = f"Products: {len(data.get('products', []))}, Transactions: {len(data.get('transactions', []))}"
                self.log_test("Blockchain Data Retrieval", True, details)
                return data
            else:
                self.log_test("Blockchain Data Retrieval", False, f"Status: {response.status_code}")
                return None
        except Exception as e:
            self.log_test("Blockchain Data Retrieval", False, str(e))
            return None

    def test_market_data(self):
        """Test market data endpoint"""
        try:
            response = requests.get(f"{self.base_url}/blockchain/market")
            if response.status_code == 200:
                data = response.json()
                market = data.get('market', {})
                details = f"Active Listings: {market.get('totalListings', 0)}, Avg Price: {market.get('avgPrice', 0)}"
                self.log_test("Market Data", True, details)
                return data
            else:
                self.log_test("Market Data", False, f"Status: {response.status_code}")
                return None
        except Exception as e:
            self.log_test("Market Data", False, str(e))
            return None

    def test_ai_chat(self):
        """Test AI chat functionality"""
        try:
            payload = {
                "message": "What's my current inventory status?",
                "user_address": self.user_address,
                "conversation_history": []
            }
            response = requests.post(f"{self.base_url}/chat/with-data", json=payload, timeout=30)
            if response.status_code == 200:
                data = response.json()
                details = f"Response length: {len(data.get('response', ''))}"
                self.log_test("AI Chat with Blockchain Data", True, details)
                return True
            else:
                self.log_test("AI Chat with Blockchain Data", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("AI Chat with Blockchain Data", False, str(e))
            return False

    def test_decision_endpoints(self):
        """Test decision-related endpoints"""
        try:
            # Test decision history
            response = requests.get(f"{self.base_url}/product/decision-history/{self.user_address}")
            if response.status_code == 200:
                data = response.json()
                details = f"Decisions: {len(data.get('decisions', []))}"
                self.log_test("Decision History Endpoint", True, details)
            else:
                self.log_test("Decision History Endpoint", False, f"Status: {response.status_code}")

            # Test decision analytics
            response = requests.get(f"{self.base_url}/product/decision-analytics/{self.user_address}")
            if response.status_code == 200:
                data = response.json()
                analytics = data.get('analytics', {})
                details = f"Total decisions: {analytics.get('total_decisions', 0)}"
                self.log_test("Decision Analytics Endpoint", True, details)
                return True
            else:
                self.log_test("Decision Analytics Endpoint", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Decision Endpoints", False, str(e))
            return False

    def test_product_decision_simulation(self):
        """Simulate a product decision (without actually executing blockchain transaction)"""
        print("\n🤖 Testing Product Decision Logic (Simulation Mode)")
        
        # This would require a real product to test, so we'll test the endpoint structure
        try:
            # Test with invalid data to check error handling
            payload = {
                "product_id": 999,  # Non-existent product
                "private_key": "invalid_key",
                "user_address": self.user_address
            }
            response = requests.post(f"{self.base_url}/product/auto-decide", json=payload, timeout=30)
            
            # We expect this to fail gracefully
            if response.status_code in [400, 404, 500]:
                self.log_test("Product Decision Error Handling", True, "Properly handles invalid input")
                return True
            else:
                self.log_test("Product Decision Error Handling", False, f"Unexpected status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Product Decision Simulation", False, str(e))
            return False

    def generate_test_report(self):
        """Generate a comprehensive test report"""
        print("\n" + "="*60)
        print("🧪 AGENTIC PRODUCT DECISION SYSTEM - TEST REPORT")
        print("="*60)
        
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        
        print(f"\n📊 Overall Results: {passed}/{total} tests passed")
        print(f"Success Rate: {(passed/total)*100:.1f}%\n")
        
        print("📋 Detailed Results:")
        for result in self.test_results:
            status = "✅" if result['success'] else "❌"
            print(f"{status} {result['test']}")
            if result['details']:
                print(f"   └─ {result['details']}")
        
        print("\n🔧 Next Steps:")
        if passed == total:
            print("✅ All tests passed! System is ready for manual testing.")
            print("   1. Start the frontend: cd frontend && npm run dev")
            print("   2. Test the manufacturing workflow with AI decision")
            print("   3. Monitor the decision history and analytics")
        else:
            print("❌ Some tests failed. Please check:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   - Fix: {result['test']}")
        
        print("\n📖 Manual Testing Guide:")
        print("   1. Open frontend at http://localhost:3000")
        print("   2. Connect your wallet (use Hardhat account)")
        print("   3. Navigate to product manufacturing")
        print("   4. Create a new product with ingredients")
        print("   5. After manufacturing, choose 'Let AI Decide'")
        print("   6. Check the decision results and blockchain execution")
        print("   7. Verify decision history at /product/decision-history")

def main():
    """Run all tests"""
    print("🚀 Starting Agentic Product Decision System Tests...")
    print("="*60)
    
    tester = SystemTester()
    
    # Run tests in sequence
    if not tester.test_backend_connection():
        print("❌ Backend not accessible. Please start the backend first:")
        print("   cd backend_copy && python app.py")
        return
    
    tester.test_blockchain_data()
    tester.test_market_data()
    tester.test_ai_chat()
    tester.test_decision_endpoints()
    tester.test_product_decision_simulation()
    
    # Generate final report
    tester.generate_test_report()

if __name__ == "__main__":
    main()
