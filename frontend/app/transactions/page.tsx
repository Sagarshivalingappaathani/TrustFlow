'use client';

import React, { useState, useEffect } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import Navigation from '@/components/Navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  History,
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Building,
  ArrowUpRight,
  ArrowDownLeft,
  X
} from 'lucide-react';
import { formatAddress } from '@/lib/web3';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

interface Transaction {
  id: number;
  buyer: string;
  seller: string;
  productId: number;
  quantity: number;
  totalPrice: number;
  transactionType: string;
  timestamp: number;
  status: string;
  productName?: string;
  buyerName?: string;
  sellerName?: string;
}

interface TransactionStats {
  totalTransactions: number;
  totalSpent: number;
  totalEarned: number;
  thisMonthTransactions: number;
}

export default function Transactions() {
  const { isConnected, isRegistered, contract, account } = useWeb3();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'spot' | 'relationship'>('all');
  const [filterRole, setFilterRole] = useState<'all' | 'buyer' | 'seller'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState<TransactionStats>({
    totalTransactions: 0,
    totalSpent: 0,
    totalEarned: 0,
    thisMonthTransactions: 0
  });
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    if (isConnected && isRegistered && contract && account) {
      fetchTransactions();
    }
  }, [isConnected, isRegistered, contract, account]);

  useEffect(() => {
    applyFilters();
  }, [transactions, searchTerm, filterType, filterRole]);

  const fetchTransactions = async () => {
    if (!contract || !account) return;

    try {
      setLoading(true);
      
      // Get user's transaction IDs
      const transactionIds = await contract.getTransactionHistory(account);
      
      if (transactionIds.length === 0) {
        setTransactions([]);
        setStats({
          totalTransactions: 0,
          totalSpent: 0,
          totalEarned: 0,
          thisMonthTransactions: 0
        });
        return;
      }

      // Fetch transaction details
      const transactionPromises = Array.from(transactionIds).map(async (txId: any) => {
        try {
          const tx = await contract.getTransaction(Number(txId));
          
          // Fetch additional details
          const [product, buyerCompany, sellerCompany] = await Promise.all([
            contract.getProduct(Number(tx.productId)).catch(() => ({ name: 'Unknown Product' })),
            contract.getCompany(tx.buyer).catch(() => ({ name: 'Unknown Company' })),
            contract.getCompany(tx.seller).catch(() => ({ name: 'Unknown Company' }))
          ]);

          return {
            id: Number(tx.id),
            buyer: tx.buyer,
            seller: tx.seller,
            productId: Number(tx.productId),
            productName: product.name,
            buyerName: buyerCompany.name,
            sellerName: sellerCompany.name,
            quantity: Number(tx.quantity),
            totalPrice: Number(tx.totalPrice),
            transactionType: tx.transactionType,
            timestamp: Number(tx.timestamp),
            status: tx.status
          };
        } catch (error) {
          console.error(`Error fetching transaction ${txId}:`, error);
          return null;
        }
      });

      const transactionResults = await Promise.all(transactionPromises);
      const validTransactions = transactionResults
        .filter((tx): tx is NonNullable<typeof tx> => tx !== null)
        .sort((a, b) => b.timestamp - a.timestamp);

      setTransactions(validTransactions);
      calculateStats(validTransactions);

    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (txs: Transaction[]) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    let totalSpent = 0;
    let totalEarned = 0;
    let thisMonthCount = 0;

    txs.forEach(tx => {
      const txDate = new Date(tx.timestamp * 1000);
      
      if (tx.buyer.toLowerCase() === account?.toLowerCase()) {
        totalSpent += tx.totalPrice;
      }
      if (tx.seller.toLowerCase() === account?.toLowerCase()) {
        totalEarned += tx.totalPrice;
      }
      
      if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
        thisMonthCount++;
      }
    });

    setStats({
      totalTransactions: txs.length,
      totalSpent,
      totalEarned,
      thisMonthTransactions: thisMonthCount
    });
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(tx =>
        tx.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.buyerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.sellerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.id.toString().includes(searchTerm) ||
        ethers.formatEther(tx.totalPrice.toString()).includes(searchTerm)
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(tx => tx.transactionType === filterType);
    }

    // Apply role filter
    if (filterRole !== 'all') {
      if (filterRole === 'buyer') {
        filtered = filtered.filter(tx => tx.buyer.toLowerCase() === account?.toLowerCase());
      } else if (filterRole === 'seller') {
        filtered = filtered.filter(tx => tx.seller.toLowerCase() === account?.toLowerCase());
      }
    }

    setFilteredTransactions(filtered);
  };

  const getTransactionIcon = (tx: Transaction) => {
    const isBuyer = tx.buyer.toLowerCase() === account?.toLowerCase();
    return isBuyer ? 
      <ArrowUpRight className="h-5 w-5 text-red-500" /> :
      <ArrowDownLeft className="h-5 w-5 text-green-500" />;
  };

  const getTransactionTypeLabel = (type: string) => {
    return type === 'spot' ? 'Spot Market' : 'Relationship Order';
  };

  const getRoleLabel = (tx: Transaction) => {
    return tx.buyer.toLowerCase() === account?.toLowerCase() ? 'Purchase' : 'Sale';
  };

  const exportToCSV = () => {
    if (filteredTransactions.length === 0) {
      toast.error('No transactions to export');
      return;
    }

    const csvData = filteredTransactions.map(tx => ({
      'Transaction ID': tx.id,
      'Date': new Date(tx.timestamp * 1000).toLocaleDateString(),
      'Time': new Date(tx.timestamp * 1000).toLocaleTimeString(),
      'Type': getTransactionTypeLabel(tx.transactionType),
      'Role': getRoleLabel(tx),
      'Product': tx.productName || 'Unknown Product',
      'Buyer': tx.buyerName || formatAddress(tx.buyer),
      'Seller': tx.sellerName || formatAddress(tx.seller),
      'Quantity': tx.quantity,
      'Total Price (ETH)': ethers.formatEther(tx.totalPrice.toString()),
      'Status': tx.status,
      'Buyer Address': tx.buyer,
      'Seller Address': tx.seller
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => 
        Object.values(row).map(value => 
          typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value
        ).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Transactions exported successfully!');
    } else {
      toast.error('Export not supported in this browser');
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navigation />
        <div className="lg:pl-72 pt-16 lg:pt-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <div className="bg-gradient-to-r from-purple-100 to-blue-100 p-6 rounded-2xl inline-block mb-6 shadow-lg">
                <History className="w-12 h-12 text-purple-600 mx-auto" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">
                Connect Your Wallet
              </h1>
              <p className="text-gray-600 text-lg max-w-md mx-auto">
                Please connect your wallet to view your transaction history and analytics
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navigation />
        <div className="lg:pl-72 pt-16 lg:pt-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <div className="bg-gradient-to-r from-yellow-100 to-orange-100 p-6 rounded-2xl inline-block mb-6 shadow-lg">
                <Building className="w-12 h-12 text-orange-600 mx-auto" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">
                Register Your Company
              </h1>
              <p className="text-gray-600 text-lg max-w-md mx-auto">
                Please register your company to view your transaction history and analytics
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navigation />
      <div className="lg:pl-72 pt-16 lg:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Transaction History
                </h1>
                <p className="text-gray-600 mt-2 text-lg">
                  Track your purchases and sales across all platforms
                </p>
              </div>
              <div className="hidden md:flex items-center space-x-4">
                <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200">
                  <History className="w-6 h-6 text-gray-600" />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    showFilters 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105' 
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Filter className="h-5 w-5" />
                  Filters
                </button>
                <button
                  onClick={exportToCSV}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
                >
                  <Download className="h-5 w-5" />
                  Export CSV
                </button>
              </div>
            </div>
            <div className="md:hidden mt-4 space-y-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  showFilters 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                    : 'bg-white text-gray-700 border border-gray-200'
                }`}
              >
                <Filter className="h-5 w-5" />
                Filters
              </button>
              <button
                onClick={exportToCSV}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2"
              >
                <Download className="h-5 w-5" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-200 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalTransactions}</p>
                  <div className="flex items-center mt-2">
                    <ArrowUpRight className="w-4 h-4 text-blue-600 mr-1" />
                    <span className="text-sm text-blue-600 font-medium">All time</span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-xl shadow-lg">
                  <History className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-200 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Spent</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">
                    {ethers.formatEther(stats.totalSpent.toString())} ETH
                  </p>
                  <div className="flex items-center mt-2">
                    <ArrowUpRight className="w-4 h-4 text-red-600 mr-1" />
                    <span className="text-sm text-red-600 font-medium">Outgoing</span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-red-500 to-red-600 p-4 rounded-xl shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-200 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Earned</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {ethers.formatEther(stats.totalEarned.toString())} ETH
                  </p>
                  <div className="flex items-center mt-2">
                    <ArrowDownLeft className="w-4 h-4 text-green-600 mr-1" />
                    <span className="text-sm text-green-600 font-medium">Incoming</span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-xl shadow-lg">
                  <TrendingDown className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-200 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">This Month</p>
                  <p className="text-3xl font-bold text-purple-600 mt-2">{stats.thisMonthTransactions}</p>
                  <div className="flex items-center mt-2">
                    <Calendar className="w-4 h-4 text-purple-600 mr-1" />
                    <span className="text-sm text-purple-600 font-medium">Recent activity</span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-xl shadow-lg">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search transactions by product, company, amount, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              {/* Quick Filters */}
              {showFilters && (
                <div className="flex flex-wrap gap-3">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="all">All Types</option>
                    <option value="spot">Spot Market</option>
                    <option value="relationship">Relationship Orders</option>
                  </select>
                  
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value as any)}
                    className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="all">All Roles</option>
                    <option value="buyer">Purchases</option>
                    <option value="seller">Sales</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Transactions List */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Recent Transactions ({filteredTransactions.length})
                </h2>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <LoadingSpinner />
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-8 text-center">
                <History className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {transactions.length === 0 ? 'No transactions yet' : 'No matching transactions'}
                </h3>
                <p className="text-gray-500">
                  {transactions.length === 0 
                    ? 'Your transaction history will appear here after you complete orders.'
                    : 'Try adjusting your search or filter criteria.'
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => (
                  <div 
                    key={transaction.id} 
                    className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedTransaction(transaction)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {getTransactionIcon(transaction)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900">
                              {getRoleLabel(transaction)} - {transaction.productName}
                            </p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              transaction.transactionType === 'spot' 
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {getTransactionTypeLabel(transaction.transactionType)}
                            </span>
                          </div>
                          
                          <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                            <span>
                              {transaction.buyer.toLowerCase() === account?.toLowerCase() 
                                ? `From: ${transaction.sellerName || formatAddress(transaction.seller)}`
                                : `To: ${transaction.buyerName || formatAddress(transaction.buyer)}`
                              }
                            </span>
                            <span>•</span>
                            <span>{transaction.quantity} units</span>
                            <span>•</span>
                            <span>{new Date(transaction.timestamp * 1000).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className={`text-sm font-medium ${
                            transaction.buyer.toLowerCase() === account?.toLowerCase() 
                              ? 'text-red-600' 
                              : 'text-green-600'
                          }`}>
                            {transaction.buyer.toLowerCase() === account?.toLowerCase() ? '-' : '+'}
                            {ethers.formatEther(transaction.totalPrice.toString())} ETH
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(transaction.timestamp * 1000).toLocaleTimeString()}
                          </p>
                        </div>
                        
                        <Eye className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transaction Details Modal */}
          {selectedTransaction && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-2 rounded-xl">
                      <Eye className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Transaction #{selectedTransaction.id}</h2>
                  </div>
                  <button
                    onClick={() => setSelectedTransaction(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-100">
                    <h3 className="font-semibold text-gray-900 mb-3">{selectedTransaction.productName}</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Type</span>
                        <p className="text-sm font-bold text-purple-600">
                          {getTransactionTypeLabel(selectedTransaction.transactionType)}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                          {selectedTransaction.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                      <div className="flex items-center space-x-2 mb-2">
                        <ArrowUpRight className="h-3 w-3 text-blue-600" />
                        <span className="text-xs font-medium text-gray-600">Buyer</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedTransaction.buyerName || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">
                        {formatAddress(selectedTransaction.buyer)}
                      </p>
                    </div>
                    
                    <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                      <div className="flex items-center space-x-2 mb-2">
                        <ArrowDownLeft className="h-3 w-3 text-green-600" />
                        <span className="text-xs font-medium text-gray-600">Seller</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedTransaction.sellerName || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">
                        {formatAddress(selectedTransaction.seller)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-gray-200">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quantity</span>
                      <p className="text-lg font-bold text-gray-900">{selectedTransaction.quantity}</p>
                      <span className="text-xs text-gray-500">units</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-gray-200">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Price</span>
                      <p className="text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                        {ethers.formatEther(selectedTransaction.totalPrice.toString())}
                      </p>
                      <span className="text-xs text-gray-500">ETH</span>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <Calendar className="h-3 w-3 text-gray-600" />
                      <span className="text-xs font-medium text-gray-600">Transaction Date</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(selectedTransaction.timestamp * 1000).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="mt-6">
                  <button
                    onClick={() => setSelectedTransaction(null)}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2.5 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-200 font-medium text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}