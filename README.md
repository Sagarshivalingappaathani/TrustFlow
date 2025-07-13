# TrustFlow Backend

AI-powered business analysis backend built with FastAPI, featuring autonomous sales agents, company analysis, and intelligent pricing using Google Gemini AI.

## Features

- **Company Analysis API**: Financial data analysis with news sentiment using Yahoo Finance and NewsAPI
- **Product Pricing Intelligence**: AI-powered pricing recommendations
- **Autonomous Sales Agent**: Smart decision-making for bulk vs retail sales strategies
- **Blockchain Integration**: Smart contract deployment for secure transactions
- **RESTful API**: FastAPI with CORS support and automatic documentation

## Folder Structure

```
backend/
├── main.py                     # FastAPI server with API endpoints
├── company_analyzer_agent.py   # Company financial & news analysis
├── product_pricing_agent.py    # AI-powered product pricing
├── smart_decision_agent.py     # Autonomous sales decision engine
├── run_agent.py               # Agent execution script
├── requirement.txt            # Python dependencies
└── agent_decision_feedback.jsonl  # Decision history log
```

## File Logic & Intent

### `main.py`
- **Purpose**: FastAPI application server
- **Logic**: Provides REST endpoints for company analysis and product pricing
- **Key Endpoints**:
  - `POST /analyze-company`: Company financial and news analysis
  - `POST /predict-price`: Product pricing recommendations
  - `GET /docs`: Interactive API documentation

### `company_analyzer_agent.py`
- **Purpose**: Comprehensive company analysis using multiple data sources
- **Logic**: 
  - Uses Gemini AI to extract stock ticker from company name
  - Fetches financial data via Yahoo Finance (yfinance)
  - Retrieves recent news articles via NewsAPI
  - Performs sentiment analysis using VADER
  - Generates detailed company reports with AI insights
- **Key Features**: Financial metrics, news sentiment, competitive analysis

### `product_pricing_agent.py`
- **Purpose**: AI-driven product pricing analysis
- **Logic**:
  - Uses Gemini AI to analyze market conditions
  - Considers competition, features, target audience, and costs
  - Returns price ranges with detailed reasoning
  - Provides JSON-formatted pricing recommendations

### `smart_decision_agent.py`
- **Purpose**: Autonomous sales agent with AI decision-making
- **Logic**:
  - Analyzes market conditions using Gemini AI
  - Makes decisions between retail, bulk, or hold strategies
  - Generates AI-optimized contracts for bulk buyers
  - Manages buyer database with credit scoring
  - Integrates with blockchain for transaction security
  - Logs decisions for learning and improvement
- **Key Components**:
  - Market analysis engine
  - Buyer matching system
  - Contract generation
  - Blockchain interface
  - Email service integration

### `run_agent.py`
- **Purpose**: Standalone script to test the autonomous sales agent
- **Logic**: Simulates product creation and triggers agent decision-making process

## Setup Instructions

### Prerequisites
- Python 3.8+
- Google API Key (for Gemini AI)
- NewsAPI Key (optional, for company news analysis)

### Installation

1. **Create Virtual Environment**
```bash
cd backend
python -m venv myenv
source myenv/bin/activate  # On Windows: myenv\Scripts\activate
```

2. **Install Dependencies**
```bash
pip install -r requirement.txt
```

3. **Set Environment Variables**
```bash
export GOOGLE_API_KEY="your_google_gemini_api_key"
export NEWS_API_KEY="your_news_api_key"  # Optional
```

4. **Run FastAPI Server**
```bash
python main.py
# Server runs on http://localhost:8000
# API docs available at http://localhost:8000/docs
```

### Testing the Autonomous Agent
```bash
python run_agent.py
# Simulates product creation and autonomous decision-making
```

## Key Technologies

- **AI/ML**: Google Gemini AI for analysis and decision-making
- **Data Sources**: Yahoo Finance (yfinance), NewsAPI, VADER sentiment analysis
- **Web Framework**: FastAPI with Pydantic models
- **Blockchain**: Web3.py for Ethereum integration
- **Email**: SMTP integration for contract delivery
- **Data Storage**: JSON-based logging and buyer database

## API Usage Examples

### Company Analysis
```bash
curl -X POST "http://localhost:8000/analyze-company" \
  -H "Content-Type: application/json" \
  -d '{"company_name": "Apple Inc"}'
```

### Product Pricing
```bash
curl -X POST "http://localhost:8000/predict-price" \
  -H "Content-Type: application/json" \
  -d '{"product_name": "Wireless Headphones", "description": "Bluetooth 5.0, noise cancelling"}'
```

## Business Logic

The backend operates through intelligent agents that:

1. **Analyze companies** using real-time financial data and news sentiment
2. **Generate pricing strategies** based on AI market analysis
3. **Make autonomous sales decisions** between bulk and retail strategies
4. **Create optimized contracts** using AI-generated terms
5. **Match products with buyers** using creditworthiness analysis
