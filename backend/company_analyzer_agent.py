import google.generativeai as genai
import yfinance as yf
import requests
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from typing import Dict, List, Optional, Tuple
import json
import os
from datetime import datetime, timedelta
import warnings

# Suppress warnings from yfinance
warnings.filterwarnings('ignore')

class CompanyAnalyzerAgent:
    def __init__(self, news_api_key: Optional[str] = None, model_name: str = "gemini-1.5-flash"):
        """
        Initialize the company analyzer agent with Gemini model and external APIs.
        
        Args:
            news_api_key: NewsAPI key (optional, will use environment variable if not provided)
            model_name: Gemini model name to use
        """
        # Configure Gemini
        google_api_key = os.getenv("GOOGLE_API_KEY")
        if not google_api_key:
            raise ValueError("Google API key is required. Set GOOGLE_API_KEY environment variable.")
        
        genai.configure(api_key=google_api_key)
        self.model = genai.GenerativeModel(model_name)
        
        # Configure NewsAPI
        self.news_api_key = news_api_key or os.getenv("NEWS_API_KEY")
        if not self.news_api_key:
            self.news_api_key = None
            print("Warning: NewsAPI key not provided. News analysis will be skipped.")
        
        # Initialize sentiment analyzer
        self.sentiment_analyzer = SentimentIntensityAnalyzer()
    
    def get_ticker_from_company_name(self, company_name: str) -> Dict:
        """
        Use Gemini AI to get the stock ticker symbol from company name.
        
        Args:
            company_name: Name of the company
            
        Returns:
            Dictionary containing ticker symbol and company details
        """
        try:
            prompt = f"""
Given the company name "{company_name}", provide the stock ticker symbol and official company name.

Respond in JSON format only:
{{
    "ticker": "<stock_ticker_symbol>",
    "official_name": "<official_company_name>",
    "exchange": "<primary_exchange>"
}}

Example:
- Input: "Apple" -> {{"ticker": "AAPL", "official_name": "Apple Inc.", "exchange": "NASDAQ"}}
- Input: "Microsoft" -> {{"ticker": "MSFT", "official_name": "Microsoft Corporation", "exchange": "NASDAQ"}}

If the company is not publicly traded or ticker cannot be determined, return:
{{"ticker": "NOT_FOUND", "official_name": "{company_name}", "exchange": "N/A"}}
"""

            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.1,
                    max_output_tokens=150,
                    response_mime_type="application/json"
                )
            )
            
            result = json.loads(response.text)
            return {"success": True, "data": result}
            
        except Exception as e:
            return {"success": False, "error": f"Failed to get ticker: {str(e)}"}
    
    def get_financial_data(self, ticker: str) -> Dict:
        """
        Fetch comprehensive financial data for a company using yfinance.
        
        Args:
            ticker: Stock ticker symbol (e.g., 'AAPL', 'GOOGL')
            
        Returns:
            Dictionary containing financial data and metrics
        """
        try:
            stock = yf.Ticker(ticker)
            
            # Get basic info
            info = stock.info
            
            # Get historical data (1 year)
            hist = stock.history(period="1y")
            
            # Get financial statements
            financials = stock.financials
            balance_sheet = stock.balance_sheet
            cash_flow = stock.cashflow
            
            # Calculate key metrics
            current_price = hist['Close'].iloc[-1] if not hist.empty else None
            year_high = hist['High'].max() if not hist.empty else None
            year_low = hist['Low'].min() if not hist.empty else None
            
            # Calculate price change metrics
            if len(hist) >= 2:
                price_change_1d = ((hist['Close'].iloc[-1] - hist['Close'].iloc[-2]) / hist['Close'].iloc[-2]) * 100
            else:
                price_change_1d = 0
                
            if len(hist) >= 30:
                price_change_30d = ((hist['Close'].iloc[-1] - hist['Close'].iloc[-30]) / hist['Close'].iloc[-30]) * 100
            else:
                price_change_30d = 0
            
            financial_data = {
                "ticker": ticker,
                "company_name": info.get('longName', 'N/A'),
                "sector": info.get('sector', 'N/A'),
                "industry": info.get('industry', 'N/A'),
                "current_price": current_price,
                "market_cap": info.get('marketCap', 'N/A'),
                "pe_ratio": info.get('trailingPE', 'N/A'),
                "pb_ratio": info.get('priceToBook', 'N/A'),
                "dividend_yield": info.get('dividendYield', 'N/A'),
                "beta": info.get('beta', 'N/A'),
                "year_high": year_high,
                "year_low": year_low,
                "price_change_1d": round(price_change_1d, 2),
                "price_change_30d": round(price_change_30d, 2),
                "volume": hist['Volume'].iloc[-1] if not hist.empty else None,
                "avg_volume": hist['Volume'].mean() if not hist.empty else None,
                "revenue": info.get('totalRevenue', 'N/A'),
                "profit_margin": info.get('profitMargins', 'N/A'),
                "debt_to_equity": info.get('debtToEquity', 'N/A'),
                "return_on_equity": info.get('returnOnEquity', 'N/A'),
                "employees": info.get('fullTimeEmployees', 'N/A'),
                "website": info.get('website', 'N/A'),
                "business_summary": info.get('longBusinessSummary', 'N/A')
            }
            
            return {"success": True, "data": financial_data}
            
        except Exception as e:
            return {"success": False, "error": f"Failed to fetch financial data: {str(e)}"}
    
    def get_company_news(self, company_name: str, ticker: str, days_back: int = 7) -> Dict:
        """
        Fetch recent news about the company using NewsAPI.
        
        Args:
            company_name: Full company name
            ticker: Stock ticker symbol
            days_back: Number of days to look back for news
            
        Returns:
            Dictionary containing news articles and metadata
        """
        if not self.news_api_key:
            return {"success": False, "error": "NewsAPI key not configured"}
        
        try:
            # Calculate date range
            to_date = datetime.now()
            from_date = to_date - timedelta(days=days_back)
            
            # Search for news using company name and ticker
            query = f'"{company_name}" OR "{ticker}"'
            
            # Use NewsAPI's everything endpoint
            url = "https://newsapi.org/v2/everything"
            params = {
                'q': query,
                'from': from_date.strftime('%Y-%m-%d'),
                'to': to_date.strftime('%Y-%m-%d'),
                'language': 'en',
                'sortBy': 'relevancy',
                'pageSize': 20,
                'apiKey': self.news_api_key
            }
            
            response = requests.get(url, params=params)
            response.raise_for_status()
            articles_data = response.json()
            
            news_data = {
                "total_articles": articles_data.get('totalResults', 0),
                "articles": []
            }
            
            for article in articles_data.get('articles', [])[:10]:  # Limit to top 10 articles
                news_data["articles"].append({
                    "title": article.get('title', ''),
                    "description": article.get('description', ''),
                    "url": article.get('url', ''),
                    "published_at": article.get('publishedAt', ''),
                    "source": article.get('source', {}).get('name', '')
                })
            
            return {"success": True, "data": news_data}
            
        except Exception as e:
            return {"success": False, "error": f"Failed to fetch news: {str(e)}"}
    
    def analyze_sentiment(self, texts: List[str]) -> Dict:
        """
        Analyze sentiment of given texts using VADER sentiment analyzer.
        
        Args:
            texts: List of text strings to analyze
            
        Returns:
            Dictionary containing sentiment analysis results
        """
        if not texts:
            return {"success": False, "error": "No texts provided for sentiment analysis"}
        
        try:
            sentiments = []
            total_compound = 0
            
            for text in texts:
                if text:  # Skip empty texts
                    scores = self.sentiment_analyzer.polarity_scores(text)
                    sentiments.append({
                        "text": text[:100] + "..." if len(text) > 100 else text,
                        "compound": scores['compound'],
                        "positive": scores['pos'],
                        "negative": scores['neg'],
                        "neutral": scores['neu']
                    })
                    total_compound += scores['compound']
            
            if sentiments:
                avg_sentiment = total_compound / len(sentiments)
                
                # Categorize overall sentiment
                if avg_sentiment >= 0.05:
                    sentiment_label = "Positive"
                elif avg_sentiment <= -0.05:
                    sentiment_label = "Negative"
                else:
                    sentiment_label = "Neutral"
                
                return {
                    "success": True,
                    "data": {
                        "overall_sentiment": sentiment_label,
                        "average_score": round(avg_sentiment, 3),
                        "individual_sentiments": sentiments,
                        "total_analyzed": len(sentiments)
                    }
                }
            else:
                return {"success": False, "error": "No valid texts to analyze"}
                
        except Exception as e:
            return {"success": False, "error": f"Failed to analyze sentiment: {str(e)}"}
    
    def generate_company_report(self, financial_data: Dict, news_data: Dict, sentiment_data: Dict) -> Dict:
        """
        Generate a comprehensive company report using Gemini AI in detailed paragraph format.
        
        Args:
            financial_data: Financial metrics and data
            news_data: Recent news articles
            sentiment_data: Sentiment analysis results
            
        Returns:
            Dictionary containing the generated report in paragraph format
        """
        try:
            # Prepare the prompt with all collected data
            prompt = f"""
As a professional financial analyst, write a comprehensive, detailed company analysis report in paragraph format based on the following data:

FINANCIAL DATA:
- Company: {financial_data.get('company_name', 'N/A')} ({financial_data.get('ticker', 'N/A')})
- Sector: {financial_data.get('sector', 'N/A')}
- Industry: {financial_data.get('industry', 'N/A')}
- Current Price: ${financial_data.get('current_price', 'N/A')}
- Market Cap: {financial_data.get('market_cap', 'N/A')}
- P/E Ratio: {financial_data.get('pe_ratio', 'N/A')}
- P/B Ratio: {financial_data.get('pb_ratio', 'N/A')}
- Beta: {financial_data.get('beta', 'N/A')}
- Dividend Yield: {financial_data.get('dividend_yield', 'N/A')}
- 1-Day Price Change: {financial_data.get('price_change_1d', 'N/A')}%
- 30-Day Price Change: {financial_data.get('price_change_30d', 'N/A')}%
- Debt to Equity: {financial_data.get('debt_to_equity', 'N/A')}
- Return on Equity: {financial_data.get('return_on_equity', 'N/A')}
- Profit Margin: {financial_data.get('profit_margin', 'N/A')}
- Revenue: {financial_data.get('revenue', 'N/A')}
- Employees: {financial_data.get('employees', 'N/A')}

NEWS SENTIMENT:
- Overall Sentiment: {sentiment_data.get('overall_sentiment', 'N/A')}
- Average Sentiment Score: {sentiment_data.get('average_score', 'N/A')}
- Total News Articles Analyzed: {sentiment_data.get('total_analyzed', 'N/A')}

RECENT NEWS HEADLINES:
{chr(10).join([f"- {article.get('title', 'N/A')}" for article in news_data.get('articles', [])[:5]])}

BUSINESS SUMMARY:
{financial_data.get('business_summary', 'N/A')}

Write a comprehensive analysis report in flowing paragraph format that covers:

1. Company Overview and Business Model
2. Current Financial Health and Performance Analysis
3. Market Position and Competitive Landscape
4. Recent News Impact and Market Sentiment Analysis
5. Risk Assessment and Key Challenges
6. Growth Prospects and Future Outlook
7. Investment Recommendation with Rationale

The report should be written in a professional, analytical tone suitable for potential B2B partners. Use smooth transitions between topics and provide specific data points to support your analysis. The report should be detailed, insightful, and actionable.

Provide the complete report as a single, well-structured text without any JSON formatting or section headers - just flowing paragraphs that tell the complete story of the company's current situation and prospects.
"""

            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.4,
                    max_output_tokens=3000,
                )
            )
            
            return {"success": True, "data": response.text.strip()}
            
        except Exception as e:
            return {"success": False, "error": f"Failed to generate report: {str(e)}"}
    
    def analyze_company(self, company_name: str) -> Dict:
        """
        Perform comprehensive company analysis using only the company name as input.
        
        Args:
            company_name: Name of the company to analyze
            
        Returns:
            Dictionary with a single 'report' field containing detailed analysis
        """
        try:
            print(f"Starting analysis for {company_name}...")
            
            # Step 1: Get ticker from company name using Gemini
            print("Getting ticker symbol...")
            ticker_result = self.get_ticker_from_company_name(company_name)
            if not ticker_result["success"]:
                return {"report": f"Unable to analyze {company_name}: {ticker_result['error']}"}
            
            ticker_data = ticker_result["data"]
            ticker = ticker_data.get("ticker")
            official_name = ticker_data.get("official_name", company_name)
            
            if ticker == "NOT_FOUND":
                return {"report": f"Unable to find stock ticker for {company_name}. The company may not be publicly traded or may need a more specific name."}
            
            print(f"Found ticker: {ticker} for {official_name}")
            
            # Step 2: Get financial data
            print("Fetching financial data...")
            financial_result = self.get_financial_data(ticker)
            if not financial_result["success"]:
                return {"report": f"Unable to fetch financial data for {official_name} ({ticker}): {financial_result['error']}"}
            
            financial_data = financial_result["data"]
            
            # Step 3: Get news data
            print("Fetching recent news...")
            news_result = self.get_company_news(official_name, ticker)
            news_data = news_result.get("data", {"articles": []}) if news_result["success"] else {"articles": []}
            
            # Step 4: Analyze sentiment
            print("Analyzing news sentiment...")
            news_texts = []
            if news_data.get("articles"):
                for article in news_data["articles"]:
                    title = article.get("title", "")
                    description = article.get("description", "")
                    if title:
                        news_texts.append(title)
                    if description:
                        news_texts.append(description)
            
            sentiment_result = self.analyze_sentiment(news_texts)
            sentiment_data = sentiment_result.get("data", {}) if sentiment_result["success"] else {}
            
            # Step 5: Generate comprehensive report
            print("Generating AI-powered analysis report...")
            report_result = self.generate_company_report(financial_data, news_data, sentiment_data)
            
            if report_result["success"]:
                print("Analysis completed successfully!")
                return {"report": report_result["data"]}
            else:
                return {"report": f"Unable to generate analysis report for {official_name}: {report_result['error']}"}
                
        except Exception as e:
            return {"report": f"Analysis failed for {company_name}: {str(e)}"}

def analyze_company(company_name: str, news_api_key: Optional[str] = None) -> Dict:
    """
    Convenience function to analyze a company using only the company name.
    
    Args:
        company_name: Name of the company to analyze
        news_api_key: Optional NewsAPI key
        
    Returns:
        Dictionary with a single 'report' field containing detailed analysis
    """
    agent = CompanyAnalyzerAgent(news_api_key=news_api_key)
    return agent.analyze_company(company_name)

# Example usage
if __name__ == "__main__":
    # Test the company analyzer with just company name
    result = analyze_company("Apple")
    print(result["report"])
