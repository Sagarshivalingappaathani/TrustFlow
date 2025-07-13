// @ts-nocheck
'use client';
import React, { useState, useEffect } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import Navigation from '@/components/Navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  ShoppingCart,
  Calendar,
  Download,
  Filter,
  Eye,
  Target,
  Award,
  ChevronDown,
  Activity,
  PieChart,
  LineChart,
  BarChart,
  Building
} from 'lucide-react';
import {
  LineChart as RechartsLineChart,
  BarChart as RechartsBarChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { Transaction, Product, Relationship, ContractStats } from '@/lib/contract';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

interface AnalyticsData {
  personalMetrics: {
    totalTransactions: number;
    totalVolume: number;
    totalProducts: number;
    activeRelationships: number;
    totalSpent: number;
    totalEarned: number;
    netProfit: number;
    averageTransactionValue: number;
  };
  timeBasedData: {
    dailyTransactions: { date: string; count: number; volume: number }[];
    weeklyTrends: { week: string; spent: number; earned: number }[];
    monthlyGrowth: { month: string; growth: number }[];
  };
  productAnalytics: {
    topProducts: { name: string; sales: number; revenue: number }[];
    inventoryTurnover: number;
    averagePrice: number;
  };
  relationshipAnalytics: {
    totalPartners: number;
    averageRelationshipDuration: number;
    repeatCustomerRate: number;
    mostProfitablePartner: string;
  };
  marketIntelligence: {
    marketShare: number;
    platformRanking: number;
    totalPlatformVolume: number;
    avgMarketPrice: number;
  };
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
    fill?: boolean;
  }[];
}

export default function Analytics() {
  const { isConnected, isRegistered, contract, account } = useWeb3();
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'relationships' | 'market'>('overview');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('line');
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [chartDropdownOpen, setChartDropdownOpen] = useState(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setDateDropdownOpen(false);
      setChartDropdownOpen(false);
    };

    if (dateDropdownOpen || chartDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [dateDropdownOpen, chartDropdownOpen]);

  useEffect(() => {
    if (isConnected && isRegistered && contract && account) {
      fetchAnalyticsData();
    }
  }, [isConnected, isRegistered, contract, account, dateRange]);

  const fetchAnalyticsData = async () => {
    if (!contract || !account) return;

    try {
      setLoading(true);

      // Fetch all required data
      const [
        transactionIds,
        productIds,
        relationshipIds,
        contractStats
      ] = await Promise.all([
        contract.getTransactionHistory(account),
        contract.getProductsByOwner(account),
        contract.getActiveRelationships(account),
        contract.getContractStats()
      ]);

      // Fetch detailed transaction data
      const transactionPromises = Array.from(transactionIds).map(async (txId: any) => {
        try {
          const tx = await contract.getTransaction(Number(txId));
          return {
            id: Number(tx.id),
            buyer: tx.buyer,
            seller: tx.seller,
            productId: Number(tx.productId),
            quantity: Number(tx.quantity),
            totalPrice: Number(tx.totalPrice),
            transactionType: tx.transactionType,
            timestamp: Number(tx.timestamp),
            status: tx.status
          };
        } catch (error) {
          return null;
        }
      });

      const transactions = (await Promise.all(transactionPromises))
        .filter(tx => tx !== null)
        .filter(tx => tx && isWithinDateRange(tx.timestamp, dateRange));

      // Fetch product data
      const productPromises = Array.from(productIds).map(async (productId: any) => {
        try {
          const product = await contract.getProduct(Number(productId));
          return {
            id: Number(product.id),
            name: product.name,
            quantity: Number(product.quantity),
            pricePerUnit: Number(product.pricePerUnit),
            currentOwner: product.currentOwner
          };
        } catch (error) {
          return null;
        }
      });

      const products = (await Promise.all(productPromises)).filter(p => p !== null);

      // Calculate analytics
      const analytics = calculateAnalytics(transactions, products, relationshipIds, contractStats);
      setAnalyticsData(analytics);

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const isWithinDateRange = (timestamp: number, range: string): boolean => {
    const now = Date.now() / 1000;
    const ranges = {
      '7d': 7 * 24 * 60 * 60,
      '30d': 30 * 24 * 60 * 60,
      '90d': 90 * 24 * 60 * 60,
      '1y': 365 * 24 * 60 * 60
    };
    return now - timestamp <= ranges[range as keyof typeof ranges];
  };

  const calculateAnalytics = (
    transactions: any[],
    products: any[],
    relationshipIds: any[],
    contractStats: any
  ): AnalyticsData => {
    // Personal metrics
    const purchases = transactions.filter(tx => tx.buyer.toLowerCase() === account?.toLowerCase());
    const sales = transactions.filter(tx => tx.seller.toLowerCase() === account?.toLowerCase());

    const totalSpent = purchases.reduce((sum, tx) => sum + tx.totalPrice, 0);
    const totalEarned = sales.reduce((sum, tx) => sum + tx.totalPrice, 0);
    const totalVolume = totalSpent + totalEarned;
    const netProfit = totalEarned - totalSpent;
    const averageTransactionValue = transactions.length > 0 ? totalVolume / transactions.length : 0;

    // Time-based data
    const dailyData = groupTransactionsByDay(transactions);
    const weeklyData = groupTransactionsByWeek(transactions);
    const monthlyData = calculateMonthlyGrowth(transactions);

    // Product analytics
    const productSales = calculateProductSales(sales, products);
    const topProducts = productSales.slice(0, 5);
    const averagePrice = products.length > 0
      ? products.reduce((sum, p) => sum + p.pricePerUnit, 0) / products.length
      : 0;

    // Relationship analytics
    const uniqueBuyers = new Set(sales.map(tx => tx.buyer)).size;
    const uniqueSellers = new Set(purchases.map(tx => tx.seller)).size;
    const totalPartners = uniqueBuyers + uniqueSellers;

    // Market intelligence
    const totalPlatformVolume = Number(contractStats.totalTransactions) * averageTransactionValue;
    const marketShare = totalPlatformVolume > 0 ? (totalVolume / totalPlatformVolume) * 100 : 0;

    return {
      personalMetrics: {
        totalTransactions: transactions.length,
        totalVolume,
        totalProducts: products.length,
        activeRelationships: Array.from(relationshipIds).length,
        totalSpent,
        totalEarned,
        netProfit,
        averageTransactionValue
      },
      timeBasedData: {
        dailyTransactions: dailyData,
        weeklyTrends: weeklyData,
        monthlyGrowth: monthlyData
      },
      productAnalytics: {
        topProducts,
        inventoryTurnover: calculateInventoryTurnover(sales, products),
        averagePrice
      },
      relationshipAnalytics: {
        totalPartners,
        averageRelationshipDuration: 0, // Would need relationship start/end dates
        repeatCustomerRate: calculateRepeatCustomerRate(sales),
        mostProfitablePartner: findMostProfitablePartner(sales)
      },
      marketIntelligence: {
        marketShare,
        platformRanking: 1, // Would need comparison with other users
        totalPlatformVolume,
        avgMarketPrice: averagePrice
      }
    };
  };

  const groupTransactionsByDay = (transactions: any[]) => {
    const grouped: { [key: string]: { count: number; volume: number } } = {};

    transactions.forEach(tx => {
      const date = new Date(tx.timestamp * 1000).toISOString().split('T')[0];
      if (!grouped[date]) {
        grouped[date] = { count: 0, volume: 0 };
      }
      grouped[date].count++;
      grouped[date].volume += tx.totalPrice;
    });

    return Object.entries(grouped)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const groupTransactionsByWeek = (transactions: any[]) => {
    const grouped: { [key: string]: { spent: number; earned: number } } = {};

    transactions.forEach(tx => {
      const date = new Date(tx.timestamp * 1000);
      const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!grouped[weekKey]) {
        grouped[weekKey] = { spent: 0, earned: 0 };
      }

      if (tx.buyer.toLowerCase() === account?.toLowerCase()) {
        grouped[weekKey].spent += tx.totalPrice;
      } else {
        grouped[weekKey].earned += tx.totalPrice;
      }
    });

    return Object.entries(grouped)
      .map(([week, data]) => ({ week, ...data }))
      .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime());
  };

  const calculateMonthlyGrowth = (transactions: any[]) => {
    const monthlyVolume: { [key: string]: number } = {};

    transactions.forEach(tx => {
      const date = new Date(tx.timestamp * 1000);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyVolume[monthKey] = (monthlyVolume[monthKey] || 0) + tx.totalPrice;
    });

    const sortedMonths = Object.keys(monthlyVolume).sort();
    return sortedMonths.map((month, index) => {
      const currentVolume = monthlyVolume[month];
      const previousVolume = index > 0 ? monthlyVolume[sortedMonths[index - 1]] : currentVolume;
      const growth = previousVolume > 0 ? ((currentVolume - previousVolume) / previousVolume) * 100 : 0;
      return { month, growth };
    });
  };

  const calculateProductSales = (sales: any[], products: any[]) => {
    const productSales: { [key: string]: { sales: number; revenue: number } } = {};

    sales.forEach(tx => {
      const product = products.find(p => p.id === tx.productId);
      const productName = product?.name || `Product #${tx.productId}`;

      if (!productSales[productName]) {
        productSales[productName] = { sales: 0, revenue: 0 };
      }

      productSales[productName].sales += tx.quantity;
      productSales[productName].revenue += tx.totalPrice;
    });

    return Object.entries(productSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  };

  const calculateInventoryTurnover = (sales: any[], products: any[]) => {
    const totalSold = sales.reduce((sum, tx) => sum + tx.quantity, 0);
    const totalInventory = products.reduce((sum, p) => sum + p.quantity, 0);
    return totalInventory > 0 ? totalSold / totalInventory : 0;
  };

  const calculateRepeatCustomerRate = (sales: any[]) => {
    const customerCounts: { [key: string]: number } = {};
    sales.forEach(tx => {
      customerCounts[tx.buyer] = (customerCounts[tx.buyer] || 0) + 1;
    });

    const totalCustomers = Object.keys(customerCounts).length;
    const repeatCustomers = Object.values(customerCounts).filter(count => count > 1).length;

    return totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;
  };

  const findMostProfitablePartner = (sales: any[]) => {
    const partnerRevenue: { [key: string]: number } = {};
    sales.forEach(tx => {
      partnerRevenue[tx.buyer] = (partnerRevenue[tx.buyer] || 0) + tx.totalPrice;
    });

    const topPartner = Object.entries(partnerRevenue)
      .sort(([, a], [, b]) => b - a)[0];

    return topPartner ? topPartner[0] : 'N/A';
  };

  const exportAnalytics = () => {
    if (!analyticsData) {
      toast.error('No data to export');
      return;
    }

    const csvData = [
      ['Metric', 'Value'],
      ['Total Transactions', analyticsData.personalMetrics.totalTransactions],
      ['Total Volume (ETH)', ethers.formatEther(analyticsData.personalMetrics.totalVolume.toString())],
      ['Total Spent (ETH)', ethers.formatEther(analyticsData.personalMetrics.totalSpent.toString())],
      ['Total Earned (ETH)', ethers.formatEther(analyticsData.personalMetrics.totalEarned.toString())],
      ['Net Profit (ETH)', ethers.formatEther(analyticsData.personalMetrics.netProfit.toString())],
      ['Total Products', analyticsData.personalMetrics.totalProducts],
      ['Active Relationships', analyticsData.personalMetrics.activeRelationships],
      ['Market Share (%)', analyticsData.marketIntelligence.marketShare.toFixed(2)],
      ['Repeat Customer Rate (%)', analyticsData.relationshipAnalytics.repeatCustomerRate.toFixed(2)]
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `analytics_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Analytics exported successfully!');
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="lg:pl-64 pt-16 lg:pt-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Connect Your Wallet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Please connect your wallet to view analytics.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="lg:pl-64 pt-16 lg:pt-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <Building className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Company Registration Required</h3>
              <p className="mt-1 text-sm text-gray-500">
                Please register your company to view analytics.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Navigation />
      <div className="lg:pl-64 pt-16 lg:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">Analytics Dashboard</h1>
                <p className="mt-3 text-lg text-slate-600 font-medium">
                  Comprehensive insights into your business performance
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
                    className="px-4 py-2.5 bg-white/70 backdrop-blur-sm border border-slate-200 rounded-full shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:bg-white/90 flex items-center justify-between min-w-[140px]"
                  >
                    <span>
                      {dateRange === '7d' && 'Last 7 days'}
                      {dateRange === '30d' && 'Last 30 days'}
                      {dateRange === '90d' && 'Last 90 days'}
                      {dateRange === '1y' && 'Last year'}
                    </span>
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </button>
                  {dateDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-lg z-50 min-w-[140px] overflow-hidden">
                      <div
                        onClick={() => { setDateRange('7d'); setDateDropdownOpen(false); }}
                        className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        Last 7 days
                      </div>
                      <div
                        onClick={() => { setDateRange('30d'); setDateDropdownOpen(false); }}
                        className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        Last 30 days
                      </div>
                      <div
                        onClick={() => { setDateRange('90d'); setDateDropdownOpen(false); }}
                        className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        Last 90 days
                      </div>
                      <div
                        onClick={() => { setDateRange('1y'); setDateDropdownOpen(false); }}
                        className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        Last year
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={exportAnalytics}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-8">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-2 shadow-sm border border-white/20">
              <nav className="flex space-x-2">
                {[
                  { id: 'overview', name: 'Overview', icon: BarChart3 },
                  { id: 'products', name: 'Products', icon: Package },
                  { id: 'relationships', name: 'Relationships', icon: Users },
                  { id: 'market', name: 'Market Intelligence', icon: Target }
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 ${activeTab === tab.id
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transform scale-105'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                        }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.name}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <LoadingSpinner />
            </div>
          ) : !analyticsData ? (
            <div className="text-center py-12">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No data available</h3>
              <p className="text-gray-500">Start trading to see your analytics!</p>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-br from-white to-green-50 rounded-2xl shadow-lg border border-green-100 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Total Volume</p>
                          <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mt-2">
                            {ethers.formatEther(analyticsData.personalMetrics.totalVolume.toString())} ETH
                          </p>
                          <p className="text-sm text-slate-500 mt-2 font-medium">
                            {analyticsData.personalMetrics.totalTransactions} transactions
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-green-400 to-emerald-500 p-3 rounded-xl shadow-lg">
                          <DollarSign className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    </div>

                    <div className={`bg-gradient-to-br ${analyticsData.personalMetrics.netProfit >= 0 ? 'from-white to-emerald-50' : 'from-white to-red-50'} rounded-2xl shadow-lg border ${analyticsData.personalMetrics.netProfit >= 0 ? 'border-emerald-100' : 'border-red-100'} p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Net Profit</p>
                          <p className={`text-3xl font-bold bg-gradient-to-r ${analyticsData.personalMetrics.netProfit >= 0 ? 'from-emerald-600 to-green-600' : 'from-red-600 to-rose-600'
                            } bg-clip-text text-transparent mt-2`}>
                            {analyticsData.personalMetrics.netProfit >= 0 ? '+' : ''}
                            {ethers.formatEther(analyticsData.personalMetrics.netProfit.toString())} ETH
                          </p>
                          <p className="text-sm text-slate-500 mt-2 font-medium">
                            {analyticsData.personalMetrics.netProfit >= 0 ? 'Profit' : 'Loss'}
                          </p>
                        </div>
                        <div className={`bg-gradient-to-br ${analyticsData.personalMetrics.netProfit >= 0 ? 'from-emerald-400 to-green-500' : 'from-red-400 to-rose-500'} p-3 rounded-xl shadow-lg`}>
                          {analyticsData.personalMetrics.netProfit >= 0 ? (
                            <TrendingUp className="h-8 w-8 text-white" />
                          ) : (
                            <TrendingDown className="h-8 w-8 text-white" />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-lg border border-blue-100 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Products Owned</p>
                          <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mt-2">
                            {analyticsData.personalMetrics.totalProducts}
                          </p>
                          <p className="text-sm text-slate-500 mt-2 font-medium">
                            Active inventory
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-400 to-indigo-500 p-3 rounded-xl shadow-lg">
                          <Package className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl shadow-lg border border-purple-100 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Market Share</p>
                          <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent mt-2">
                            {analyticsData.marketIntelligence.marketShare.toFixed(2)}%
                          </p>
                          <p className="text-sm text-slate-500 mt-2 font-medium">
                            Platform volume
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-400 to-violet-500 p-3 rounded-xl shadow-lg">
                          <Award className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Revenue vs Spending Chart */}
                  <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Revenue vs Spending Trends</h3>
                        <p className="text-slate-500 mt-1 font-medium">Track your financial performance over time</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setChartDropdownOpen(!chartDropdownOpen)}
                            className="px-4 py-2 bg-white/70 backdrop-blur-sm border border-slate-200 rounded-full text-sm focus:ring-2 focus:ring-blue-500 shadow-sm hover:bg-white/90 transition-all duration-200 flex items-center justify-between min-w-[120px]"
                          >
                            <span>
                              {chartType === 'line' && 'Line Chart'}
                              {chartType === 'bar' && 'Bar Chart'}
                              {chartType === 'area' && 'Area Chart'}
                            </span>
                            <ChevronDown className="h-4 w-4 ml-2" />
                          </button>
                          {chartDropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-lg z-50 min-w-[120px] overflow-hidden">
                              <div
                                onClick={() => { setChartType('line'); setChartDropdownOpen(false); }}
                                className="px-4 py-2 hover:bg-slate-50 cursor-pointer transition-colors text-sm"
                              >
                                Line Chart
                              </div>
                              <div
                                onClick={() => { setChartType('bar'); setChartDropdownOpen(false); }}
                                className="px-4 py-2 hover:bg-slate-50 cursor-pointer transition-colors text-sm"
                              >
                                Bar Chart
                              </div>
                              <div
                                onClick={() => { setChartType('area'); setChartDropdownOpen(false); }}
                                className="px-4 py-2 hover:bg-slate-50 cursor-pointer transition-colors text-sm"
                              >
                                Area Chart
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {analyticsData.timeBasedData.weeklyTrends.length > 0 ? (
                      <div className="h-96 bg-gradient-to-br from-slate-50/50 to-white/30 rounded-2xl p-8 backdrop-blur-sm">
                        <ResponsiveContainer width="100%" height="100%">
                          {chartType === 'line' ? (
                            <RechartsLineChart
                              data={analyticsData.timeBasedData.weeklyTrends}
                              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                            >
                              <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                              <XAxis
                                dataKey="week"
                                tickFormatter={(value) => new Date(value).toLocaleDateString()}
                                stroke="#64748b"
                                fontSize={12}
                                fontWeight={500}
                                tick={{ dy: 10 }}
                                axisLine={{ stroke: '#e2e8f0' }}
                                tickLine={{ stroke: '#e2e8f0' }}
                                height={60}
                              />
                              <YAxis
                                tickFormatter={(value) => `${parseFloat(ethers.formatEther(value.toString())).toFixed(2)} ETH`}
                                stroke="#64748b"
                                fontSize={12}
                                fontWeight={500}
                                tick={{ dx: -5 }}
                                axisLine={{ stroke: '#e2e8f0' }}
                                tickLine={{ stroke: '#e2e8f0' }}
                                width={100}
                              />
                              <Tooltip
                                formatter={(value: any, name: string) => [
                                  `${parseFloat(ethers.formatEther(value.toString())).toFixed(4)} ETH`,
                                  name === 'spent' ? 'Spent' : 'Earned'
                                ]}
                                labelFormatter={(value) => `Week of ${new Date(value).toLocaleDateString()}`}
                                contentStyle={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                  border: 'none',
                                  borderRadius: '12px',
                                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                                  backdropFilter: 'blur(10px)'
                                }}
                              />
                              <Legend
                                wrapperStyle={{
                                  paddingTop: '20px',
                                  fontSize: '14px',
                                  fontWeight: '600'
                                }}
                              />
                              <Line
                                type="monotone"
                                dataKey="earned"
                                stroke="#10b981"
                                strokeWidth={4}
                                name="Revenue"
                                dot={{ fill: '#10b981', strokeWidth: 2, r: 6 }}
                                activeDot={{ r: 8, stroke: '#10b981', strokeWidth: 2, fill: '#ffffff' }}
                                filter="drop-shadow(0 4px 6px rgba(16, 185, 129, 0.3))"
                              />
                              <Line
                                type="monotone"
                                dataKey="spent"
                                stroke="#ef4444"
                                strokeWidth={4}
                                name="Spending"
                                dot={{ fill: '#ef4444', strokeWidth: 2, r: 6 }}
                                activeDot={{ r: 8, stroke: '#ef4444', strokeWidth: 2, fill: '#ffffff' }}
                                filter="drop-shadow(0 4px 6px rgba(239, 68, 68, 0.3))"
                              />
                            </RechartsLineChart>
                          ) : chartType === 'area' ? (
                            <AreaChart
                              data={analyticsData.timeBasedData.weeklyTrends}
                              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                            >
                              <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                                </linearGradient>
                                <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                              <XAxis
                                dataKey="week"
                                tickFormatter={(value) => new Date(value).toLocaleDateString()}
                                stroke="#64748b"
                                fontSize={12}
                                fontWeight={500}
                                tick={{ dy: 10 }}
                                axisLine={{ stroke: '#e2e8f0' }}
                                tickLine={{ stroke: '#e2e8f0' }}
                                height={60}
                              />
                              <YAxis
                                tickFormatter={(value) => `${parseFloat(ethers.formatEther(value.toString())).toFixed(2)} ETH`}
                                stroke="#64748b"
                                fontSize={12}
                                fontWeight={500}
                                tick={{ dx: -5 }}
                                axisLine={{ stroke: '#e2e8f0' }}
                                tickLine={{ stroke: '#e2e8f0' }}
                                width={100}
                              />
                              <Tooltip
                                formatter={(value: any, name: string) => [
                                  `${parseFloat(ethers.formatEther(value.toString())).toFixed(4)} ETH`,
                                  name === 'spent' ? 'Spent' : 'Earned'
                                ]}
                                labelFormatter={(value) => `Week of ${new Date(value).toLocaleDateString()}`}
                                contentStyle={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                  border: 'none',
                                  borderRadius: '12px',
                                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                                  backdropFilter: 'blur(10px)'
                                }}
                              />
                              <Legend
                                wrapperStyle={{
                                  paddingTop: '20px',
                                  fontSize: '14px',
                                  fontWeight: '600'
                                }}
                              />
                              <Area
                                type="monotone"
                                dataKey="earned"
                                stackId="1"
                                stroke="#10b981"
                                fill="url(#colorRevenue)"
                                strokeWidth={3}
                                name="Revenue"
                                filter="drop-shadow(0 4px 6px rgba(16, 185, 129, 0.2))"
                              />
                              <Area
                                type="monotone"
                                dataKey="spent"
                                stackId="2"
                                stroke="#ef4444"
                                fill="url(#colorSpending)"
                                strokeWidth={3}
                                name="Spending"
                                filter="drop-shadow(0 4px 6px rgba(239, 68, 68, 0.2))"
                              />
                            </AreaChart>
                          ) : (
                            <RechartsBarChart
                              data={analyticsData.timeBasedData.weeklyTrends}
                              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                            >
                              <defs>
                                <linearGradient id="barRevenue" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.9} />
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.6} />
                                </linearGradient>
                                <linearGradient id="barSpending" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9} />
                                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.6} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                              <XAxis
                                dataKey="week"
                                tickFormatter={(value) => new Date(value).toLocaleDateString()}
                                stroke="#64748b"
                                fontSize={12}
                                fontWeight={500}
                                tick={{ dy: 10 }}
                                axisLine={{ stroke: '#e2e8f0' }}
                                tickLine={{ stroke: '#e2e8f0' }}
                                height={60}
                              />
                              <YAxis
                                tickFormatter={(value) => `${parseFloat(ethers.formatEther(value.toString())).toFixed(2)} ETH`}
                                stroke="#64748b"
                                fontSize={12}
                                fontWeight={500}
                                tick={{ dx: -5 }}
                                axisLine={{ stroke: '#e2e8f0' }}
                                tickLine={{ stroke: '#e2e8f0' }}
                                width={100}
                              />
                              <Tooltip
                                formatter={(value: any, name: string) => [
                                  `${parseFloat(ethers.formatEther(value.toString())).toFixed(4)} ETH`,
                                  name === 'spent' ? 'Spent' : 'Earned'
                                ]}
                                labelFormatter={(value) => `Week of ${new Date(value).toLocaleDateString()}`}
                                contentStyle={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                  border: 'none',
                                  borderRadius: '12px',
                                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                                  backdropFilter: 'blur(10px)'
                                }}
                              />
                              <Legend
                                wrapperStyle={{
                                  paddingTop: '20px',
                                  fontSize: '14px',
                                  fontWeight: '600'
                                }}
                              />
                              <Bar
                                dataKey="earned"
                                fill="url(#barRevenue)"
                                name="Revenue"
                                radius={[4, 4, 0, 0]}
                                filter="drop-shadow(0 4px 6px rgba(16, 185, 129, 0.2))"
                              />
                              <Bar
                                dataKey="spent"
                                fill="url(#barSpending)"
                                name="Spending"
                                radius={[4, 4, 0, 0]}
                                filter="drop-shadow(0 4px 6px rgba(239, 68, 68, 0.2))"
                              />
                            </RechartsBarChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-96 flex items-center justify-center bg-gradient-to-br from-slate-50/50 to-white/30 rounded-2xl">
                        <div className="text-center py-16">
                          <BarChart className="h-20 w-20 text-slate-400 mx-auto mb-6" />
                          <p className="text-xl font-medium text-slate-500 mb-2">No data for selected period</p>
                          <p className="text-sm text-slate-400">Complete some transactions to see your trends</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Financial Breakdown */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
                      <h3 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-6">Financial Breakdown</h3>
                      <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                          <span className="font-semibold text-slate-700">Total Earned</span>
                          <span className="font-bold text-green-600 text-lg">
                            +{ethers.formatEther(analyticsData.personalMetrics.totalEarned.toString())} ETH
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-rose-50 rounded-xl border border-red-100">
                          <span className="font-semibold text-slate-700">Total Spent</span>
                          <span className="font-bold text-red-600 text-lg">
                            -{ethers.formatEther(analyticsData.personalMetrics.totalSpent.toString())} ETH
                          </span>
                        </div>
                        <div className={`border-t-2 pt-4 p-4 rounded-xl ${analyticsData.personalMetrics.netProfit >= 0 ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-t-emerald-200' : 'bg-gradient-to-r from-red-50 to-rose-50 border-t-red-200'}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 text-lg">Net Result</span>
                            <span className={`font-bold text-xl ${analyticsData.personalMetrics.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                              }`}>
                              {analyticsData.personalMetrics.netProfit >= 0 ? '+' : ''}
                              {ethers.formatEther(analyticsData.personalMetrics.netProfit.toString())} ETH
                            </span>
                          </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-600">Average Transaction</span>
                            <span className="font-semibold text-slate-800">{ethers.formatEther(analyticsData.personalMetrics.averageTransactionValue.toString())} ETH</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
                      <h3 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-6">Daily Activity</h3>
                      {analyticsData.timeBasedData.dailyTransactions.length > 0 ? (
                        <div className="space-y-4">
                          {analyticsData.timeBasedData.dailyTransactions.slice(-5).map((day, index) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200 hover:shadow-md transition-all duration-200">
                              <div>
                                <span className="font-semibold text-slate-700">
                                  {new Date(day.date).toLocaleDateString()}
                                </span>
                                <div className="text-sm text-slate-500 mt-1">{day.count} transactions</div>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-lg text-blue-600">
                                  {ethers.formatEther(day.volume.toString())} ETH
                                </span>
                                <div className="text-sm text-slate-500">Volume</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl">
                          <Activity className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                          <p className="text-lg font-medium text-slate-500">No activity in selected period</p>
                          <p className="text-sm text-slate-400 mt-2">Start trading to see your daily activity</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Products Tab */}
              {activeTab === 'products' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-xl border border-blue-100 p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Inventory Turnover</p>
                          <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mt-2">
                            {analyticsData.productAnalytics.inventoryTurnover.toFixed(2)}x
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-400 to-indigo-500 p-3 rounded-xl shadow-lg">
                          <Package className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-white to-green-50 rounded-2xl shadow-xl border border-green-100 p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Average Price</p>
                          <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mt-2">
                            {parseFloat(ethers.formatEther(analyticsData.productAnalytics.averagePrice.toString())).toFixed(2)} ETH
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-green-400 to-emerald-500 p-3 rounded-xl shadow-lg">
                          <DollarSign className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl shadow-xl border border-purple-100 p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Top Products</p>
                          <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent mt-2">
                            {analyticsData.productAnalytics.topProducts.length}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-400 to-violet-500 p-3 rounded-xl shadow-lg">
                          <Award className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 overflow-hidden hover:shadow-2xl transition-all duration-300">
                      <div className="px-8 py-6 bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
                        <h3 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Top Performing Products</h3>
                      </div>
                      <div className="p-8">
                        {analyticsData.productAnalytics.topProducts.length > 0 ? (
                          <div className="space-y-4">
                            {analyticsData.productAnalytics.topProducts.map((product, index) => (
                              <div key={index} className="flex items-center justify-between p-6 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                                <div className="flex items-center space-x-4">
                                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <span className="text-lg font-bold text-white">#{index + 1}</span>
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-800 text-lg">{product.name}</p>
                                    <p className="text-sm text-slate-500 font-medium">{product.sales} units sold</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-xl text-blue-600">
                                    {ethers.formatEther(product.revenue.toString())} ETH
                                  </p>
                                  <p className="text-sm text-slate-500 font-medium">Revenue</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl">
                            <Package className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                            <p className="text-lg font-medium text-slate-500">No product sales data available</p>
                            <p className="text-sm text-slate-400 mt-2">Start selling to see top performing products</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 overflow-hidden hover:shadow-2xl transition-all duration-300">
                      <div className="px-8 py-6 bg-gradient-to-r from-slate-50 to-purple-50 border-b border-slate-200">
                        <h3 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Product Revenue Distribution</h3>
                        <p className="text-slate-500 mt-1 font-medium">Visual breakdown of product performance</p>
                      </div>
                      <div className="p-8">
                        {analyticsData.productAnalytics.topProducts.length > 0 ? (
                          <div className="h-80 bg-gradient-to-br from-slate-50/30 to-purple-50/30 rounded-2xl p-6">
                            <ResponsiveContainer width="100%" height="100%">
                              <RechartsPieChart>
                                <defs>
                                  <filter id="pieShadow" x="-50%" y="-50%" width="200%" height="200%">
                                    <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.3" />
                                  </filter>
                                </defs>
                                <Tooltip
                                  formatter={(value: any) => [
                                    `${parseFloat(ethers.formatEther(value.toString())).toFixed(4)} ETH`,
                                    'Revenue'
                                  ]}
                                  contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    border: 'none',
                                    borderRadius: '12px',
                                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                                    backdropFilter: 'blur(10px)'
                                  }}
                                />
                                <Legend
                                  wrapperStyle={{
                                    paddingTop: '20px',
                                    fontSize: '14px',
                                    fontWeight: '600'
                                  }}
                                />
                                <Pie
                                  data={analyticsData.productAnalytics.topProducts}
                                  dataKey="revenue"
                                  nameKey="name"
                                  cx="50%"
                                  cy="45%"
                                  outerRadius={90}
                                  innerRadius={35}
                                  fill="#8884d8"
                                  paddingAngle={3}
                                  filter="url(#pieShadow)"
                                  label={(entry) => entry.name}
                                  labelLine={false}
                                >
                                  {analyticsData.productAnalytics.topProducts.map((entry, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={[
                                        'url(#gradient1)', 'url(#gradient2)', 'url(#gradient3)', 'url(#gradient4)', 'url(#gradient5)'
                                      ][index % 5]}
                                    />
                                  ))}
                                </Pie>
                                <defs>
                                  <linearGradient id="gradient1" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#3B82F6" />
                                    <stop offset="100%" stopColor="#1D4ED8" />
                                  </linearGradient>
                                  <linearGradient id="gradient2" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#10B981" />
                                    <stop offset="100%" stopColor="#047857" />
                                  </linearGradient>
                                  <linearGradient id="gradient3" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#F59E0B" />
                                    <stop offset="100%" stopColor="#D97706" />
                                  </linearGradient>
                                  <linearGradient id="gradient4" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#EF4444" />
                                    <stop offset="100%" stopColor="#DC2626" />
                                  </linearGradient>
                                  <linearGradient id="gradient5" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#8B5CF6" />
                                    <stop offset="100%" stopColor="#7C3AED" />
                                  </linearGradient>
                                </defs>
                              </RechartsPieChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="text-center py-16 bg-gradient-to-br from-slate-50 to-purple-50 rounded-xl">
                            <PieChart className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                            <p className="text-lg font-medium text-slate-500">No product data for chart</p>
                            <p className="text-sm text-slate-400 mt-2">Add products to see revenue distribution</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Relationships Tab */}
              {activeTab === 'relationships' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Partners</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {analyticsData.relationshipAnalytics.totalPartners}
                          </p>
                        </div>
                        <Users className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Active Relationships</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {analyticsData.personalMetrics.activeRelationships}
                          </p>
                        </div>
                        <Activity className="h-8 w-8 text-green-600" />
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Repeat Customer Rate</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {analyticsData.relationshipAnalytics.repeatCustomerRate.toFixed(1)}%
                          </p>
                        </div>
                        <Target className="h-8 w-8 text-purple-600" />
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Customer Loyalty</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {analyticsData.relationshipAnalytics.repeatCustomerRate > 50 ? 'High' :
                              analyticsData.relationshipAnalytics.repeatCustomerRate > 25 ? 'Medium' : 'Low'}
                          </p>
                        </div>
                        <Award className="h-8 w-8 text-orange-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Relationship Insights</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Partnership Performance</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Total Trading Partners</span>
                            <span className="text-sm font-medium">{analyticsData.relationshipAnalytics.totalPartners}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Active Relationships</span>
                            <span className="text-sm font-medium">{analyticsData.personalMetrics.activeRelationships}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Repeat Customers</span>
                            <span className="text-sm font-medium">{analyticsData.relationshipAnalytics.repeatCustomerRate.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Key Metrics</h4>
                        <div className="space-y-3">
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm font-medium text-blue-900">Customer Retention</p>
                            <p className="text-xs text-blue-700">
                              {analyticsData.relationshipAnalytics.repeatCustomerRate.toFixed(1)}% of customers make repeat purchases
                            </p>
                          </div>
                          <div className="p-3 bg-green-50 rounded-lg">
                            <p className="text-sm font-medium text-green-900">Network Growth</p>
                            <p className="text-xs text-green-700">
                              {analyticsData.relationshipAnalytics.totalPartners} unique trading partners
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Market Intelligence Tab */}
              {activeTab === 'market' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Market Share</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {analyticsData.marketIntelligence.marketShare.toFixed(2)}%
                          </p>
                        </div>
                        <Target className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Platform Ranking</p>
                          <p className="text-2xl font-bold text-gray-900">
                            #{analyticsData.marketIntelligence.platformRanking}
                          </p>
                        </div>
                        <Award className="h-8 w-8 text-gold-600" />
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Platform Volume</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {ethers.formatEther(analyticsData.marketIntelligence.totalPlatformVolume.toString())} ETH
                          </p>
                        </div>
                        <BarChart3 className="h-8 w-8 text-purple-600" />
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Avg Market Price</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {ethers.formatEther(analyticsData.marketIntelligence.avgMarketPrice.toString())} ETH
                          </p>
                        </div>
                        <DollarSign className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Position Analysis</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Competitive Position</h4>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <span className="text-sm font-medium text-blue-900">Your Market Share</span>
                            <span className="text-sm font-bold text-blue-900">
                              {analyticsData.marketIntelligence.marketShare.toFixed(2)}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-900">Platform Ranking</span>
                            <span className="text-sm font-bold text-gray-900">
                              #{analyticsData.marketIntelligence.platformRanking}
                            </span>
                          </div>
                          <div className="p-3 bg-green-50 rounded-lg">
                            <p className="text-sm font-medium text-green-900">Performance Status</p>
                            <p className="text-xs text-green-700 mt-1">
                              {analyticsData.marketIntelligence.marketShare > 5 ? 'Strong market presence' :
                                analyticsData.marketIntelligence.marketShare > 1 ? 'Growing market presence' :
                                  'Emerging market participant'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Market Insights</h4>
                        <div className="space-y-4">
                          <div className="p-3 bg-purple-50 rounded-lg">
                            <p className="text-sm font-medium text-purple-900">Total Platform Volume</p>
                            <p className="text-xs text-purple-700 mt-1">
                              {ethers.formatEther(analyticsData.marketIntelligence.totalPlatformVolume.toString())} ETH total traded
                            </p>
                          </div>
                          <div className="p-3 bg-orange-50 rounded-lg">
                            <p className="text-sm font-medium text-orange-900">Your Contribution</p>
                            <p className="text-xs text-orange-700 mt-1">
                              {ethers.formatEther(analyticsData.personalMetrics.totalVolume.toString())} ETH of platform volume
                            </p>
                          </div>
                          <div className="p-3 bg-indigo-50 rounded-lg">
                            <p className="text-sm font-medium text-indigo-900">Growth Opportunity</p>
                            <p className="text-xs text-indigo-700 mt-1">
                              {100 - analyticsData.marketIntelligence.marketShare > 95 ? 'Significant' : 'Moderate'} room for expansion
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}