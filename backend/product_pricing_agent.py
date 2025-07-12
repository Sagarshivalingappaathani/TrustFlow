import requests
from bs4 import BeautifulSoup
import re
import statistics
from typing import List, Dict, Tuple
import time
import random
from urllib.parse import quote_plus, urljoin
import json
import warnings
warnings.filterwarnings('ignore')

class B2BPriceScraper:
    def __init__(self):
        # Rotate user agents to avoid detection
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
        
        self.session = requests.Session()
        self.update_headers()
        
        # Currency conversion rates
        self.exchange_rates = self.get_exchange_rates()
    
    def update_headers(self):
        """Update headers with random user agent"""
        headers = {
            'User-Agent': random.choice(self.user_agents),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
        }
        self.session.headers.update(headers)
    
    def get_exchange_rates(self) -> Dict[str, float]:
        """Get current exchange rates to INR"""
        try:
            response = requests.get('https://api.exchangerate-api.com/v4/latest/INR', timeout=10)
            data = response.json()
            
            rates = {}
            for currency, rate in data['rates'].items():
                rates[currency] = 1 / rate
            
            rates['INR'] = 1.0
            return rates
        except:
            return {
                'USD': 83.0, 'EUR': 91.0, 'GBP': 105.0, 'JPY': 0.56, 'CAD': 61.0,
                'AUD': 55.0, 'SGD': 62.0, 'CHF': 92.0, 'CNY': 11.5, 'INR': 1.0
            }
    
    def extract_price_and_currency(self, text: str) -> Tuple[float, str]:
        """Enhanced price and currency extraction"""
        if not text:
            return 0.0, 'INR'
        
        # Clean the text
        text = re.sub(r'[^\w\s₹$€£¥.,]', ' ', text)
        text = text.replace(',', '')
        
        # Price patterns with currency symbols
        currency_patterns = [
            (r'₹\s*(\d+(?:\.\d+)?)', 'INR'),
            (r'Rs\.?\s*(\d+(?:\.\d+)?)', 'INR'),
            (r'INR\s*(\d+(?:\.\d+)?)', 'INR'),
            (r'\$\s*(\d+(?:\.\d+)?)', 'USD'),
            (r'USD\s*(\d+(?:\.\d+)?)', 'USD'),
            (r'€\s*(\d+(?:\.\d+)?)', 'EUR'),
            (r'EUR\s*(\d+(?:\.\d+)?)', 'EUR'),
            (r'£\s*(\d+(?:\.\d+)?)', 'GBP'),
            (r'GBP\s*(\d+(?:\.\d+)?)', 'GBP'),
            (r'¥\s*(\d+(?:\.\d+)?)', 'JPY'),
            (r'JPY\s*(\d+(?:\.\d+)?)', 'JPY'),
            (r'(\d+(?:\.\d+)?)\s*₹', 'INR'),
            (r'(\d+(?:\.\d+)?)\s*Rs\.?', 'INR'),
            (r'(\d+(?:\.\d+)?)\s*\$', 'USD'),
            (r'(\d+(?:\.\d+)?)\s*€', 'EUR'),
            (r'(\d+(?:\.\d+)?)\s*£', 'GBP'),
        ]
        
        for pattern, currency in currency_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                try:
                    # Get the largest number (likely the main price)
                    prices = [float(match) for match in matches]
                    price = max(prices)
                    if price > 0:
                        return price, currency
                except:
                    continue
        
        # If no currency found, try to extract numbers (assume INR for Indian sites)
        number_matches = re.findall(r'\d+\.?\d*', text)
        if number_matches:
            try:
                prices = [float(match) for match in number_matches if float(match) > 0]
                if prices:
                    return max(prices), 'INR'
            except:
                pass
        
        return 0.0, 'INR'
    
    def convert_to_inr(self, price: float, currency: str) -> float:
        """Convert price to Indian Rupees"""
        if currency.upper() in self.exchange_rates:
            return price * self.exchange_rates[currency.upper()]
        return price * self.exchange_rates.get('USD', 83.0)
    
    def search_duckduckgo(self, product_name: str) -> List[Dict]:
        """Use DuckDuckGo as Google alternative"""
        products = []
        try:
            # DuckDuckGo search for shopping
            search_query = f"{product_name} price buy online"
            search_url = f"https://duckduckgo.com/html/?q={quote_plus(search_query)}"
            
            self.update_headers()
            response = self.session.get(search_url, timeout=15)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Find search results
                search_results = soup.find_all('div', class_='result') or soup.find_all('div', class_='web-result')
                
                for result in search_results[:10]:
                    try:
                        # Extract title and link
                        title_elem = result.find('a', class_='result__a') or result.find('h2')
                        if title_elem:
                            title = title_elem.get_text(strip=True)
                            link = title_elem.get('href', '')
                            
                            # Extract price from snippet
                            snippet = result.get_text()
                            price_matches = re.findall(r'[₹$€£¥]\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?\s*[₹$€£¥]|Rs\.?\s*\d+(?:\.\d+)?', snippet)
                            
                            for price_match in price_matches:
                                price, currency = self.extract_price_and_currency(price_match)
                                if price > 0:
                                    inr_price = self.convert_to_inr(price, currency)
                                    products.append({
                                        'name': title,
                                        'price': price,
                                        'currency': currency,
                                        'inr_price': inr_price,
                                        'source': 'DuckDuckGo Search',
                                        'link': link
                                    })
                                    break
                    except:
                        continue
                        
        except Exception as e:
            print(f"Error searching DuckDuckGo: {e}")
        
        return products
    
    def scrape_indiamart(self, product_name: str) -> List[Dict]:
        """Scrape IndiaMart for B2B prices"""
        products = []
        try:
            search_url = f"https://www.indiamart.com/impcat/{quote_plus(product_name)}.html"
            
            self.update_headers()
            response = self.session.get(search_url, timeout=15)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Find product containers
                containers = soup.find_all('div', class_='prd-item') or \
                           soup.find_all('div', class_='cardbox') or \
                           soup.find_all('div', {'data-testid': 'product-card'})
                
                for container in containers[:8]:
                    try:
                        # Extract product name
                        name_elem = container.find('h2') or container.find('h3') or \
                                  container.find('a', class_='prd-name') or \
                                  container.find('span', class_='prd-name')
                        
                        product_title = name_elem.get_text(strip=True) if name_elem else f"{product_name} - IndiaMart"
                        
                        # Extract price
                        price_elem = container.find('span', class_='prc') or \
                                   container.find('div', class_='price') or \
                                   container.find('span', text=re.compile(r'[₹$]')) or \
                                   container.find('div', text=re.compile(r'Rs\.?'))
                        
                        if price_elem:
                            price_text = price_elem.get_text(strip=True)
                            price, currency = self.extract_price_and_currency(price_text)
                            
                            if price > 0:
                                inr_price = self.convert_to_inr(price, currency)
                                products.append({
                                    'name': product_title,
                                    'price': price,
                                    'currency': currency,
                                    'inr_price': inr_price,
                                    'source': 'IndiaMart'
                                })
                    except:
                        continue
                        
        except Exception as e:
            print(f"Error scraping IndiaMart: {e}")
        
        return products
    
    def scrape_tradeindia(self, product_name: str) -> List[Dict]:
        """Scrape TradeIndia for B2B prices"""
        products = []
        try:
            search_url = f"https://www.tradeindia.com/search.html?ss={quote_plus(product_name)}"
            
            self.update_headers()
            response = self.session.get(search_url, timeout=15)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Find product containers
                containers = soup.find_all('div', class_='product-item') or \
                           soup.find_all('div', class_='prd-box') or \
                           soup.find_all('tr', class_='catPrd')
                
                for container in containers[:8]:
                    try:
                        # Extract product name
                        name_elem = container.find('h3') or container.find('h4') or \
                                  container.find('a', class_='prd-name') or \
                                  container.find('td', class_='prd-name')
                        
                        product_title = name_elem.get_text(strip=True) if name_elem else f"{product_name} - TradeIndia"
                        
                        # Extract price
                        price_elem = container.find('td', class_='prd-price') or \
                                   container.find('span', class_='price') or \
                                   container.find('div', class_='price')
                        
                        if price_elem:
                            price_text = price_elem.get_text(strip=True)
                            price, currency = self.extract_price_and_currency(price_text)
                            
                            if price > 0:
                                inr_price = self.convert_to_inr(price, currency)
                                products.append({
                                    'name': product_title,
                                    'price': price,
                                    'currency': currency,
                                    'inr_price': inr_price,
                                    'source': 'TradeIndia'
                                })
                    except:
                        continue
                        
        except Exception as e:
            print(f"Error scraping TradeIndia: {e}")
        
        return products
    
    def scrape_alibaba(self, product_name: str) -> List[Dict]:
        """Scrape Alibaba for bulk prices"""
        products = []
        try:
            search_url = f"https://www.alibaba.com/trade/search?fsb=y&IndexArea=product_en&CatId=&SearchText={quote_plus(product_name)}"
            
            self.update_headers()
            response = self.session.get(search_url, timeout=15)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Find product containers
                containers = soup.find_all('div', class_='organic-offer-wrapper') or \
                           soup.find_all('div', class_='m-gallery-product-item-wrap')
                
                for container in containers[:8]:
                    try:
                        # Extract product name
                        name_elem = container.find('h4') or container.find('h3') or \
                                  container.find('a', class_='organic-offer-title')
                        
                        product_title = name_elem.get_text(strip=True) if name_elem else f"{product_name} - Alibaba"
                        
                        # Extract price
                        price_elem = container.find('span', class_='offer-price') or \
                                   container.find('div', class_='price')
                        
                        if price_elem:
                            price_text = price_elem.get_text(strip=True)
                            price, currency = self.extract_price_and_currency(price_text)
                            
                            if price > 0:
                                inr_price = self.convert_to_inr(price, currency)
                                products.append({
                                    'name': product_title,
                                    'price': price,
                                    'currency': currency,
                                    'inr_price': inr_price,
                                    'source': 'Alibaba'
                                })
                    except:
                        continue
                        
        except Exception as e:
            print(f"Error scraping Alibaba: {e}")
        
        return products
    
    def scrape_b2b_sites(self, product_name: str) -> List[Dict]:
        """Scrape multiple B2B sites"""
        products = []
        
        # B2B sites to search
        b2b_scrapers = [
            ('IndiaMart', self.scrape_indiamart),
            ('TradeIndia', self.scrape_tradeindia),
            ('Alibaba', self.scrape_alibaba),
        ]
        
        for site_name, scraper_func in b2b_scrapers:
            try:
                print(f"Scraping {site_name}...")
                site_products = scraper_func(product_name)
                products.extend(site_products)
                # print(f"Found {len(site_products)} products from {site_name}")
                time.sleep(random.uniform(2, 5))  # Rate limiting
            except Exception as e:
                print(f"Error scraping {site_name}: {e}")
                continue
        
        return products
    
    def scrape_ecommerce_sites(self, product_name: str) -> List[Dict]:
        """Scrape e-commerce sites suitable for B2B"""
        products = []
        
        # E-commerce sites
        sites = [
            ('Amazon', f"https://www.amazon.in/s?k={quote_plus(product_name)}"),
            ('Flipkart', f"https://www.flipkart.com/search?q={quote_plus(product_name)}"),
        ]
        
        for site_name, url in sites:
            try:
                print(f"Scraping {site_name}...")
                site_products = self.scrape_ecommerce_site(url, site_name, product_name)
                products.extend(site_products)
                # print(f"Found {len(site_products)} products from {site_name}")
                time.sleep(random.uniform(2, 4))
            except Exception as e:
                print(f"Error scraping {site_name}: {e}")
                continue
        
        return products
    
    def scrape_ecommerce_site(self, url: str, site_name: str, product_name: str) -> List[Dict]:
        """Enhanced e-commerce site scraper using only requests and BeautifulSoup"""
        products = []
        
        try:
            self.update_headers()
            
            response = self.session.get(url, timeout=15)
            if response.status_code != 200:
                return products
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Enhanced selectors
            selectors = {
                'Amazon': {
                    'container': 'div[data-component-type="s-search-result"], div.s-result-item',
                    'title': 'h2 a span, h2 span, .a-size-base-plus, .a-size-base',
                    'price': 'span.a-price-whole, span.a-price-range, .a-price .a-offscreen'
                },
                'Flipkart': {
                    'container': 'div._1AtVbE, div._13oc-S, div._2kHMtA',
                    'title': 'div._4rR01T, a._1fQZEK, div.s1Q9rs',
                    'price': 'div._30jeq3, div._25b18c, div._3I9_wc'
                }
            }
            
            if site_name in selectors:
                selector_config = selectors[site_name]
                containers = soup.select(selector_config['container'])
                
                for container in containers[:10]:  # Increased limit
                    try:
                        # Extract title
                        title_elem = container.select_one(selector_config['title'])
                        title = title_elem.get_text(strip=True) if title_elem else f"{product_name} - {site_name}"
                        
                        # Extract price
                        price_elem = container.select_one(selector_config['price'])
                        if price_elem:
                            price_text = price_elem.get_text(strip=True)
                            price, currency = self.extract_price_and_currency(price_text)
                            
                            if price > 0:
                                inr_price = self.convert_to_inr(price, currency)
                                products.append({
                                    'name': title,
                                    'price': price,
                                    'currency': currency,
                                    'inr_price': inr_price,
                                    'source': site_name
                                })
                    except:
                        continue
            
            # Enhanced fallback search
            if not products:
                # Look for any element containing price-like text
                all_text = soup.get_text()
                price_matches = re.findall(r'[₹$€£¥]\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?\s*[₹$€£¥]|Rs\.?\s*\d+(?:\.\d+)?', all_text)
                
                for price_match in price_matches[:5]:
                    price, currency = self.extract_price_and_currency(price_match)
                    if price > 0:
                        inr_price = self.convert_to_inr(price, currency)
                        products.append({
                            'name': f"{product_name} - {site_name}",
                            'price': price,
                            'currency': currency,
                            'inr_price': inr_price,
                            'source': site_name
                        })
                        
        except Exception as e:
            print(f"Error scraping {site_name}: {e}")
        
        return products
    
    def search_and_scrape(self, product_name: str, description: str = "") -> Dict:
        """Main search and scrape function for B2B"""
        print(f"Searching for: {product_name}")
        if description:
            print(f"Description: {description}")
        
        all_products = []
        
        # 1. Search using DuckDuckGo (Google alternative)
        print("Searching DuckDuckGo...")
        duckduckgo_products = self.search_duckduckgo(product_name)
        all_products.extend(duckduckgo_products)
        # print(f"Found {len(duckduckgo_products)} products from DuckDuckGo")
        
        time.sleep(random.uniform(2, 4))
        
        # 2. B2B sites
        print("Searching B2B sites...")
        b2b_products = self.scrape_b2b_sites(product_name)
        all_products.extend(b2b_products)
        # print(f"Found {len(b2b_products)} products from B2B sites")
        
        time.sleep(random.uniform(2, 4))
        
        # 3. E-commerce sites
        print("Searching e-commerce sites...")
        ecommerce_products = self.scrape_ecommerce_sites(product_name)
        all_products.extend(ecommerce_products)
        # print(f"Found {len(ecommerce_products)} products from e-commerce sites")
        
        # Remove duplicates
        unique_products = self.remove_duplicates(all_products)
        
        # Calculate statistics
        if unique_products:
            inr_prices = [p['inr_price'] for p in unique_products if p['inr_price'] > 0]
            
            if inr_prices:
                avg_price = statistics.mean(inr_prices)
                median_price = statistics.median(inr_prices)
                min_price = min(inr_prices)
                max_price = max(inr_prices)
                
                return {
                    'product_name': product_name,
                    'description': description,
                    'products_found': unique_products,
                    'total_products': len(unique_products),
                    'price_statistics': {
                        'average_inr': round(avg_price, 2),
                        'median_inr': round(median_price, 2),
                        'min_inr': round(min_price, 2),
                        'max_inr': round(max_price, 2)
                    }
                }
        
        return {
            'product_name': product_name,
            'description': description,
            'products_found': unique_products,
            'total_products': len(unique_products),
            'price_statistics': None,
            'message': 'No products found'
        }
    
    def remove_duplicates(self, products: List[Dict]) -> List[Dict]:
        """Remove duplicate products"""
        if not products:
            return products
        
        seen = set()
        unique_products = []
        
        for product in products:
            # Create a key based on price and partial name
            price_key = round(product['inr_price'], -1)  # Round to nearest 10
            name_key = product['name'][:50].lower()  # First 50 chars
            key = (price_key, name_key)
            
            if key not in seen:
                unique_products.append(product)
                seen.add(key)
        
        return unique_products
    
    def display_results(self, results: Dict):
        """Display results grouped by source"""
        print("\n" + "="*100)
        print(f"B2B PRICE ANALYSIS FOR: {results['product_name'].upper()}")
        print("="*100)
        
        if results['description']:
            print(f"Description: {results['description']}")
            print("-"*100)
        
        if results['products_found']:
            print(f"\nFound {results['total_products']} products from multiple sources:")
            print("-"*100)
            
            # Group by source
            sources = {}
            for product in results['products_found']:
                source = product['source']
                if source not in sources:
                    sources[source] = []
                sources[source].append(product)
            
            for source, products in sources.items():
                print(f"\n{source.upper()} ({len(products)} products):")
                for i, product in enumerate(products, 1):
                    print(f"  {i}. {product['name'][:80]}...")
                    print(f"     Price: {product['price']} {product['currency']} = ₹{product['inr_price']:,.2f}")
            
            if results['price_statistics']:
                stats = results['price_statistics']
                print(f"\nPRICE STATISTICS (in INR):")
                print("-"*50)
                print(f"Average Price: ₹{stats['average_inr']:,.2f}")
                print(f"Median Price:  ₹{stats['median_inr']:,.2f}")
                print(f"Min Price:     ₹{stats['min_inr']:,.2f}")
                print(f"Max Price:     ₹{stats['max_inr']:,.2f}")
        else:
            print("No products found. Try:")
            print("1. Using more specific product names")
            print("2. Including model numbers or specifications")
            print("3. Using industry-standard product names")
        
        print("="*100)

# Usage example
def main():
    # Initialize scraper
    scraper = B2BPriceScraper()
    
    # Test with transistors
    product_name = "snapdragon 782g, 8gb ram, 128gb storage, 5000mah battery, 6.72 inch display"
    description = ""
    
    results = scraper.search_and_scrape(product_name, description)
    scraper.display_results(results)
    
    return results

if __name__ == "__main__":
    results = main()