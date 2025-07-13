import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Package, Users, BarChart3, ArrowUpRight, ArrowDownRight, Calendar, Hash } from 'lucide-react';
import SummaryCards from './SummaryCards';
import RelationshipCards from './RelationshipCards';

interface FormattedResponseProps {
  content: string;
}

const FormattedResponse: React.FC<FormattedResponseProps> = ({ content }) => {
  // Function to detect and format tables
  const detectAndFormatTable = (text: string) => {
    const lines = text.split('\n');
    const tableLines = lines.filter(line => line.includes('|') && line.trim().length > 0);
    
    if (tableLines.length >= 2) {
      const headers = tableLines[0].split('|').map(h => h.trim()).filter(h => h);
      // Skip separator line (usually contains --- )
      const dataLines = tableLines.slice(1).filter(line => !line.includes('---'));
      const rows = dataLines.map(row => 
        row.split('|').map(cell => cell.trim()).filter(cell => cell)
      );
      
      if (headers.length > 0 && rows.length > 0) {
        return (
          <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm my-4">
            <table className="min-w-full divide-y divide-gray-200 bg-white">
              <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <tr>
                  {headers.map((header, i) => (
                    <th key={i} className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 last:border-r-0">
                      <div className="flex items-center space-x-1">
                        {header.toLowerCase().includes('role') && <Users className="w-4 h-4" />}
                        {header.toLowerCase().includes('partner') && <Users className="w-4 h-4" />}
                        {header.toLowerCase().includes('product') && <Package className="w-4 h-4" />}
                        {header.toLowerCase().includes('price') && <DollarSign className="w-4 h-4" />}
                        {header.toLowerCase().includes('status') && <BarChart3 className="w-4 h-4" />}
                        {header.toLowerCase().includes('transaction') && <Hash className="w-4 h-4" />}
                        {header.toLowerCase().includes('date') && <Calendar className="w-4 h-4" />}
                        {header.toLowerCase().includes('amount') && <DollarSign className="w-4 h-4" />}
                        {header.toLowerCase().includes('type') && <BarChart3 className="w-4 h-4" />}
                        <span>{header}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors duration-200">
                    {row.map((cell, j) => (
                      <td key={j} className="px-6 py-4 whitespace-nowrap text-sm border-r border-gray-100 last:border-r-0">
                        {/* Only format ETH values or numbers in price/amount columns */}
                        {(cell.includes('ETH') || 
                          (headers[j] && (headers[j].toLowerCase().includes('price') || 
                                         headers[j].toLowerCase().includes('value') || 
                                         headers[j].toLowerCase().includes('amount')) && 
                           /^\d+\.?\d*$/.test(cell))) ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <DollarSign className="w-3 h-3 mr-1" />
                            {cell.includes('ETH') ? cell : `${cell} ETH`}
                          </span>
                        ) : /^\d+$/.test(cell) && (headers[j] && headers[j].toLowerCase().includes('id')) ? (
                          <span className="text-gray-900 font-mono text-sm font-medium">{cell}</span>
                        ) : cell.toLowerCase() === 'buyer' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <Users className="w-3 h-3 mr-1" />
                            {cell}
                          </span>
                        ) : cell.toLowerCase() === 'supplier' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            <Package className="w-3 h-3 mr-1" />
                            {cell}
                          </span>
                        ) : cell.toLowerCase() === 'accepted' || cell.toLowerCase() === 'active' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                            {cell}
                          </span>
                        ) : cell.includes('-') && cell.length === 10 ? (
                          <span className="text-gray-600 font-mono text-xs">
                            {cell}
                          </span>
                        ) : (
                          <span className="text-gray-900 font-medium">{cell}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
    }
    return null;
  };
  
  // Function to detect and format financial summary
  const detectFinancialSummary = (text: string) => {
    if (text.includes('Financial Overview') || 
        text.includes('sales performance') || 
        text.includes('Total Sales:') ||
        text.includes('supply chain business performance') ||
        (text.includes('inventory value') && text.includes('revenue'))) {
      
      // Enhanced regex patterns to match the actual text format
      const revenueMatch = text.match(/(?:Revenue|Total Revenue)[:\s•]*\s*([\d\.]+)\s*ETH/i);
      const spendingMatch = text.match(/(?:Spending|Total Spending)[:\s•]*\s*([\d\.]+)\s*ETH/i);
      
      // Multiple patterns for inventory value
      const inventoryMatch = text.match(/(?:inventory value|Total Value)[:\s•]*\s*([\d\.]+)\s*ETH/i) ||
                           text.match(/Your inventory value is\s*([\d\.]+)\s*ETH/i);
      
      // Enhanced patterns for counts
      const productsMatch = text.match(/(?:Total Products|products)[:\s•]*\s*(\d+)/i);
      const transactionsMatch = text.match(/(?:Total Transactions|transactions)[:\s•]*\s*(\d+)/i);
      const relationshipsMatch = text.match(/(?:Total Active Relationships|relationships)[:\s•]*\s*(\d+)/i);
      
      // Also look for "Total Sales:" pattern specifically
      const totalSalesMatch = text.match(/Total Sales:\s*([\d\.]+)\s*ETH/i);
      
      // Additional patterns for detailed sections
      const netProfitMatch = text.match(/(?:Net Profit)[:\s•]*\s*(-?[\d\.]+)\s*ETH/i);
      
      const data = {
        totalRevenue: revenueMatch ? parseFloat(revenueMatch[1]) : (totalSalesMatch ? parseFloat(totalSalesMatch[1]) : undefined),
        totalSpending: spendingMatch ? parseFloat(spendingMatch[1]) : undefined,
        inventoryValue: inventoryMatch ? parseFloat(inventoryMatch[1]) : undefined,
        totalProducts: productsMatch ? parseInt(productsMatch[1]) : undefined,
        totalTransactions: transactionsMatch ? parseInt(transactionsMatch[1]) : undefined,
        relationshipCount: relationshipsMatch ? parseInt(relationshipsMatch[1]) : undefined,
        netProfit: netProfitMatch ? parseFloat(netProfitMatch[1]) : undefined,
      };
      
      // Debug logging to see what we're extracting
      console.log('Financial data extracted:', data);
      
      // Check if we have enough data to show cards
      if (data.totalRevenue !== undefined || data.inventoryValue !== undefined || 
          data.totalSpending !== undefined || data.netProfit !== undefined) {
        const remainingText = text.replace(/FINANCIAL OVERVIEW:[\s\S]*?(?=\n\n|$)/, '').trim();
        return (
          <div>
            <SummaryCards data={data} />
            {remainingText && (
              <div className="mt-4">
                <p className="text-gray-700 leading-relaxed">{remainingText}</p>
              </div>
            )}
          </div>
        );
      }
    }
    return null;
  };
  
  
  // Function to detect and format relationship data
  const detectRelationshipData = (text: string) => {
    // Check for both old format and new table format
    if (text.includes('active relationships') && (text.includes('Buying') || text.includes('Selling'))) {
      // Extract relationship information using regex
      const relationshipPattern = /• (Buying|Selling) ([^\\n]+) (?:from|to) ([^\\n]+) at ([\\d\\.]+) ETH/g;
      const relationships = [];
      let match;
      let id = 1;
      
      while ((match = relationshipPattern.exec(text)) !== null) {
        const isBuying = match[1] === 'Buying';
        const productName = match[2].trim();
        const partnerName = match[3].trim();
        const price = parseFloat(match[4]);
        
        relationships.push({
          id: id++,
          productName,
          currentPrice: price,
          status: 'accepted',
          ...(isBuying ? { supplierName: partnerName } : { buyerName: partnerName })
        });
      }
      
      if (relationships.length > 0) {
        const remainingText = text.replace(/Your active relationships:[\\s\\S]*?(?=\\n\\n|$)/, '').trim();
        return (
          <div>
            {remainingText && (
              <div className="mb-4">
                <p className="text-gray-700 leading-relaxed">{remainingText}</p>
              </div>
            )}
            <RelationshipCards relationships={relationships} />
          </div>
        );
      }
    }
    
    // Also check for relationship table with Role column
    if (text.includes('| Role |') && text.includes('| Partner Company |')) {
      const tableLines = text.split('\n').filter(line => line.includes('|') && line.trim().length > 0);
      if (tableLines.length >= 3) {
        const rows = tableLines.slice(2).map(row => 
          row.split('|').map(cell => cell.trim()).filter(cell => cell)
        );
        
        const relationships = rows.map((row, index) => ({
          id: index + 1,
          role: row[0],
          partnerName: row[1],
          productName: row[2],
          currentPrice: parseFloat(row[3]),
          status: row[4]?.toLowerCase() || 'accepted'
        }));
        
        if (relationships.length > 0) {
          return (
            <div>
              <RelationshipCards relationships={relationships} />
            </div>
          );
        }
      }
    }
    
    return null;
  };
  
  
  // Function to detect and format metrics cards
  const detectMetricsCards = (text: string) => {
    const ethRegex = /💰\s([\d\.]+)\s+ETH/g;
    const percentRegex = /(📈|📉|➖)\s+([\d\.]+)%/g;
    const matches = [];
    
    let match;
    while ((match = ethRegex.exec(text)) !== null) {
      matches.push({ type: 'currency', value: match[1], unit: 'ETH' });
    }
    
    while ((match = percentRegex.exec(text)) !== null) {
      matches.push({ type: 'percentage', value: match[2], trend: match[1], unit: '%' });
    }
    
    if (matches.length > 0 && text.includes('inventory') || text.includes('revenue') || text.includes('value')) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-4">
          {matches.slice(0, 6).map((metric, i) => (
            <div key={i} className="bg-gradient-to-br from-white to-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {metric.value} {metric.unit}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {metric.type === 'currency' ? 'Value' : 'Change'}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-blue-100">
                  {metric.type === 'currency' ? (
                    <DollarSign className="w-5 h-5 text-blue-600" />
                  ) : metric.trend === '📈' ? (
                    <ArrowUpRight className="w-5 h-5 text-green-600" />
                  ) : (
                    <ArrowDownRight className="w-5 h-5 text-red-600" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };
  
  // Function to detect and format different types of data
  const formatResponse = (text: string) => {
    // Check for tables first
    const tableComponent = detectAndFormatTable(text);
    if (tableComponent) {
      const remainingText = text.replace(/\|[^\n]*\n/g, '').trim();
      return (
        <div>
          {remainingText && (
            <div className="mb-4">
              <p className="text-gray-700 leading-relaxed">{remainingText}</p>
            </div>
          )}
          {tableComponent}
        </div>
      );
    }
    
    // Check for financial summary
    const financialComponent = detectFinancialSummary(text);
    if (financialComponent) {
      return financialComponent;
    }
    
    
    // Check for relationship data
    const relationshipComponent = detectRelationshipData(text);
    if (relationshipComponent) {
      return relationshipComponent;
    }
    
    
    // Check for metrics cards
    const metricsComponent = detectMetricsCards(text);
    if (metricsComponent) {
      return (
        <div>
          <div className="mb-4">
            <p className="text-gray-700 leading-relaxed">
              {text.replace(/💰\s[\d\.]+\s+ETH/g, '').replace(/(📈|📉|➖)\s+[\d\.]+%/g, '').trim()}
            </p>
          </div>
          {metricsComponent}
        </div>
      );
    }
    
    const sections = text.split('\n\n');
    
    return sections.map((section, index) => {
      // Check for different section types
      if (section.includes('FINANCIAL OVERVIEW:') || section.includes('ANALYTICS SUMMARY:')) {
        return (
          <div key={index} className="mb-6">
            <div className="flex items-center space-x-2 mb-3">
              <div className="p-2 rounded-lg bg-green-100">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Financial Overview</h3>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200 shadow-sm">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                {section.replace('FINANCIAL OVERVIEW:', '').trim()}
              </pre>
            </div>
          </div>
        );
      }
      
      if (section.includes('PRODUCT PORTFOLIO:') || section.includes('INVENTORY:')) {
        return (
          <div key={index} className="mb-6">
            <div className="flex items-center space-x-2 mb-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Product Portfolio</h3>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200 shadow-sm">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                {section.replace('PRODUCT PORTFOLIO:', '').trim()}
              </pre>
            </div>
          </div>
        );
      }
      
      if (section.includes('MARKET ANALYSIS:') || section.includes('MARKET DATA:')) {
        return (
          <div key={index} className="mb-6">
            <div className="flex items-center space-x-2 mb-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Market Analysis</h3>
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-4 rounded-xl border border-purple-200 shadow-sm">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                {section.replace('MARKET ANALYSIS:', '').replace('MARKET DATA:', '').trim()}
              </pre>
            </div>
          </div>
        );
      }
      
      if (section.includes('BUSINESS RELATIONSHIPS:') || section.includes('RELATIONSHIPS:')) {
        return (
          <div key={index} className="mb-6">
            <div className="flex items-center space-x-2 mb-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <Users className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Business Relationships</h3>
            </div>
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-xl border border-orange-200 shadow-sm">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                {section.replace('BUSINESS RELATIONSHIPS:', '').replace('RELATIONSHIPS:', '').trim()}
              </pre>
            </div>
          </div>
        );
      }
      
      if (section.includes('INSIGHTS:') || section.includes('RECOMMENDATIONS:')) {
        return (
          <div key={index} className="mb-6">
            <div className="flex items-center space-x-2 mb-3">
              <div className="p-2 rounded-lg bg-indigo-100">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Business Insights</h3>
            </div>
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-xl border border-indigo-200 shadow-sm">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                {section.replace('INSIGHTS:', '').replace('RECOMMENDATIONS:', '').replace('BUSINESS INSIGHTS:', '').trim()}
              </pre>
            </div>
          </div>
        );
      }
      
      // Check for currency values and highlight them
      const currencyRegex = /(\d+\.?\d*)\s*(ETH|eth)/g;
      const highlightedText = section.replace(currencyRegex, (match, amount, currency) => {
        return `💰 ${amount} ${currency.toUpperCase()}`;
      });
      
      // Check for percentage values
      const percentageRegex = /(\d+\.?\d*)%/g;
      const finalText = highlightedText.replace(percentageRegex, (match, percent) => {
        const value = parseFloat(percent);
        const icon = value > 0 ? '📈' : value < 0 ? '📉' : '➖';
        return `${icon} ${percent}%`;
      });
      
      // Default formatting for other content
      return (
        <div key={index} className="mb-4">
          <div className="prose prose-sm max-w-none">
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-200">
              {finalText}
            </div>
          </div>
        </div>
      );
    });
  };
  
  return (
    <div className="space-y-2">
      {formatResponse(content)}
    </div>
  );
};

export default FormattedResponse;