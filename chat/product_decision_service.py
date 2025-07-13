import asyncio
import json
import logging
from typing import Dict, List, Optional
from datetime import datetime
import google.generativeai as genai
from web3_service import web3_service

logger = logging.getLogger(__name__)

class ProductDecisionService:
    def __init__(self, gemini_api_key: str):
        genai.configure(api_key=gemini_api_key)
        self.llm = genai.GenerativeModel('gemini-1.5-flash')
        
    async def make_product_decision(self, product_data: Dict, private_key: str, user_address: str) -> Dict:
        """Main function to decide and execute product action after manufacturing"""
        
        try:
            # Step 1: Get market context for decision making
            market_context = self._get_market_context(product_data)
            
            # Step 2: Get LLM decision
            decision = await self._get_llm_decision(product_data, market_context)
            
            # Step 3: Execute decision based on LLM choice
            if decision["action"] == "marketplace":
                result = await self._execute_marketplace_listing(
                    product_data, decision, private_key, user_address
                )
            elif decision["action"] == "relationships":
                result = await self._execute_relationship_requests(
                    product_data, decision, private_key, user_address
                )
            else:
                result = {"error": "Invalid decision action"}
            
            return {
                "decision": decision,
                "execution_result": result,
                "timestamp": datetime.now().isoformat(),
                "status": "success" if result.get("status") == "success" else "failed"
            }
            
        except Exception as e:
            logger.error(f"Error in product decision process: {e}")
            return {
                "decision": {"action": "hold", "reasoning": f"Error occurred: {str(e)}"},
                "execution_result": {"status": "error", "error": str(e)},
                "timestamp": datetime.now().isoformat(),
                "status": "error"
            }
    
    async def _get_llm_decision(self, product_data: Dict, market_context: Dict) -> Dict:
        """Get LLM decision on best product action"""
        
        prompt = f"""
        You are an intelligent supply chain business advisor. Analyze this manufactured product and market conditions to decide the optimal business action.

        PRODUCT INFORMATION:
        - Product Name: {product_data['name']}
        - Quantity Manufactured: {product_data['quantity']}
        - Manufacturing Cost: {product_data.get('manufacturingCost', 'N/A')} ETH
        - Current Price Per Unit: {product_data.get('pricePerUnit', 0)} ETH
        - Product Type: {product_data.get('category', 'Manufactured Good')}

        MARKET ANALYSIS:
        - Current Market Average Price: {market_context['avg_price']} ETH
        - Total Active Listings: {market_context['total_listings']}
        - Similar Products in Market: {market_context['similar_products_count']}
        - Market Competition Level: {market_context['competition_level']}
        - Potential Business Partners: {market_context['potential_buyers']} companies
        - Market Demand Indicator: {market_context['demand_level']}

        DECISION OPTIONS:
        1. MARKETPLACE: List product immediately for sale at competitive market price
           - Pros: Immediate liquidity, faster sales, market exposure
           - Cons: Price competition, no long-term relationships
        
        2. RELATIONSHIPS: Send partnership requests to build long-term business relationships
           - Pros: Stable partnerships, negotiated prices, repeat business
           - Cons: Longer sales cycle, negotiation required

        ANALYSIS FACTORS:
        - Market saturation and competition
        - Product uniqueness and demand
        - Profit margins and pricing strategy
        - Long-term business growth vs immediate sales
        - Market timing and opportunity

        Provide your recommendation in this exact JSON format:
        {{
            "action": "marketplace" | "relationships",
            "reasoning": "detailed explanation of why this choice is optimal",
            "suggested_price": 0.XX,
            "confidence": 0.XX,
            "market_strategy": "specific strategy explanation"
        }}
        """
        
        try:
            response = await self.llm.generate_content_async(prompt)
            decision_text = response.text
            
            # Extract JSON from response
            start = decision_text.find('{')
            end = decision_text.rfind('}') + 1
            json_str = decision_text[start:end]
            
            decision = json.loads(json_str)
            
            return {
                "action": decision.get("action", "marketplace"),
                "reasoning": decision.get("reasoning", "AI analysis suggests this approach"),
                "suggested_price": float(decision.get("suggested_price", product_data.get('pricePerUnit', 0.1))),
                "confidence": float(decision.get("confidence", 0.7)),
                "market_strategy": decision.get("market_strategy", "Standard approach")
            }
            
        except Exception as e:
            logger.error(f"Error getting LLM decision: {e}")
            # Fallback to marketplace with conservative pricing
            return {
                "action": "marketplace",
                "reasoning": "Fallback decision due to AI processing error - choosing marketplace for immediate liquidity",
                "suggested_price": float(product_data.get('pricePerUnit', 0.1)),
                "confidence": 0.5,
                "market_strategy": "Conservative market entry"
            }
    
    def _get_market_context(self, product_data: Dict) -> Dict:
        """Analyze market conditions for decision making"""
        
        try:
            # Get current market data
            market_data = web3_service.get_market_data()
            
            # Get all companies for relationship opportunities
            all_companies = web3_service.get_all_companies()
            
            # Find similar products in the market
            similar_products = []
            competition_count = 0
            
            for listing in market_data.get('activeListings', []):
                try:
                    listing_product = web3_service.get_product_details(listing['productId'])
                    if listing_product and self._is_similar_product(product_data, listing_product):
                        similar_products.append({
                            "name": listing_product['name'],
                            "price": listing['pricePerUnit'],
                            "quantity": listing['quantityAvailable'],
                            "seller": listing['seller']
                        })
                        competition_count += 1
                except Exception as e:
                    logger.warning(f"Error processing listing {listing.get('id', 'unknown')}: {e}")
                    continue
            
            # Calculate market metrics
            avg_price = market_data.get('avgPrice', 0)
            total_listings = market_data.get('totalListings', 0)
            
            # Determine competition level
            if competition_count == 0:
                competition_level = "low"
                demand_level = "high"
            elif competition_count <= 2:
                competition_level = "medium"
                demand_level = "medium"
            else:
                competition_level = "high"
                demand_level = "low"
            
            return {
                "avg_price": avg_price,
                "total_listings": total_listings,
                "similar_products": similar_products,
                "similar_products_count": competition_count,
                "competition_level": competition_level,
                "potential_buyers": len(all_companies) - 1,  # Exclude self
                "demand_level": demand_level,
                "market_saturation": "high" if competition_count > 5 else "medium" if competition_count > 2 else "low"
            }
            
        except Exception as e:
            logger.error(f"Error getting market context: {e}")
            return {
                "avg_price": 0,
                "total_listings": 0,
                "similar_products": [],
                "similar_products_count": 0,
                "competition_level": "unknown",
                "potential_buyers": 0,
                "demand_level": "unknown",
                "market_saturation": "unknown"
            }
    
    def _is_similar_product(self, product1: Dict, product2: Dict) -> bool:
        """Check if two products are similar based on name keywords"""
        
        try:
            name1_words = set(product1.get('name', '').lower().split())
            name2_words = set(product2.get('name', '').lower().split())
            
            # Remove common words that don't indicate similarity
            common_words = {'and', 'or', 'the', 'a', 'an', 'with', 'for', 'to', 'of', 'in', 'on', 'at'}
            name1_words -= common_words
            name2_words -= common_words
            
            # If they share at least 1 meaningful word, consider similar
            return bool(name1_words & name2_words)
            
        except Exception as e:
            logger.warning(f"Error comparing products: {e}")
            return False
    
    async def _execute_marketplace_listing(self, product_data: Dict, decision: Dict, private_key: str, user_address: str) -> Dict:
        """Execute marketplace listing with blockchain transaction"""
        
        try:
            # Prepare transaction parameters
            product_id = product_data['id']
            quantity = product_data['quantity']
            price_per_unit = decision['suggested_price']
            
            # Create Web3 account from private key
            account = web3_service.w3.eth.account.from_key(private_key)
            
            # Verify the account matches the user address
            if account.address.lower() != user_address.lower():
                raise Exception("Private key doesn't match user address")
            
            # Build marketplace listing transaction
            contract_function = web3_service.contract.functions.listProductForSale(
                product_id,
                quantity,
                web3_service.w3.to_wei(price_per_unit, 'ether')
            )
            
            # Estimate gas for the transaction
            gas_estimate = contract_function.estimate_gas({'from': account.address})
            
            # Build the transaction
            transaction = contract_function.build_transaction({
                'from': account.address,
                'gas': gas_estimate + 10000,  # Add buffer for gas
                'gasPrice': web3_service.w3.to_wei('20', 'gwei'),
                'nonce': web3_service.w3.eth.get_transaction_count(account.address)
            })
            
            # Sign the transaction
            signed_txn = web3_service.w3.eth.account.sign_transaction(transaction, private_key)
            
            # Send the transaction
            tx_hash = web3_service.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            # Wait for transaction confirmation
            receipt = web3_service.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            return {
                "status": "success",
                "action": "marketplace_listing",
                "transaction_hash": tx_hash.hex(),
                "product_id": product_id,
                "quantity": quantity,
                "price_per_unit": price_per_unit,
                "total_value": quantity * price_per_unit,
                "gas_used": receipt.gasUsed,
                "block_number": receipt.blockNumber,
                "message": f"Successfully listed {quantity} units of {product_data['name']} at {price_per_unit} ETH each"
            }
            
        except Exception as e:
            logger.error(f"Error executing marketplace listing: {e}")
            return {
                "status": "error",
                "action": "marketplace_listing",
                "error": str(e),
                "message": f"Failed to list product in marketplace: {str(e)}"
            }
    
    async def _execute_relationship_requests(self, product_data: Dict, decision: Dict, private_key: str, user_address: str) -> Dict:
        """Execute relationship requests to all registered companies"""
        
        try:
            # Get all registered companies
            all_companies = web3_service.get_all_companies()
            
            # Filter out the user's own company
            target_companies = [addr for addr in all_companies if addr.lower() != user_address.lower()]
            
            if not target_companies:
                return {
                    "status": "error",
                    "action": "relationship_requests",
                    "error": "No target companies found",
                    "message": "No other companies available for relationship requests"
                }
            
            # Create Web3 account from private key
            account = web3_service.w3.eth.account.from_key(private_key)
            
            # Verify the account matches the user address
            if account.address.lower() != user_address.lower():
                raise Exception("Private key doesn't match user address")
            
            results = []
            successful_requests = 0
            failed_requests = 0
            
            for target_company in target_companies:
                try:
                    # Build relationship request transaction
                    contract_function = web3_service.contract.functions.createRelationshipRequest(
                        target_company,  # buyer
                        product_data['id'],  # product_id
                        web3_service.w3.to_wei(decision['suggested_price'], 'ether'),  # price
                        365 * 24 * 60 * 60  # duration (1 year in seconds)
                    )
                    
                    # Estimate gas
                    gas_estimate = contract_function.estimate_gas({'from': account.address})
                    
                    # Build transaction
                    transaction = contract_function.build_transaction({
                        'from': account.address,
                        'gas': gas_estimate + 10000,  # Add buffer
                        'gasPrice': web3_service.w3.to_wei('20', 'gwei'),
                        'nonce': web3_service.w3.eth.get_transaction_count(account.address)
                    })
                    
                    # Sign and send transaction
                    signed_txn = web3_service.w3.eth.account.sign_transaction(transaction, private_key)
                    tx_hash = web3_service.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
                    
                    # Wait for confirmation
                    receipt = web3_service.w3.eth.wait_for_transaction_receipt(tx_hash)
                    
                    # Get company info for better logging
                    company_info = web3_service.get_company_info(target_company)
                    company_name = company_info.get('name', 'Unknown Company') if company_info else target_company
                    
                    results.append({
                        "target_company": target_company,
                        "company_name": company_name,
                        "status": "success",
                        "transaction_hash": tx_hash.hex(),
                        "gas_used": receipt.gasUsed,
                        "block_number": receipt.blockNumber
                    })
                    
                    successful_requests += 1
                    
                except Exception as e:
                    logger.error(f"Error sending relationship request to {target_company}: {e}")
                    
                    # Get company info for error logging
                    company_info = web3_service.get_company_info(target_company)
                    company_name = company_info.get('name', 'Unknown Company') if company_info else target_company
                    
                    results.append({
                        "target_company": target_company,
                        "company_name": company_name,
                        "status": "error",
                        "error": str(e)
                    })
                    
                    failed_requests += 1
            
            return {
                "status": "success",
                "action": "relationship_requests",
                "total_companies": len(target_companies),
                "successful_requests": successful_requests,
                "failed_requests": failed_requests,
                "product_id": product_data['id'],
                "suggested_price": decision['suggested_price'],
                "results": results,
                "message": f"Sent relationship requests to {successful_requests}/{len(target_companies)} companies for {product_data['name']}"
            }
            
        except Exception as e:
            logger.error(f"Error executing relationship requests: {e}")
            return {
                "status": "error",
                "action": "relationship_requests",
                "error": str(e),
                "message": f"Failed to send relationship requests: {str(e)}"
            }

# Global instance
product_decision_service = None

def get_product_decision_service(gemini_api_key: str) -> ProductDecisionService:
    """Get or create product decision service instance"""
    global product_decision_service
    if product_decision_service is None:
        product_decision_service = ProductDecisionService(gemini_api_key)
    return product_decision_service
