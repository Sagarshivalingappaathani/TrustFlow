'use client';

import React, { useState, useEffect } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import Navigation from '@/components/Navigation';
import StatCard from '@/components/ui/StatCard';
import CompanyRegistrationModal from '@/components/modals/CompanyRegistrationModal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Calendar from '@/components/Calendar';
import { 
  Building2, 
  Package, 
  Users, 
  ShoppingCart, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
  ArrowUpRight,
  Calendar as CalendarIcon,
  DollarSign,
  BarChart3,
  Zap
} from 'lucide-react';
import { ContractStats } from '@/lib/contract';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';

export default function Dashboard() {
  const { isConnected, isRegistered, company, contract, account } = useWeb3();
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [stats, setStats] = useState<ContractStats | null>(null);
  const [companyStats, setCompanyStats] = useState({
    totalProducts: 0,
    totalRelationships: 0,
    marketListings: 0,
    totalTransactions: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);

  useEffect(() => {
    if (isConnected && !isRegistered) {
      setShowRegistrationModal(true);
    }
  }, [isConnected, isRegistered]);

  const loadCalendarEvents = async () => {
    if (!contract || !account) return;

    try {
      const events: any[] = [];

      // Get user's products for creation dates
      const productIds = await contract.getProductsByOwner(account);
      
      const productEvents = await Promise.all(
        productIds.map(async (id: any) => {
          try {
            const product = await contract.getProduct(Number(id));
            return {
              id: `product_${product.id}`,
              title: product.name,
              date: new Date(Number(product.createdTime) * 1000),
              type: 'product',
              data: {
                id: Number(product.id),
                name: product.name,
                description: product.description,
                quantity: Number(product.quantity),
                pricePerUnit: Number(product.pricePerUnit)
              }
            };
          } catch (error) {
            console.error(`Error fetching product ${id}:`, error);
            return null;
          }
        })
      );

      events.push(...productEvents.filter(event => event !== null));

      // Get user's relationships for start/end dates
      const activeRelationships = await contract.getActiveRelationships(account);
      const pendingRelationships = await contract.getPendingRelationships(account);
      const allRelationships = [...activeRelationships, ...pendingRelationships];

      const relationshipEvents = await Promise.all(
        allRelationships.map(async (id: any) => {
          try {
            const relationship = await contract.getRelationship(Number(id));
            const startEvent = {
              id: `relationship_start_${relationship.id}`,
              title: `Relationship Start`,
              date: new Date(Number(relationship.startDate) * 1000),
              type: 'relationship_start',
              data: {
                id: Number(relationship.id),
                supplier: relationship.supplier,
                buyer: relationship.buyer,
                productId: Number(relationship.productId),
                status: relationship.status
              }
            };

            const endEvent = {
              id: `relationship_end_${relationship.id}`,
              title: `Relationship End`,
              date: new Date(Number(relationship.endDate) * 1000),
              type: 'relationship_end',
              data: {
                id: Number(relationship.id),
                supplier: relationship.supplier,
                buyer: relationship.buyer,
                productId: Number(relationship.productId),
                status: relationship.status
              }
            };

            return [startEvent, endEvent];
          } catch (error) {
            console.error(`Error fetching relationship ${id}:`, error);
            return [];
          }
        })
      );

      relationshipEvents.forEach(eventPair => {
        if (Array.isArray(eventPair)) {
          events.push(...eventPair);
        }
      });

      setCalendarEvents(events);
    } catch (error) {
      console.error('Error loading calendar events:', error);
    }
  };

  const loadCompanyStats = async () => {
    if (!contract || !account) return;

    try {
      console.log('Loading company stats for account:', account);
      
      // Get user's products
      const userProducts = await contract.getProductsByOwner(account);
      console.log('User products:', userProducts.length);
      
      // Get user's relationships - use correct functions from relationships page
      const activeRelationships = await contract.getActiveRelationships(account);
      const pendingRelationships = await contract.getPendingRelationships(account);
      const totalRelationships = activeRelationships.length + pendingRelationships.length;
      console.log('User relationships - active:', activeRelationships.length, 'pending:', pendingRelationships.length);
      
      // Get user's marketplace listings - use correct function from marketplace page
      const allListingIds = await contract.viewAllActiveListings();
      let userListings = 0;
      
      // Filter listings by owner
      for (const id of allListingIds) {
        try {
          const listing = await contract.getListing(Number(id));
          if (listing.seller.toLowerCase() === account.toLowerCase()) {
            userListings++;
          }
        } catch (error) {
          // Skip if listing doesn't exist
        }
      }
      console.log('User listings:', userListings);
      
      // Get user's transactions
      const userTransactionIds = await contract.getTransactionHistory(account);
      console.log('User transaction IDs:', userTransactionIds.length);
      
      const finalStats = {
        totalProducts: userProducts.length,
        totalRelationships: totalRelationships,
        marketListings: userListings,
        totalTransactions: userTransactionIds.length
      };
      
      console.log('Final company stats:', finalStats);
      setCompanyStats(finalStats);
      
    } catch (error) {
      console.error('Error loading company stats:', error);
    }
  };

  const loadDashboardData = async () => {
    if (!contract) return;

    try {
      setLoading(true);
      
      // Load company-specific stats
      await loadCompanyStats();

      // Get user's transaction history for recent activities
      if (account) {
        try {
          const userTransactions = await contract.getTransactionHistory(account);
          console.log('User transactions:', userTransactions);
          
          // Convert to regular array and get last 5 transactions
          const transactionArray = Array.from(userTransactions);
          const recentTxs = transactionArray.slice(-5).reverse();
          
          if (recentTxs.length > 0) {
            const activities = await Promise.all(
              recentTxs.map(async (txId: any) => {
                try {
                  const tx = await contract.getTransaction(Number(txId));
                  return {
                    id: Number(tx.id),
                    type: tx.transactionType,
                    timestamp: Number(tx.timestamp),
                    status: tx.status,
                    amount: Number(tx.totalPrice),
                    quantity: Number(tx.quantity)
                  };
                } catch (error) {
                  console.error(`Error fetching transaction ${txId}:`, error);
                  return null;
                }
              })
            );
            
            // Filter out failed transactions
            const validActivities = activities.filter(activity => activity !== null);
            setRecentActivities(validActivities);
          } else {
            setRecentActivities([]);
          }
        } catch (error) {
          console.error('Error fetching transaction history:', error);
          setRecentActivities([]);
        }
      }

      // Fetch calendar events
      await loadCalendarEvents();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [contract, account]);

  const handleRegistrationSuccess = () => {
    window.location.reload(); // Refresh to update registration status
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navigation />
        <div className="lg:pl-72 pt-16 lg:pt-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <div className="bg-gradient-to-r from-yellow-100 to-amber-100 p-6 rounded-2xl inline-block mb-6 shadow-lg">
                <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">
                Connect Your Wallet
              </h1>
              <p className="text-gray-600 text-lg max-w-md mx-auto">
                Please connect your wallet to access the TrustFlow dashboard and start managing your supply chain
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
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                  Dashboard
                </h1>
                <p className="text-gray-600 mt-2 text-lg">
                  {isRegistered && company 
                    ? `Welcome back, ${company.name}!` 
                    : 'Welcome to TrustFlow'
                  }
                </p>
              </div>
              <div className="hidden md:flex items-center space-x-4">
                <div className="bg-gradient-to-r from-blue-500 to-green-500 p-3 rounded-xl shadow-lg">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Registration Status */}
          {isRegistered ? (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 mb-8 shadow-sm">
              <div className="flex items-center space-x-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-green-800 font-semibold text-lg">Company Registered</p>
                  <p className="text-green-600">
                    {company?.name} is ready to use TrustFlow platform
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-6 mb-8 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-blue-800 font-semibold text-lg">Registration Required</p>
                    <p className="text-blue-600">
                      Register your company to start using TrustFlow platform
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRegistrationModal(true)}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Register Now
                </button>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 animate-pulse shadow-sm border border-gray-100">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-200 hover:scale-105">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">My Products</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{companyStats.totalProducts}</p>
                    <div className="flex items-center mt-2">
                      <Package className="w-4 h-4 text-blue-600 mr-1" />
                      <span className="text-sm text-blue-600 font-medium">Total inventory</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-xl shadow-lg">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-200 hover:scale-105">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">My Relationships</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{companyStats.totalRelationships}</p>
                    <div className="flex items-center mt-2">
                      <Users className="w-4 h-4 text-green-600 mr-1" />
                      <span className="text-sm text-green-600 font-medium">Business partners</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-xl shadow-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-200 hover:scale-105">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Market Listings</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{companyStats.marketListings}</p>
                    <div className="flex items-center mt-2">
                      <ShoppingCart className="w-4 h-4 text-purple-600 mr-1" />
                      <span className="text-sm text-purple-600 font-medium">Active listings</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-xl shadow-lg">
                    <ShoppingCart className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-200 hover:scale-105">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{companyStats.totalTransactions}</p>
                    <div className="flex items-center mt-2">
                      <DollarSign className="w-4 h-4 text-orange-600 mr-1" />
                      <span className="text-sm text-orange-600 font-medium">Completed deals</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 rounded-xl shadow-lg">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Activities and Calendar Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activities */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-to-r from-blue-500 to-green-500 p-2 rounded-lg">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Recent Activities</h2>
                </div>
                <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                  View All
                </button>
              </div>
              
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-3 animate-pulse">
                      <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentActivities.length > 0 ? (
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-4 p-4 rounded-xl hover:bg-gray-50 transition-all duration-200 border border-gray-100">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-green-100 rounded-full flex items-center justify-center">
                        <ShoppingCart className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {activity.type === 'spot' ? 'Spot Market Purchase' : 'Relationship Order'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(activity.timestamp * 1000).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {activity.quantity} units
                        </p>
                        <p className="text-sm text-gray-500">
                          {ethers.formatEther(activity.amount.toString())} ETH
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="bg-gradient-to-r from-gray-100 to-gray-200 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Activity className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="font-medium text-gray-900 mb-2">No recent activities</p>
                  <p className="text-sm">Your transactions will appear here</p>
                </div>
              )}
            </div>

            {/* Calendar */}
            <div className="lg:col-span-1">
              <Calendar 
                events={calendarEvents}
                onEventClick={(event) => {
                  console.log('Event clicked:', event);
                  // You can add more event handling logic here
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Registration Modal */}
      <CompanyRegistrationModal
        isOpen={showRegistrationModal}
        onClose={() => setShowRegistrationModal(false)}
        onSuccess={handleRegistrationSuccess}
      />
    </div>
  );
}