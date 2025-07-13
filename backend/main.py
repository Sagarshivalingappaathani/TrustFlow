from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json
from company_analyzer_agent import analyze_company
from product_pricing_agent import analyze_product_pricing

# Initialize FastAPI app
app = FastAPI(
    title="TrustFlow Business Analysis API",
    description="API for company analysis and product pricing prediction",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Pydantic models for request/response
class CompanyAnalysisRequest(BaseModel):
    company_name: str
    news_api_key: Optional[str] = None

class CompanyAnalysisResponse(BaseModel):
    report: str

class ProductPricingRequest(BaseModel):
    product_name: str
    description: str

class ProductPricingResponse(BaseModel):
    price_min: Optional[float]
    price_max: Optional[float]
    currency: str
    summary: str
    error: Optional[str] = None

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "TrustFlow Business Analysis API",
        "version": "1.0.0",
        "endpoints": {
            "company_analysis": "/analyze-company",
            "product_pricing": "/predict-price",
            "docs": "/docs"
        }
    }

# Company Analysis API
@app.post("/analyze-company", response_model=CompanyAnalysisResponse)
async def analyze_company_api(request: CompanyAnalysisRequest):
    """
    Analyze a company based on its name.
    
    - **company_name**: Name of the company to analyze
    
    Returns comprehensive company analysis report.
    """
    try:
        print(request)
        if not request.company_name or not request.company_name.strip():
            raise HTTPException(status_code=400, detail="Company name is required")
        
        # Call the company analyzer function
        result = analyze_company(
            company_name=request.company_name.strip(),
            news_api_key=request.news_api_key
        )
        
        if "report" not in result:
            raise HTTPException(status_code=500, detail="Failed to generate company analysis report")
        
        return CompanyAnalysisResponse(report=result["report"])
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Product Pricing API
@app.post("/predict-price", response_model=ProductPricingResponse)
async def predict_product_price_api(request: ProductPricingRequest):
    """
    Predict product pricing based on name and description.
    
    - **product_name**: Name of the product
    - **description**: Detailed description of the product
    
    Returns price range prediction with reasoning.
    """
    try:
        print(request)
        if not request.product_name or not request.product_name.strip():
            raise HTTPException(status_code=400, detail="Product name is required")
        
        if not request.description or not request.description.strip():
            raise HTTPException(status_code=400, detail="Product description is required")
        
        # Call the product pricing analyzer function
        result = analyze_product_pricing(
            product_name=request.product_name.strip(),
            description=request.description.strip()
        )
        print(result)
        
        return ProductPricingResponse(
            price_min=result.get("price_min"),
            price_max=result.get("price_max"),
            currency=result.get("currency", "Rupee"),
            summary=result.get("summary", ""),
            error=result.get("error")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint to verify API is running."""
    return {
        "status": "healthy",
        "message": "TrustFlow API is running successfully"
    }

# Run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)