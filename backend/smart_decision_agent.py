import json
import random
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests
from web3 import Web3
import os
import google.generativeai as genai

# Configure Gemini API
GEMINI_API_KEY = "AIzaSyDxHZnUEmFxIsq1ZBARfERSsjwSlUKQ_38"
genai.configure(api_key=GEMINI_API_KEY)

# Data Classes
@dataclass
class Product:
    id: str
    name: str
    quantity: int
    cost: float
    category: str
    created_at: datetime
    
@dataclass
class MarketAnalysis:
    demand_score: float
    competition_level: float
    price_trend: str
    seasonal_factor: float
    bulk_buyer_interest: float
    gemini_insights: str = ""
    
@dataclass
class ProfitScenario:
    retail_price: float
    bulk_price: float
    retail_profit: float
    bulk_profit: float
    retail_time_to_sale: int
    bulk_time_to_sale: int
    
@dataclass
class BulkBuyer:
    name: str
    email: str
    credit_score: float
    past_purchases: int
    preferred_categories: List[str]
    
class SalesDecision(Enum):
    RETAIL = "retail"
    BULK = "bulk"
    HOLD = "hold"

# Gemini AI Integration
class GeminiAIService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')
    
    def analyze_market_conditions(self, product: Product) -> str:
        """Use Gemini to analyze market conditions for a product"""
        prompt = f"""
        As an expert market analyst, analyze the market conditions for the following product:
        
        Product: {product.name}
        Category: {product.category}
        Quantity: {product.quantity}
        Cost per unit: ${product.cost}
        
        Provide insights on:
        1. Current market demand for this product category
        2. Competition level analysis
        3. Price trends and seasonal factors
        4. Bulk purchase opportunities
        5. Recommended sales strategy
        
        Keep your analysis concise but comprehensive (max 300 words).
        """
        
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"❌ Gemini API error: {e}")
            return "Market analysis temporarily unavailable. Using fallback analysis."
    
    def make_sales_decision(self, product: Product, market_analysis: MarketAnalysis, profit_scenarios: ProfitScenario) -> Tuple[SalesDecision, str]:
        """Use Gemini to make intelligent sales decisions"""
        prompt = f"""
        As an AI sales strategist, analyze this product and recommend the best sales strategy:
        
        PRODUCT DETAILS:
        - Name: {product.name}
        - Category: {product.category}
        - Quantity: {product.quantity}
        - Cost: ${product.cost}
        
        MARKET ANALYSIS:
        - Demand Score: {market_analysis.demand_score}/1.0
        - Competition Level: {market_analysis.competition_level}/1.0
        - Price Trend: {market_analysis.price_trend}
        - Bulk Interest: {market_analysis.bulk_buyer_interest}/1.0
        
        PROFIT SCENARIOS:
        - Retail: ${profit_scenarios.retail_profit} profit in {profit_scenarios.retail_time_to_sale} days
        - Bulk: ${profit_scenarios.bulk_profit} profit in {profit_scenarios.bulk_time_to_sale} days
        
        Choose ONE strategy and provide reasoning:
        1. RETAIL - Sell individually to consumers
        2. BULK - Sell to bulk buyers/wholesalers
        3. HOLD - Wait for better market conditions
        
        Respond with exactly this format:
        DECISION: [RETAIL/BULK/HOLD]
        REASONING: [Your detailed reasoning in 2-3 sentences]
        """
        
        try:
            response = self.model.generate_content(prompt)
            response_text = response.text
            
            # Parse the response
            lines = response_text.split('\n')
            decision_line = next((line for line in lines if line.startswith('DECISION:')), 'DECISION: RETAIL')
            reasoning_line = next((line for line in lines if line.startswith('REASONING:')), 'REASONING: Standard retail approach recommended.')
            
            decision_text = decision_line.split(':', 1)[1].strip().upper()
            reasoning = reasoning_line.split(':', 1)[1].strip()
            
            # Map to enum
            decision_mapping = {
                'RETAIL': SalesDecision.RETAIL,
                'BULK': SalesDecision.BULK,
                'HOLD': SalesDecision.HOLD
            }
            
            decision = decision_mapping.get(decision_text, SalesDecision.RETAIL)
            return decision, reasoning
            
        except Exception as e:
            print(f"❌ Gemini decision error: {e}")
            return SalesDecision.RETAIL, "Using fallback decision due to AI service unavailability."
    
    def generate_contract_content(self, product: Product, profit_scenario: ProfitScenario, buyer: BulkBuyer) -> str:
        """Use Gemini to generate personalized contract content"""
        prompt = f"""
        Generate a professional bulk purchase contract proposal for:
        
        PRODUCT: {product.name}
        QUANTITY: {product.quantity} units
        BULK PRICE: ${profit_scenario.bulk_price} per unit
        
        BUYER: {buyer.name}
        CREDIT SCORE: {buyer.credit_score}/10
        PAST PURCHASES: {buyer.past_purchases}
        
        Create a compelling, professional contract proposal that includes:
        1. Executive summary highlighting key benefits
        2. Detailed pricing structure with volume discounts
        3. Payment and delivery terms
        4. Quality guarantees
        5. Call to action
        
        Keep it professional but engaging. Maximum 500 words.
        """
        
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"❌ Gemini contract generation error: {e}")
            return "Standard contract terms apply. Please contact for details."
    
    def optimize_pricing(self, product: Product, market_data: dict) -> Dict[str, float]:
        """Use Gemini to optimize pricing strategy"""
        prompt = f"""
        As a pricing strategist, optimize prices for this product:
        
        PRODUCT: {product.name} ({product.category})
        COST: ${product.cost}
        QUANTITY: {product.quantity}
        
        MARKET DATA:
        {json.dumps(market_data, indent=2)}
        
        Recommend optimal pricing for:
        1. Retail price (per unit)
        2. Bulk price (per unit)
        3. Markup percentages
        
        Consider competition, demand, and profit margins.
        
        Respond in this format:
        RETAIL_PRICE: [amount]
        BULK_PRICE: [amount]
        RETAIL_MARKUP: [percentage]
        BULK_MARKUP: [percentage]
        """
        
        try:
            response = self.model.generate_content(prompt)
            response_text = response.text
            
            # Parse pricing recommendations
            retail_price = float(response_text.split('RETAIL_PRICE:')[1].split('\n')[0].strip().replace('$', ''))
            bulk_price = float(response_text.split('BULK_PRICE:')[1].split('\n')[0].strip().replace('$', ''))
            
            return {
                'retail_price': retail_price,
                'bulk_price': bulk_price
            }
        except Exception as e:
            print(f"❌ Gemini pricing error: {e}")
            return {
                'retail_price': product.cost * 1.5,
                'bulk_price': product.cost * 1.25
            }

# Blockchain Interface
class EthereumInterface:
    def __init__(self, rpc_url: str = "http://localhost:8545", contract_address: str = None):
        self.web3 = Web3(Web3.HTTPProvider(rpc_url))
        self.contract_address = contract_address
        
        # Smart contract ABI (simplified for demo)
        self.contract_abi = [
            {
                "inputs": [
                    {"name": "productId", "type": "string"},
                    {"name": "listingType", "type": "string"},
                    {"name": "price", "type": "uint256"},
                    {"name": "quantity", "type": "uint256"}
                ],
                "name": "createListing",
                "outputs": [],
                "type": "function"
            },
            {
                "inputs": [
                    {"name": "productId", "type": "string"},
                    {"name": "status", "type": "string"}
                ],
                "name": "updateProductStatus",
                "outputs": [],
                "type": "function"
            }
        ]
        
        if contract_address:
            self.contract = self.web3.eth.contract(
                address=contract_address,
                abi=self.contract_abi
            )
    
    def create_listing(self, product_id: str, listing_type: str, price: float, quantity: int) -> str:
        """Create a product listing on the blockchain"""
        try:
            if not self.contract:
                # Mock transaction for demo
                tx_hash = f"0x{hashlib.md5(f'{product_id}{listing_type}{price}{quantity}'.encode()).hexdigest()}"
                print(f"🔗 Mock blockchain transaction: {tx_hash}")
                return tx_hash
            
            # Real blockchain transaction
            price_wei = self.web3.to_wei(price, 'ether')
            tx = self.contract.functions.createListing(
                product_id, listing_type, price_wei, quantity
            ).build_transaction({
                'from': self.web3.eth.accounts[0],
                'gas': 2000000,
                'gasPrice': self.web3.to_wei('20', 'gwei')
            })
            
            # Sign and send transaction
            signed_tx = self.web3.eth.account.sign_transaction(tx, private_key=os.getenv('PRIVATE_KEY'))
            tx_hash = self.web3.eth.send_raw_transaction(signed_tx.rawTransaction)
            
            print(f"🔗 Blockchain transaction successful: {tx_hash.hex()}")
            return tx_hash.hex()
            
        except Exception as e:
            print(f"❌ Blockchain error: {e}")
            return f"0x{hashlib.md5(f'error{product_id}'.encode()).hexdigest()}"
    
    def update_product_status(self, product_id: str, status: str) -> str:
        """Update product status on blockchain"""
        try:
            if not self.contract:
                # Mock transaction for demo
                tx_hash = f"0x{hashlib.md5(f'{product_id}{status}'.encode()).hexdigest()}"
                print(f"🔗 Status update transaction: {tx_hash}")
                return tx_hash
            
            # Real blockchain transaction
            tx = self.contract.functions.updateProductStatus(
                product_id, status
            ).build_transaction({
                'from': self.web3.eth.accounts[0],
                'gas': 1000000,
                'gasPrice': self.web3.to_wei('20', 'gwei')
            })
            
            signed_tx = self.web3.eth.account.sign_transaction(tx, private_key=os.getenv('PRIVATE_KEY'))
            tx_hash = self.web3.eth.send_raw_transaction(signed_tx.rawTransaction)
            
            return tx_hash.hex()
            
        except Exception as e:
            print(f"❌ Status update error: {e}")
            return f"0x{hashlib.md5(f'status{product_id}'.encode()).hexdigest()}"

# Email Service
class EmailService:
    def __init__(self, smtp_server: str = "smtp.gmail.com", smtp_port: int = 587):
        self.smtp_server = smtp_server
        self.smtp_port = smtp_port
        self.email = os.getenv('EMAIL_ADDRESS')
        self.password = os.getenv('EMAIL_PASSWORD')
    
    def send_contract_proposal(self, buyer: BulkBuyer, contract_text: str, product: Product) -> bool:
        """Send contract proposal to a potential buyer"""
        try:
            # Create email
            msg = MIMEMultipart()
            msg['From'] = self.email
            msg['To'] = buyer.email
            msg['Subject'] = f"AI-Optimized Bulk Purchase Opportunity - {product.name}"
            
            # Email body
            body = f"""
Dear {buyer.name},

Our AI-powered sales system has identified an exclusive bulk purchase opportunity perfectly matched to your business profile.

{contract_text}

This proposal has been generated using advanced AI analysis of:
- Your excellent credit score: {buyer.credit_score}/10
- Past purchase history: {buyer.past_purchases} successful transactions
- Category alignment: {', '.join(buyer.preferred_categories)}
- Real-time market conditions

To proceed with this AI-optimized opportunity, please respond within 48 hours.

Best regards,
TrustFlow Autonomous Sales System
Powered by Gemini AI
            """
            
            msg.attach(MIMEText(body, 'plain'))
            
            # Send email (mock for demo)
            if not self.email:
                print(f"📧 [MOCK] AI-enhanced email sent to {buyer.email}")
                print(f"   Subject: {msg['Subject']}")
                print(f"   Preview: {body[:100]}...")
                return True
            
            # Real email sending
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.email, self.password)
            text = msg.as_string()
            server.sendmail(self.email, buyer.email, text)
            server.quit()
            
            print(f"📧 AI-enhanced email sent to {buyer.email}")
            return True
            
        except Exception as e:
            print(f"❌ Email error: {e}")
            return False

# Enhanced Market Analysis Engine with Gemini
class MarketAnalyzer:
    def __init__(self, gemini_service: GeminiAIService):
        self.gemini_service = gemini_service
        # Mock market data - in real implementation, this would connect to APIs
        self.market_data = {
            "Electronics": {"demand": 0.8, "competition": 0.6, "trend": "increasing"},
            "Clothing": {"demand": 0.6, "competition": 0.8, "trend": "stable"},
            "Home": {"demand": 0.7, "competition": 0.5, "trend": "increasing"},
            "Books": {"demand": 0.4, "competition": 0.9, "trend": "decreasing"}
        }
    
    def analyze_market_conditions(self, product: Product) -> MarketAnalysis:
        """Analyze market conditions for a product with Gemini AI enhancement"""
        category_data = self.market_data.get(product.category, {
            "demand": 0.5, "competition": 0.5, "trend": "stable"
        })
        
        # Get Gemini AI insights
        print("🧠 Requesting Gemini AI market analysis...")
        gemini_insights = self.gemini_service.analyze_market_conditions(product)
        
        # Add some randomness to simulate real market fluctuations
        demand_score = category_data["demand"] + random.uniform(-0.1, 0.1)
        competition_level = category_data["competition"] + random.uniform(-0.1, 0.1)
        
        # Calculate seasonal factor (simplified)
        current_month = datetime.now().month
        seasonal_factor = 1.0 + (0.2 * (current_month % 4 - 2) / 2)  # Seasonal variation
        
        # Calculate bulk buyer interest based on quantity and category
        bulk_interest = min(0.9, (product.quantity / 100) * demand_score)
        
        return MarketAnalysis(
            demand_score=max(0, min(1, demand_score)),
            competition_level=max(0, min(1, competition_level)),
            price_trend=category_data["trend"],
            seasonal_factor=seasonal_factor,
            bulk_buyer_interest=bulk_interest,
            gemini_insights=gemini_insights
        )
    
    def calculate_profit_scenarios(self, product: Product, market_analysis: MarketAnalysis) -> ProfitScenario:
        """Calculate profit scenarios with Gemini AI pricing optimization"""
        
        # Get Gemini AI pricing recommendations
        print("💰 Requesting Gemini AI pricing optimization...")
        gemini_pricing = self.gemini_service.optimize_pricing(product, {
            "demand_score": market_analysis.demand_score,
            "competition_level": market_analysis.competition_level,
            "price_trend": market_analysis.price_trend,
            "seasonal_factor": market_analysis.seasonal_factor
        })
        
        # Use Gemini recommendations or fallback to original logic
        retail_price = gemini_pricing.get('retail_price', product.cost * 1.5) * market_analysis.seasonal_factor
        bulk_price = gemini_pricing.get('bulk_price', product.cost * 1.25)
        
        # Calculate profits
        retail_profit = (retail_price - product.cost) * product.quantity
        bulk_profit = (bulk_price - product.cost) * product.quantity
        
        # Estimate time to sale based on market conditions
        retail_time_to_sale = int(30 / market_analysis.demand_score)  # 15-75 days
        bulk_time_to_sale = int(10 / market_analysis.bulk_buyer_interest)  # 5-40 days
        
        return ProfitScenario(
            retail_price=round(retail_price, 2),
            bulk_price=round(bulk_price, 2),
            retail_profit=round(retail_profit, 2),
            bulk_profit=round(bulk_profit, 2),
            retail_time_to_sale=retail_time_to_sale,
            bulk_time_to_sale=bulk_time_to_sale
        )

# Buyer Database
class BuyerDatabase:
    def __init__(self):
        self.buyers = [
            BulkBuyer("TechCorp Industries", "procurement@techcorp.com", 9.2, 45, ["Electronics", "Home"]),
            BulkBuyer("GlobalSupply Ltd", "buyers@globalsupply.com", 8.7, 67, ["Electronics", "Clothing"]),
            BulkBuyer("MegaRetail Chain", "wholesale@megaretail.com", 8.9, 123, ["Clothing", "Home", "Books"]),
            BulkBuyer("InnovateTech Co", "purchasing@innovatetech.com", 7.8, 23, ["Electronics"]),
            BulkBuyer("StyleWorld Fashion", "bulk@styleworld.com", 8.1, 34, ["Clothing"]),
            BulkBuyer("HomePlus Distributors", "orders@homeplus.com", 8.5, 56, ["Home"]),
            BulkBuyer("BookWorld Wholesale", "wholesale@bookworld.com", 7.9, 78, ["Books"]),
            BulkBuyer("FlexiSupply Solutions", "sales@flexisupply.com", 9.1, 89, ["Electronics", "Home", "Clothing"])
        ]
    
    def find_potential_buyers(self, product: Product, min_credit_score: float = 7.5) -> List[BulkBuyer]:
        """Find potential buyers for a product"""
        suitable_buyers = []
        
        for buyer in self.buyers:
            # Check credit score
            if buyer.credit_score < min_credit_score:
                continue
            
            # Check category match
            if product.category not in buyer.preferred_categories:
                continue
            
            # Add some scoring logic
            score = buyer.credit_score + (buyer.past_purchases / 100)
            buyer.score = score
            suitable_buyers.append(buyer)
        
        # Sort by score (descending)
        suitable_buyers.sort(key=lambda x: x.score, reverse=True)
        
        return suitable_buyers[:5]  # Return top 5 buyers

# Enhanced Contract Generator with Gemini
class ContractGenerator:
    def __init__(self, gemini_service: GeminiAIService):
        self.gemini_service = gemini_service
    
    def generate_bulk_contract(self, product: Product, profit_scenario: ProfitScenario, buyer: BulkBuyer) -> str:
        """Generate a bulk sales contract with Gemini AI enhancement and call blockchain handler."""
        # Get Gemini AI generated contract content
        print("📄 Requesting Gemini AI contract generation...")
        gemini_contract = self.gemini_service.generate_contract_content(product, profit_scenario, buyer)

        # Calculate contract terms
        total_value = profit_scenario.bulk_price * product.quantity
        minimum_order = max(10, product.quantity // 4)  # At least 25% of inventory
        bulk_discount = 0.05 if product.quantity > 100 else 0.03
        expiry_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")

        # Call blockchain handler (separated for modularity)
        self.handle_blockchain_contract(product, profit_scenario, buyer)

        contract_text = f"""
╔══════════════════════════════════════════════════════════════════════════════════╗
║                    AI-ENHANCED BULK PURCHASE CONTRACT                           ║
║                        Generated by TrustFlow + Gemini AI                       ║
╚══════════════════════════════════════════════════════════════════════════════════╝

CONTRACT ID: {product.id}-{hashlib.md5(f'{buyer.name}{datetime.now()}'.encode()).hexdigest()[:8]}
GENERATED: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

AI MARKET ANALYSIS SUMMARY:
═══════════════════════════════════════════════════════════════════════════════════
This contract has been optimized using Google Gemini AI analysis of current market
conditions, pricing trends, and buyer preferences.

{gemini_contract}

PRODUCT DETAILS:
═══════════════════════════════════════════════════════════════════════════════════
Product Name: {product.name}
Product ID: {product.id}
Category: {product.category}
Available Quantity: {product.quantity} units
AI-Optimized Total Value: ${total_value:,.2f}

GEMINI AI PRICING STRUCTURE:
═══════════════════════════════════════════════════════════════════════════════════
Base Unit Price: ${profit_scenario.bulk_price:.2f}
Bulk Discount: {bulk_discount*100:.1f}% (for orders ≥ {minimum_order} units)
Discounted Price: ${profit_scenario.bulk_price * (1-bulk_discount):.2f} per unit

BUYER PROFILE (AI ANALYZED):
═══════════════════════════════════════════════════════════════════════════════════
Company: {buyer.name}
Credit Score: {buyer.credit_score}/10.0 (AI Verified)
Transaction History: {buyer.past_purchases} successful purchases
Preferred Categories: {', '.join(buyer.preferred_categories)}

CONTRACT TERMS:
═══════════════════════════════════════════════════════════════════════════════════
• Minimum Order Quantity: {minimum_order} units
• Maximum Order Quantity: {product.quantity} units
• Payment Terms: Net 30 days from delivery
• Delivery Terms: FOB Origin (seller's location)
• Quality Guarantee: 100% satisfaction or full refund
• Warranty Period: 12 months from delivery date
• Contract Validity: Until {expiry_date}

AI-POWERED FEATURES:
═══════════════════════════════════════════════════════════════════════════════════
• Gemini AI market analysis and pricing optimization
• Automated payment processing upon delivery confirmation
• Blockchain-based quality assurance tracking
• AI-driven dispute resolution recommendations
• Real-time market pricing adjustments

PRICING EXAMPLES:
═══════════════════════════════════════════════════════════════════════════════════
Order of {minimum_order} units: ${minimum_order * profit_scenario.bulk_price * (1-bulk_discount):,.2f}
Order of {product.quantity//2} units: ${(product.quantity//2) * profit_scenario.bulk_price * (1-bulk_discount):,.2f}
Full inventory ({product.quantity} units): ${product.quantity * profit_scenario.bulk_price * (1-bulk_discount):,.2f}

NEXT STEPS:
═══════════════════════════════════════════════════════════════════════════════════
1. Review AI-optimized contract terms and pricing
2. Respond with desired quantity and any modifications
3. Smart contract will be deployed upon mutual agreement
4. Automated AI-monitored order processing begins

═══════════════════════════════════════════════════════════════════════════════════
This contract is AI-generated by TrustFlow + Gemini and legally binding upon acceptance.
For questions or modifications, contact: ai-contracts@trustflow.com
═══════════════════════════════════════════════════════════════════════════════════
        """
        return contract_text

    def handle_blockchain_contract(self, product: Product, profit_scenario: ProfitScenario, buyer: BulkBuyer):
        """Separate function to handle Ethereum/blockchain contract logic (stub for now)."""
        # Example: You can call your EthereumInterface here, or pass in as needed
        # For demonstration, just print. Replace with actual blockchain logic as needed.
        print(f"[Blockchain] Would deploy contract for product {product.id} to buyer {buyer.name} at price {profit_scenario.bulk_price}")

# Enhanced Autonomous Sales Agent with Gemini AI
class AutonomousSalesAgent:
    def __init__(self, blockchain_interface: EthereumInterface, email_service: EmailService, gemini_service: GeminiAIService):
        self.blockchain = blockchain_interface
        self.email_service = email_service
        self.gemini_service = gemini_service
        self.market_analyzer = MarketAnalyzer(gemini_service)
        self.buyer_database = BuyerDatabase()
        self.contract_generator = ContractGenerator(gemini_service)
        
        # Agent configuration
        self.profit_threshold = 0.15  # 15% minimum profit margin
        self.bulk_quantity_threshold = 50  # Minimum quantity for bulk consideration
        self.max_buyers_to_contact = 3  # Maximum buyers to contact per product
        
        # Decision history for learning
        self.decision_history = []
    
    def on_product_created(self, product_data: Dict) -> Dict:
        """
        Main entry point - triggered when a product is created
        Enhanced with Gemini AI decision-making
        """
        print(f"\n🤖 GEMINI AI-POWERED AUTONOMOUS AGENT ACTIVATED")
        print(f"📦 Product Created: {product_data['name']}")
        print(f"🧠 Integrating Google Gemini AI for enhanced decision-making...\n")
        
        # Convert dict to Product object
        product = Product(
            id=product_data['id'],
            name=product_data['name'],
            quantity=product_data['quantity'],
            cost=product_data['cost'],
            category=product_data.get('category', 'General'),
            created_at=datetime.now()
        )
        
        # Step 1: Analyze market conditions with Gemini AI
        print("📊 STEP 1: Gemini AI Market Analysis")
        market_analysis = self.market_analyzer.analyze_market_conditions(product)
        print(f"   • Demand Score: {market_analysis.demand_score:.2f}/1.0")
        print(f"   • Competition Level: {market_analysis.competition_level:.2f}/1.0")
        print(f"   • Price Trend: {market_analysis.price_trend}")
        print(f"   • Bulk Buyer Interest: {market_analysis.bulk_buyer_interest:.2f}/1.0")
        print(f"   • Gemini Insights: {market_analysis.gemini_insights[:100]}...")
        
        # Step 2: Calculate profit scenarios with AI optimization
        print("\n💰 STEP 2: Gemini AI Profit Optimization")
        profit_scenarios = self.market_analyzer.calculate_profit_scenarios(product, market_analysis)
        print(f"   • Retail: ${profit_scenarios.retail_profit:.2f} profit in {profit_scenarios.retail_time_to_sale} days")
        print(f"   • Bulk: ${profit_scenarios.bulk_profit:.2f} profit in {profit_scenarios.bulk_time_to_sale} days")
        
        # Step 3: Make AI-enhanced decision
        print("\n🧠 STEP 3: Gemini AI Decision Making")
        decision, reasoning = self.gemini_service.make_sales_decision(product, market_analysis, profit_scenarios)
        print(f"   • Decision: {decision.value.upper()}")
        print(f"   • AI Reasoning: {reasoning}")
        
        # Step 4: Execute decision
        print(f"\n⚡ STEP 4: Executing {decision.value.upper()} Strategy")
        execution_result = self.execute_decision(decision, product, market_analysis, profit_scenarios)
        
        # Step 5: Log decision for learning
        self.log_decision(product, market_analysis, profit_scenarios, decision, execution_result, reasoning)
        
        return {
            "product_id": product.id,
            "decision": decision.value,
            "ai_reasoning": reasoning,
            "market_analysis": market_analysis.__dict__,
            "profit_scenarios": profit_scenarios.__dict__,
            "execution_result": execution_result,
            "timestamp": datetime.now().isoformat()
        }
    
    def execute_decision(self, decision: SalesDecision, product: Product, market_analysis: MarketAnalysis, profit_scenarios: ProfitScenario) -> Dict:
        """Execute the AI-enhanced decision"""
        if decision == SalesDecision.RETAIL:
            return self.execute_retail_strategy(product, profit_scenarios)
        elif decision == SalesDecision.BULK:
            return self.execute_bulk_strategy(product, market_analysis, profit_scenarios)
        else:  # HOLD
            return self.execute_hold_strategy(product, market_analysis)
    
    def execute_retail_strategy(self, product: Product, profit_scenarios: ProfitScenario) -> Dict:
        """Execute retail sales strategy"""
        print("   🏪 Executing AI-optimized retail marketplace listing...")
        
        # Create blockchain listing
        tx_hash = self.blockchain.create_listing(
            product.id,
            "retail",
            profit_scenarios.retail_price,
            product.quantity
        )
        
        # Update product status
        status_tx = self.blockchain.update_product_status(product.id, "retail-active")
        
        result = {
            "strategy": "retail",
            "listing_price": profit_scenarios.retail_price,
            "total_value": profit_scenarios.retail_price * product.quantity,
            "blockchain_tx": tx_hash,
            "status_tx": status_tx,
            "estimated_sale_time": profit_scenarios.retail_time_to_sale,
            "projected_profit": profit_scenarios.retail_profit
        }
        
        print(f"   ✅ Retail listing created successfully")
        print(f"   📈 Price: ${profit_scenarios.retail_price:.2f} per unit")
        print(f"   💎 Total value: ${profit_scenarios.retail_price * product.quantity:,.2f}")
        print(f"   🔗 Blockchain TX: {tx_hash}")
        
        return result
    
    def execute_bulk_strategy(self, product: Product, market_analysis: MarketAnalysis, profit_scenarios: ProfitScenario) -> Dict:
        """Execute bulk sales strategy"""
        print("   🤝 Executing AI-optimized bulk sales strategy...")
        
        # Find potential buyers
        potential_buyers = self.buyer_database.find_potential_buyers(product)
        
        results = []
        
        for buyer in potential_buyers[:self.max_buyers_to_contact]:
            # Generate and send contract proposal
            contract_text = self.contract_generator.generate_bulk_contract(product, profit_scenarios, buyer)
            email_sent = self.email_service.send_contract_proposal(buyer, contract_text, product)
            
            results.append({
                "buyer": buyer.name,
                "email_sent": email_sent,
                "contract_value": profit_scenarios.bulk_price * product.quantity
            })
        
        # Update product status to bulk-active
        status_tx = self.blockchain.update_product_status(product.id, "bulk-active")
        
        return {
            "strategy": "bulk",
            "potential_buyers": [buyer.name for buyer in potential_buyers],
            "email_sent_count": len(results),
            "blockchain_status_tx": status_tx,
            "results": results
        }
    
    def execute_hold_strategy(self, product: Product, market_analysis: MarketAnalysis) -> Dict:
        """Execute hold strategy"""
        print("   ⏳ Holding product - no immediate action taken")
        
        return {
            "strategy": "hold",
            "reason": "Market conditions not favorable for selling",
            "market_analysis": market_analysis
        }
    
    def log_decision(self, product, market_analysis, profit_scenarios, decision, execution_result, reasoning):
        """
        Logs the decision-making process for a product and appends it to a feedback file for learning.
        """
        print("\n📊 Decision Log:")
        print(f"Product: {product}")
        print(f"Market Analysis: {market_analysis}")
        print(f"Profit Scenarios: {profit_scenarios}")
        print(f"Decision: {decision}")
        print(f"Execution Result: {execution_result}")
        print(f"Reasoning: {reasoning}")

        # Feedback loop: persist decision and outcome for future learning
        feedback_entry = {
            "timestamp": datetime.now().isoformat(),
            "product": product.id if hasattr(product, 'id') else str(product),
            "market_analysis": getattr(market_analysis, '__dict__', str(market_analysis)),
            "profit_scenarios": getattr(profit_scenarios, '__dict__', str(profit_scenarios)),
            "decision": decision.value if hasattr(decision, 'value') else str(decision),
            "execution_result": execution_result,
            "reasoning": reasoning
        }
        try:
            with open("agent_decision_feedback.jsonl", "a", encoding="utf-8") as f:
                f.write(json.dumps(feedback_entry) + "\n")
        except Exception as e:
            print(f"[Feedback Loop] Error writing feedback: {e}")