#!/usr/bin/env python3
"""
Test script for the Company Analyzer Agent
"""

import os
from company_analyzer_agent import analyze_company

def test_basic_functionality():
    """Test the analyzer with just company name input"""
    print("=" * 60)
    print("TESTING COMPANY ANALYZER - COMPANY NAME INPUT")
    print("=" * 60)
    
    # Test with a well-known company
    company_name = "Microsoft"
    print(f"\nAnalyzing {company_name}...")
    
    # Set a dummy Google API key for testing (you'll need to set your real one)
    os.environ["GOOGLE_API_KEY"] = "dummy_key_for_testing"
    
    try:
        result = analyze_company(company_name)
        
        print(f"\n✅ Analysis completed!")
        print("=" * 60)
        print("COMPANY ANALYSIS REPORT")
        print("=" * 60)
        print(result["report"])
        print("=" * 60)
            
    except Exception as e:
        print(f"❌ Test failed with exception: {str(e)}")

def test_with_api_keys():
    """Test with actual API keys"""
    print("\n" + "=" * 60)
    print("TESTING WITH FULL API INTEGRATION")
    print("=" * 60)
    
    google_key = os.getenv("GOOGLE_API_KEY")
    news_key = os.getenv("NEWS_API_KEY")
    
    if not google_key:
        print("⚠️  GOOGLE_API_KEY not set. Set it to test Gemini integration.")
        return
    
    if not news_key:
        print("⚠️  NEWS_API_KEY not set. Set it to test news integration.")
        print("   News analysis will be skipped, but financial analysis will work.")
    
    company_name = "Tesla"
    print(f"\nAnalyzing {company_name} with full API integration...")
    
    try:
        result = analyze_company(company_name, news_api_key=news_key)
        
        print("✅ Full analysis completed successfully!")
        print("=" * 60)
        print("DETAILED COMPANY ANALYSIS REPORT")
        print("=" * 60)
        print(result["report"])
        print("=" * 60)
        
        # Save report to file
        with open(f"{company_name.lower()}_analysis_report.txt", "w") as f:
            f.write(f"Company Analysis Report for {company_name}\n")
            f.write("=" * 50 + "\n\n")
            f.write(result["report"])
        
        print(f"📄 Report also saved to '{company_name.lower()}_analysis_report.txt'")
            
    except Exception as e:
        print(f"❌ Test failed with exception: {str(e)}")

if __name__ == "__main__":
    print("🚀 Company Analyzer Agent Test Suite")
    
    # Test 1: Basic functionality
    test_basic_functionality()
    
    # Test 2: Full functionality with API keys
    test_with_api_keys()
    
    print("\n" + "=" * 60)
    print("TESTING COMPLETE")
    print("=" * 60)
    print("\n📝 To run with your API keys:")
    print("   export GOOGLE_API_KEY='your_gemini_api_key'")
    print("   export NEWS_API_KEY='your_newsapi_key'")
    print("   python3 test_company_analyzer.py")
    print("\n📋 Usage Example:")
    print("   from company_analyzer_agent import analyze_company")
    print("   result = analyze_company('Apple')")
    print("   print(result['report'])")
