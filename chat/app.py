from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import httpx
import json
from typing import Optional, Generator
import asyncio
import logging
from web3_service import web3_service
from analytics_service import analytics_service
import google.generativeai as genai
from product_decision_service import get_product_decision_service
from decision_history import decision_history

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="TrustFlow Chat API", version="1.0.0")

# CORS middleware to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini API
GEMINI_API_KEY = "AIzaSyBz22KtyqFVZSo5OpZ3lxj3o2hkoMxuEgs"
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

class ChatMessage(BaseModel):
    message: str
    conversation_history: Optional[list] = []
    user_address: Optional[str] = None

class ChatWithDataMessage(BaseModel):
    message: str
    user_address: str
    conversation_history: Optional[list] = []

class ChatResponse(BaseModel):
    response: str
    status: str

class ProductDecisionRequest(BaseModel):
    product_id: int
    private_key: str
    user_address: str

async def check_gemini_connection():
    """Check if Gemini API is accessible"""
    try:
        # Simple test to verify API key works
        test_response = model.generate_content("test")
        return True
    except Exception as e:
        print(f"Gemini connection error: {e}")
        return False

async def generate_blockchain_context(user_address: str, query: str) -> str:
    """Generate blockchain context for AI based on user query"""
    try:
        query_lower = query.lower()
        context_parts = []
        
        # Always include basic user data
        user_summary = analytics_service.get_user_analytics_summary(user_address)
        context_parts.append(user_summary)
        
        # Add market data if query is about market/pricing
        if any(keyword in query_lower for keyword in ['market', 'marketplace', 'price', 'cost', 'buy', 'sell', 'listing', 'products listed']):
            # For specific product listing requests, include detailed table
            if any(keyword in query_lower for keyword in ['products listed', 'market products', 'marketplace products', 'list of products']):
                market_listings = analytics_service.get_market_listings_table()
                context_parts.append("\n\nMARKET LISTINGS:")
                context_parts.append(market_listings)
            else:
                # For general market queries, include aggregate analysis
                market_analysis = analytics_service.get_market_analysis()
                context_parts.append("\n\nMARKET DATA:")
                context_parts.append(market_analysis)
        
        # Add comparative analysis if asking about comparisons
        if any(keyword in query_lower for keyword in ['compare', 'average', 'benchmark', 'vs', 'versus']):
            comparative_analysis = analytics_service.get_comparative_analysis(user_address)
            context_parts.append("\n\nCOMPARATIVE ANALYSIS:")
            context_parts.append(comparative_analysis)
        
        # Add insights if asking for recommendations or advice
        if any(keyword in query_lower for keyword in ['recommend', 'suggest', 'advice', 'should', 'insight']):
            insights = analytics_service.generate_insights(user_address)
            context_parts.append("\n\nBUSINESS INSIGHTS:")
            context_parts.append(insights)
        
        return "\n".join(context_parts)
        
    except Exception as e:
        return f"Error generating blockchain context: {str(e)}"

@app.post("/chat/with-data")
async def chat_with_blockchain_data(chat_message: ChatWithDataMessage):
    """Enhanced chat endpoint with blockchain data integration"""
    if not await check_gemini_connection():
        raise HTTPException(status_code=503, detail="Gemini API service is not available")
    
    if not web3_service.is_connected():
        raise HTTPException(status_code=503, detail="Blockchain connection is not available")
    
    try:
        # Generate blockchain context
        blockchain_context = await generate_blockchain_context(chat_message.user_address, chat_message.message)
        
        # Debug logging
        logger.info(f"Generated blockchain context length: {len(blockchain_context)}")
        logger.info(f"First 200 chars of context: {blockchain_context[:200]}")
        
        # Build enhanced conversation with blockchain context
        conversation_parts = []
        
        # Add system message with blockchain context (properly formatted for Gemini)
        system_message = f"""You are TrustFlow AI for supply chain management. Give SHORT, DIRECT answers only.

Current user's blockchain data:
{blockchain_context}

RULES:
- Answer ONLY what the user asks
- NO explanations or extra text
- Return raw markdown tables when requested
- Use exact data from blockchain_context
- Keep responses concise and to the point

When user asks for tables, return ONLY the table, nothing else."""
        
        # Create a conversation for Gemini with clear context
        prompt = f"""You are TrustFlow AI for blockchain supply chain management. 

User's blockchain data:
{blockchain_context}

User question: {chat_message.message}

Based on the blockchain data provided above, answer the user's question. If the data shows "No products owned", "No transactions found", etc., then acknowledge that and respond accordingly. Be direct and concise."""
        
        response = model.generate_content(prompt)
        return ChatResponse(
            response=response.text,
            status="success"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")

@app.get("/")
async def root():
    return {"message": "TrustFlow Chat API is running"}

@app.get("/health")
async def health_check():
    gemini_status = await check_gemini_connection()
    web3_status = web3_service.is_connected()
    return {
        "status": "healthy" if (gemini_status and web3_status) else "unhealthy",
        "gemini_connected": gemini_status,
        "web3_connected": web3_status,
        "model": "gemini-1.5-flash",
        "decision_service": "available",
        "decision_history": "available"
    }

@app.post("/chat")
async def chat_non_streaming(chat_message: ChatMessage):
    """Non-streaming chat endpoint with blockchain integration"""
    try:
        # Generate blockchain context
        blockchain_context = await generate_blockchain_context(chat_message.user_address, chat_message.message)
        
        # Build conversation with blockchain context
        conversation_parts = []
        
        # Add system message with blockchain context
        system_message = f"""You are TrustFlow AI for supply chain management. Give SHORT, DIRECT answers only.

Current user's blockchain data:
{blockchain_context}

RULES:
- Answer ONLY what the user asks
- NO explanations or extra text
- Return raw markdown tables when requested
- Use exact data from blockchain_context
- Keep responses concise and to the point

When user asks for tables, return ONLY the table, nothing else."""
        
        conversation_parts.append(system_message)
        
        # Add conversation history
        for msg in chat_message.conversation_history[-10:]:
            role = "user" if msg.get("role") == "user" else "assistant"
            conversation_parts.append(f"{role}: {msg.get('content', '')}")
        
        # Add current user message
        conversation_parts.append(f"user: {chat_message.message}")
        
        prompt = "\n".join(conversation_parts)
        
        response = model.generate_content(prompt)
        return ChatResponse(
            response=response.text,
            status="success"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")

@app.get("/blockchain/user/{address}")
async def get_user_blockchain_data(address: str):
    """Get comprehensive blockchain data for a user"""
    if not web3_service.is_connected():
        raise HTTPException(status_code=503, detail="Blockchain connection is not available")
    
    try:
        data = web3_service.get_comprehensive_user_data(address)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user data: {str(e)}")

@app.get("/blockchain/market")
async def get_market_data():
    """Get current market data"""
    if not web3_service.is_connected():
        raise HTTPException(status_code=503, detail="Blockchain connection is not available")
    
    try:
        market_data = web3_service.get_market_data()
        contract_stats = web3_service.get_contract_stats()
        return {
            "market": market_data,
            "stats": contract_stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching market data: {str(e)}")

@app.get("/blockchain/analytics/{address}")
async def get_user_analytics(address: str):
    """Get formatted analytics for a user"""
    if not web3_service.is_connected():
        raise HTTPException(status_code=503, detail="Blockchain connection is not available")
    
    try:
        summary = analytics_service.get_user_analytics_summary(address)
        insights = analytics_service.generate_insights(address)
        comparative = analytics_service.get_comparative_analysis(address)
        
        return {
            "summary": summary,
            "insights": insights,
            "comparative": comparative
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating analytics: {str(e)}")

@app.get("/test-context/{address}")
async def test_context(address: str):
    """Test endpoint to check blockchain context generation"""
    try:
        context = await generate_blockchain_context(address, "test query")
        return {
            "context_length": len(context),
            "context_preview": context[:500],
            "full_context": context
        }
    except Exception as e:
        return {"error": str(e)}

@app.post("/product/auto-decide")
async def auto_decide_product_action(request: ProductDecisionRequest):
    """AI-powered product decision and execution after manufacturing"""
    
    try:
        # Validate required fields
        if not request.product_id or not request.private_key or not request.user_address:
            raise HTTPException(400, "Missing required fields: product_id, private_key, user_address")
        
        # Get product data from blockchain
        product_data = web3_service.get_product_details(request.product_id, request.user_address)
        if not product_data:
            raise HTTPException(404, f"Product with ID {request.product_id} was not found on the blockchain. The manufacturing transaction may have failed or the product ID extraction was incorrect.")
        
        # Verify product ownership
        if product_data['currentOwner'].lower() != request.user_address.lower():
            raise HTTPException(403, "You don't own this product")
        
        # Get decision service instance
        decision_service = get_product_decision_service(GEMINI_API_KEY)
        
        # Make decision and execute
        result = await decision_service.make_product_decision(
            product_data, 
            request.private_key, 
            request.user_address
        )
        
        # Add to decision history
        decision_history.add_decision(request.user_address, request.product_id, result)
        
        return {
            "status": "success",
            "product_id": request.product_id,
            "product_name": product_data.get('name', 'Unknown'),
            "decision": result["decision"],
            "execution": result["execution_result"],
            "timestamp": result["timestamp"],
            "overall_status": result["status"]
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error in auto-decide endpoint: {e}")
        raise HTTPException(500, f"Internal server error: {str(e)}")

@app.get("/product/decision-history/{user_address}")
async def get_decision_history_endpoint(user_address: str):
    """Get decision history for a user"""
    try:
        decisions = decision_history.get_user_decisions(user_address)
        analytics = decision_history.get_decision_analytics(user_address)
        
        return {
            "status": "success",
            "user_address": user_address,
            "decisions": decisions,
            "analytics": analytics
        }
    except Exception as e:
        raise HTTPException(500, f"Error getting decision history: {str(e)}")

@app.get("/product/decision-analytics/{user_address}")
async def get_decision_analytics_endpoint(user_address: str):
    """Get decision analytics for a user"""
    try:
        analytics = decision_history.get_decision_analytics(user_address)
        return {
            "status": "success",
            "user_address": user_address,
            "analytics": analytics
        }
    except Exception as e:
        raise HTTPException(500, f"Error getting decision analytics: {str(e)}")

@app.get("/debug/user-products/{user_address}")
async def get_user_products_debug(user_address: str):
    """Debug endpoint to get all products owned by a user"""
    try:
        if not web3_service.is_connected():
            raise HTTPException(500, "Web3 service not connected")
        
        # Get product IDs owned by user
        product_ids = web3_service.contract.functions.getProductsByOwner(user_address).call()
        
        products = []
        for product_id in product_ids:
            # Try to get product details with our workaround function
            product_data = web3_service.get_product_details(int(product_id), user_address)
            if product_data:
                products.append(product_data)
        
        return {
            "user_address": user_address,
            "product_ids": [int(id) for id in product_ids],
            "product_count": len(product_ids),
            "products": products
        }
        
    except Exception as e:
        logger.error(f"Error getting user products: {e}")
        raise HTTPException(500, f"Error getting user products: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8002, reload=True)