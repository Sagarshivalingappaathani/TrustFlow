import google.generativeai as genai
from typing import Dict, Optional
import json
import os

class ProductPricingAgent:
    def __init__(self, api_key: Optional[str] = None, model_name: str = "gemini-1.5-flash"):
        """Initialize the pricing agent with Gemini model."""
        api_key = api_key or os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("Google API key is required. Set GOOGLE_API_KEY environment variable or pass api_key parameter.")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model_name)
    
    def get_price_range(self, product_name: str, description: str) -> Dict:
        """
        Analyze market pricing for a product and return price range with reasoning.
        
        Args:
            product_name: Name of the product
            description: Detailed description of the product
            
        Returns:
            Dict containing price_min, price_max, currency, and summary
        """
        prompt = f"""
Analyze the market pricing for the following product:

Product Name: {product_name}
Description: {description}

Based on similar products in the market, provide:
1. A realistic price range (minimum and maximum in USD)
2. A brief summary explaining your pricing rationale

Consider factors like:
- Market competition
- Product features and quality
- Target audience
- Production costs
- Brand positioning

Respond in JSON format only:
{{
    "price_min": <minimum_price>,
    "price_max": <maximum_price>,
    "currency": "USD",
    "summary": "<2-3 sentence explanation of pricing rationale>"
}}
"""
        
        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                    max_output_tokens=300,
                    response_mime_type="application/json"
                )
            )
            
            result = json.loads(response.text)
            return result
            
        except Exception as e:
            return {
                "error": f"Failed to get pricing analysis: {str(e)}",
                "price_min": None,
                "price_max": None,
                "currency": "USD",
                "summary": "Unable to analyze pricing due to error."
            }

def analyze_product_pricing(product_name: str, description: str) -> Dict:
    """
    Convenience function to get product pricing analysis.
    
    Args:
        product_name: Name of the product
        description: Product description
        
    Returns:
        Pricing analysis with range and summary
    """
    agent = ProductPricingAgent()
    return agent.get_price_range(product_name, description)

# Example usage
if __name__ == "__main__":
    # Test the pricing agent
    result = analyze_product_pricing(
        "Wireless Bluetooth Headphones",
        "Premium noise-canceling wireless headphones with 30-hour battery life, premium materials, and studio-quality sound."
    )
    print(json.dumps(result, indent=2))