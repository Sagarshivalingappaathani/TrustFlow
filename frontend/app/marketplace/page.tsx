// @ts-nocheck
'use client';
import React, { useState, useEffect } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import Navigation from '@/components/Navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Package,
  Building,
  Eye,
  Edit,
  Trash2,
  Star,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  X,
  ShoppingBag,
  AlertTriangle,
  History,
  MapPin
} from 'lucide-react';
import { SpotListing, Product, Company } from '@/lib/contract';
import { formatAddress } from '@/lib/web3';
import { getIPFSUrl } from '@/lib/ipfs';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

const createListingSchema = z.object({
  productId: z.number().min(1, 'Product is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  pricePerUnit: z.number().min(0.01, 'Price must be greater than 0'),
});

const purchaseSchema = z.object({
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  notes: z.string().optional(),
});

type CreateListingFormData = z.infer<typeof createListingSchema>;
type PurchaseFormData = z.infer<typeof purchaseSchema>;

interface ListingWithDetails extends SpotListing {
  productName?: string;
  sellerName?: string;
  productOwner?: string;
}

interface MarketplaceStats {
  totalListings: number;
  totalSellers: number;
  totalVolume: number;
  activeProducts: number;
}

export default function Marketplace() {
  const { isConnected, isRegistered, contract, account } = useWeb3();
  const [allListings, setAllListings] = useState<ListingWithDetails[]>([]);
  const [myListings, setMyListings] = useState<ListingWithDetails[]>([]);
  const [filteredListings, setFilteredListings] = useState<ListingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<ListingWithDetails | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [userProducts, setUserProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'browse' | 'my-listings'>('browse');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'date-desc' | 'quantity-desc'>('date-desc');
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState<MarketplaceStats>({
    totalListings: 0,
    totalSellers: 0,
    totalVolume: 0,
    activeProducts: 0
  });
  
  // Dropdown state for custom product selection
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [selectedProductForListing, setSelectedProductForListing] = useState<number | null>(null);

  const {
    register: registerListing,
    handleSubmit: handleSubmitListing,
    formState: { errors: listingErrors },
    reset: resetListing,
    setValue: setListingValue
  } = useForm<CreateListingFormData>({
    resolver: zodResolver(createListingSchema)
  });

  const {
    register: registerPurchase,
    handleSubmit: handleSubmitPurchase,
    formState: { errors: purchaseErrors },
    reset: resetPurchase
  } = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema)
  });

  useEffect(() => {
    if (isConnected && isRegistered && contract && account) {
      fetchMarketplaceData();
      fetchUserProducts();
    }
  }, [isConnected, isRegistered, contract, account]);

  useEffect(() => {
    applyFilters();
  }, [allListings, searchTerm, priceRange, sortBy]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setProductDropdownOpen(false);
    };

    if (productDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [productDropdownOpen]);

  const fetchMarketplaceData = async () => {
    if (!contract || !account) return;

    try {
      setLoading(true);
      
      // Get all active listings
      const listingIds = await contract.viewAllActiveListings();
      console.log('Listing IDs:', listingIds);

      if (listingIds.length === 0) {
        setAllListings([]);
        setMyListings([]);
        setStats({
          totalListings: 0,
          totalSellers: 0,
          totalVolume: 0,
          activeProducts: 0
        });
        return;
      }

      // Fetch listing details
      const listingPromises = Array.from(listingIds).map(async (listingId: any) => {
        try {
          const listing = await contract.getSpotListing(Number(listingId));
          
          // Fetch additional details
          const [product, sellerCompany] = await Promise.all([
            contract.getProduct(Number(listing.productId)).catch(() => ({ name: 'Unknown Product', currentOwner: listing.seller })),
            contract.getCompany(listing.seller).catch(() => ({ name: 'Unknown Company' }))
          ]);

          return {
            id: Number(listing.id),
            productId: Number(listing.productId),
            seller: listing.seller,
            quantityAvailable: Number(listing.quantityAvailable),
            pricePerUnit: Number(listing.pricePerUnit),
            listedDate: Number(listing.listedDate),
            isActive: listing.isActive,
            productName: product.name,
            sellerName: sellerCompany.name,
            productOwner: product.currentOwner
          };
        } catch (error) {
          console.error(`Error fetching listing ${listingId}:`, error);
          return null;
        }
      });

      const listingResults = await Promise.all(listingPromises);
      const validListings = listingResults
        .filter(listing => listing !== null && listing.isActive)
        .sort((a, b) => b.listedDate - a.listedDate);

      setAllListings(validListings);
      
      // Filter user's listings
      const userListings = validListings.filter(
        listing => listing.seller.toLowerCase() === account.toLowerCase()
      );
      setMyListings(userListings);

      // Calculate stats
      const uniqueSellers = new Set(validListings.map(l => l.seller)).size;
      const uniqueProducts = new Set(validListings.map(l => l.productId)).size;
      const totalVolume = validListings.reduce((sum, l) => sum + (l.pricePerUnit * l.quantityAvailable), 0);

      setStats({
        totalListings: validListings.length,
        totalSellers: uniqueSellers,
        totalVolume,
        activeProducts: uniqueProducts
      });

    } catch (error) {
      console.error('Error fetching marketplace data:', error);
      toast.error('Failed to load marketplace data');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProducts = async () => {
    if (!contract || !account) return;

    try {
      const productIds = await contract.getProductsByOwner(account);
      const productPromises = Array.from(productIds).map(async (productId: any) => {
        try {
          return await contract.getProduct(Number(productId));
        } catch (error) {
          console.error(`Error fetching product ${productId}:`, error);
          return null;
        }
      });

      const products = await Promise.all(productPromises);
      const validProducts = products
        .filter(product => product !== null && product.exists && product.quantity > 0)
        .map(product => ({
          id: Number(product.id),
          name: product.name,
          parentHistory: product.parentHistory,
          quantity: Number(product.quantity),
          pricePerUnit: Number(product.pricePerUnit),
          currentOwner: product.currentOwner,
          exists: product.exists
        }));

      setUserProducts(validProducts);
    } catch (error) {
      console.error('Error fetching user products:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...allListings];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(listing =>
        listing.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.sellerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.id.toString().includes(searchTerm)
      );
    }

    // Apply price range filter
    if (priceRange.min) {
      const minPrice = ethers.parseEther(priceRange.min);
      filtered = filtered.filter(listing => listing.pricePerUnit >= Number(minPrice));
    }
    if (priceRange.max) {
      const maxPrice = ethers.parseEther(priceRange.max);
      filtered = filtered.filter(listing => listing.pricePerUnit <= Number(maxPrice));
    }

    // Apply sorting
    switch (sortBy) {
      case 'price-asc':
        filtered.sort((a, b) => a.pricePerUnit - b.pricePerUnit);
        break;
      case 'price-desc':
        filtered.sort((a, b) => b.pricePerUnit - a.pricePerUnit);
        break;
      case 'quantity-desc':
        filtered.sort((a, b) => b.quantityAvailable - a.quantityAvailable);
        break;
      case 'date-desc':
      default:
        filtered.sort((a, b) => b.listedDate - a.listedDate);
        break;
    }

    setFilteredListings(filtered);
  };

  const handleCreateListing = async (data: CreateListingFormData) => {
    if (!contract || !account) return;

    try {
      setSubmitting(true);
      
      // Convert price to wei
      const priceInWei = ethers.parseEther(data.pricePerUnit.toString());
      
      const tx = await contract.listProductForSale(
        data.productId,
        data.quantity,
        priceInWei
      );
      
      await tx.wait();
      toast.success('Product listed successfully!');
      
      setShowCreateModal(false);
      resetListing();
      setSelectedProductForListing(null);
      setProductDropdownOpen(false);
      await fetchMarketplaceData();
      
    } catch (error) {
      console.error('Error creating listing:', error);
      toast.error('Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePurchase = async (data: PurchaseFormData) => {
    if (!contract || !account || !selectedListing) return;

    try {
      setSubmitting(true);
      
      const tx = await contract.createMarketplaceOrder(
        selectedListing.id,
        data.quantity,
        data.notes || "Marketplace order"
      );
      
      await tx.wait();
      toast.success('Order placed successfully! The seller will need to approve your order.');
      
      setShowPurchaseModal(false);
      setSelectedListing(null);
      resetPurchase();
      await fetchMarketplaceData();
      
    } catch (error) {
      console.error('Error making purchase:', error);
      toast.error('Failed to complete purchase');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveListing = async (listingId: number) => {
    if (!contract || !account) return;

    try {
      setSubmitting(true);
      
      const tx = await contract.removeSpotListing(listingId);
      await tx.wait();
      
      toast.success('Listing removed successfully!');
      await fetchMarketplaceData();
      
    } catch (error) {
      console.error('Error removing listing:', error);
      toast.error('Failed to remove listing');
    } finally {
      setSubmitting(false);
    }
  };

  const openPurchaseModal = (listing: ListingWithDetails) => {
    setSelectedListing(listing);
    setShowPurchaseModal(true);
  };

  const openViewModal = async (listing: ListingWithDetails) => {
    if (!contract) return;
    
    try {
      const product = await contract.getProduct(listing.productId);
      setSelectedProduct({
        id: Number(product.id),
        name: product.name,
        description: product.description,
        imageHash: product.imageHash,
        parentHistory: product.parentHistory,
        quantity: Number(product.quantity),
        pricePerUnit: Number(product.pricePerUnit),
        currentOwner: product.currentOwner,
        createdTime: Number(product.createdTime),
        exists: product.exists
      });
      setSelectedListing(listing);
      setShowViewModal(true);
    } catch (error) {
      console.error('Error fetching product details:', error);
      toast.error('Failed to load product details');
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navigation />
        <div className="lg:pl-72 pt-16 lg:pt-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <div className="bg-gradient-to-r from-green-100 to-blue-100 p-6 rounded-2xl inline-block mb-6 shadow-lg">
                <ShoppingCart className="w-12 h-12 text-green-600 mx-auto" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">
                Connect Your Wallet
              </h1>
              <p className="text-gray-600 text-lg max-w-md mx-auto">
                Please connect your wallet to access the marketplace and start trading
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
                Please register your company to access the marketplace and start trading
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
                <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                  Marketplace
                </h1>
                <p className="text-gray-600 mt-2 text-lg">
                  Buy and sell products on the spot market
                </p>
              </div>
              <div className="hidden md:flex items-center space-x-4">
                <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200">
                  <ShoppingCart className="w-6 h-6 text-gray-600" />
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
                  onClick={() => setShowCreateModal(true)}
                  className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-blue-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  List Product
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
                onClick={() => setShowCreateModal(true)}
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2"
              >
                <Plus className="h-5 w-5" />
                List Product
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-200 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Listings</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalListings}</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                    <span className="text-sm text-green-600 font-medium">Active</span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-xl shadow-lg">
                  <Package className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-200 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Sellers</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalSellers}</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                    <span className="text-sm text-green-600 font-medium">Growing</span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-xl shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-200 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Volume</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {ethers.formatEther(stats.totalVolume.toString())} ETH
                  </p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                    <span className="text-sm text-green-600 font-medium">+24% this week</span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-xl shadow-lg">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-200 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Products</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activeProducts}</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                    <span className="text-sm text-green-600 font-medium">Diverse</span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-xl shadow-lg">
                  <ShoppingBag className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('browse')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'browse'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Browse Listings ({filteredListings.length})
              </button>
              <button
                onClick={() => setActiveTab('my-listings')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'my-listings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Listings ({myListings.length})
              </button>
            </nav>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search products, sellers, or listing ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Filters */}
              {showFilters && (
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Min Price (ETH)"
                      value={priceRange.min}
                      onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      step="0.01"
                    />
                    <span className="text-gray-500">-</span>
                    <input
                      type="number"
                      placeholder="Max Price (ETH)"
                      value={priceRange.max}
                      onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      step="0.01"
                    />
                  </div>
                  
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="date-desc">Newest First</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="quantity-desc">Quantity: High to Low</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Listings Grid */}
          {loading ? (
            <div className="text-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(activeTab === 'browse' ? filteredListings : myListings).map((listing) => (
                <div key={listing.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-200 hover:scale-105">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{listing.productName}</h3>
                      </div>
                      <span className="px-3 py-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 text-sm font-medium rounded-full">
                        Active
                      </span>
                    </div>
                    
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Price per Unit</span>
                        <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                          {ethers.formatEther(listing.pricePerUnit.toString())} ETH
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Available</span>
                        <span className="text-lg font-bold text-gray-900">
                          {listing.quantityAvailable} units
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Seller</span>
                        <span className="text-sm font-medium text-gray-900">
                          {listing.sellerName || formatAddress(listing.seller)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Listed</span>
                        <span className="text-sm text-gray-500">
                          {new Date(listing.listedDate * 1000).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openViewModal(listing)}
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-600 px-4 py-3 rounded-xl hover:from-blue-100 hover:to-blue-200 transition-all duration-200 font-medium"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                      
                      {activeTab === 'browse' && listing.seller.toLowerCase() !== account?.toLowerCase() ? (
                        <button
                          onClick={() => openPurchaseModal(listing)}
                          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-blue-600 text-white px-4 py-3 rounded-xl hover:from-green-700 hover:to-blue-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Buy Now
                        </button>
                      ) : activeTab === 'my-listings' ? (
                        <button
                          onClick={() => handleRemoveListing(listing.id)}
                          disabled={submitting}
                          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-3 rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 disabled:opacity-50 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </button>
                      ) : (
                        <div className="flex-1 text-center py-3 text-gray-500 text-sm font-medium bg-gray-50 rounded-xl">
                          Your listing
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && (activeTab === 'browse' ? filteredListings : myListings).length === 0 && (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {activeTab === 'browse' 
                  ? (searchTerm || priceRange.min || priceRange.max ? 'No matching listings' : 'No listings available')
                  : 'No listings yet'
                }
              </h3>
              <p className="text-gray-500">
                {activeTab === 'browse' 
                  ? (searchTerm || priceRange.min || priceRange.max ? 'Try adjusting your search or filter criteria.' : 'Be the first to list a product!')
                  : 'Start selling by creating your first listing.'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Listing Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-green-500 to-blue-500 p-2 rounded-xl">
                  <Plus className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">List Product for Sale</h2>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedProductForListing(null);
                  setProductDropdownOpen(false);
                  resetListing();
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-xl hover:bg-gray-100"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitListing(handleCreateListing)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product
                </label>
                <select
                  {...registerListing('productId', { valueAsNumber: true })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="">Select a product</option>
                  {userProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.quantity} available)
                    </option>
                  ))}
                </select>
                {listingErrors.productId && (
                  <p className="mt-1 text-sm text-red-600">{listingErrors.productId.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity to List
                </label>
                <input
                  type="number"
                  {...registerListing('quantity', { valueAsNumber: true })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  min="1"
                />
                {listingErrors.quantity && (
                  <p className="mt-1 text-sm text-red-600">{listingErrors.quantity.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price per Unit (ETH)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...registerListing('pricePerUnit', { valueAsNumber: true })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  placeholder="0.00"
                />
                {listingErrors.pricePerUnit && (
                  <p className="mt-1 text-sm text-red-600">{listingErrors.pricePerUnit.message}</p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedProductForListing(null);
                    setProductDropdownOpen(false);
                    resetListing();
                  }}
                  className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl hover:from-green-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  {submitting ? 'Creating...' : 'Create Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase Modal */}
      {showPurchaseModal && selectedListing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-green-500 to-blue-500 p-2 rounded-xl">
                  <ShoppingCart className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Purchase Product</h2>
              </div>
              <button
                onClick={() => setShowPurchaseModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-xl hover:bg-gray-100"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl border border-green-100">
              <h3 className="font-semibold text-gray-900 mb-3">{selectedListing.productName}</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Seller:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {selectedListing.sellerName || formatAddress(selectedListing.seller)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Price per unit:</span>
                  <span className="text-sm font-bold text-green-600">
                    {ethers.formatEther(selectedListing.pricePerUnit.toString())} ETH
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Available:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {selectedListing.quantityAvailable} units
                  </span>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSubmitPurchase(handlePurchase)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity to Purchase
                </label>
                <input
                  type="number"
                  {...registerPurchase('quantity', { valueAsNumber: true })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  min="1"
                  max={selectedListing.quantityAvailable}
                />
                {purchaseErrors.quantity && (
                  <p className="mt-1 text-sm text-red-600">{purchaseErrors.quantity.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Notes (Optional)
                </label>
                <textarea
                  {...registerPurchase('notes')}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  rows={3}
                  placeholder="Add any specific requirements or notes for this order..."
                />
                {purchaseErrors.notes && (
                  <p className="mt-1 text-sm text-red-600">{purchaseErrors.notes.message}</p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPurchaseModal(false)}
                  className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl hover:from-green-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  {submitting ? 'Purchasing...' : 'Purchase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product View Modal */}
      {showViewModal && selectedProduct && selectedListing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="relative bg-gradient-to-r from-blue-600 to-green-600 p-3 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
                    <Package className="w-3 h-3 text-white" />
                  </div>
                  <div className="text-white">
                    <h2 className="text-sm font-bold">{selectedProduct.name}</h2>
                    <p className="text-blue-100 text-xs">ID: {selectedProduct.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-3">
              {/* Product Image and Basic Info */}
              <div className="flex gap-3 mb-3">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {selectedProduct.imageHash ? (
                    <img
                      src={getIPFSUrl(selectedProduct.imageHash)}
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`${selectedProduct.imageHash ? 'hidden' : ''} w-full h-full flex items-center justify-center`}>
                    <Package className="w-6 h-6 text-gray-400" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="bg-gray-50 p-2 rounded-lg mb-2">
                    <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">{selectedProduct.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <p className="font-medium text-gray-900">{new Date(selectedProduct.createdTime * 1000).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Owner:</span>
                      <p className="font-medium text-gray-900 font-mono">{formatAddress(selectedProduct.currentOwner)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Marketplace Info */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-3 rounded-lg border border-green-200 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <ShoppingCart className="w-3 h-3 text-green-600" />
                    <span className="text-xs font-semibold text-gray-900">Marketplace</span>
                  </div>
                  <span className="text-xs text-gray-500">{new Date(selectedListing.listedDate * 1000).toLocaleDateString()}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-gray-600">Price</span>
                    <p className="font-bold text-green-600">{ethers.formatEther(selectedListing.pricePerUnit.toString())} ETH</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Available</span>
                    <p className="font-bold text-gray-900">{selectedListing.quantityAvailable}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Seller</span>
                    <p className="font-bold text-gray-900">{selectedListing.sellerName || formatAddress(selectedListing.seller)}</p>
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-blue-50 p-2 rounded-lg text-center">
                  <p className="text-xs text-blue-600">Original Qty</p>
                  <p className="text-sm font-bold text-blue-900">{selectedProduct.quantity}</p>
                </div>
                <div className="bg-green-50 p-2 rounded-lg text-center">
                  <p className="text-xs text-green-600">Base Price</p>
                  <p className="text-sm font-bold text-green-900">{ethers.formatEther(selectedProduct.pricePerUnit.toString())}</p>
                </div>
                <div className="bg-purple-50 p-2 rounded-lg text-center">
                  <p className="text-xs text-purple-600">Total Value</p>
                  <p className="text-sm font-bold text-purple-900">{ethers.formatEther(BigInt(selectedListing.quantityAvailable) * BigInt(selectedListing.pricePerUnit))}</p>
                </div>
              </div>

              {/* Parent History */}
              <div className="bg-gray-50 p-2 rounded-lg">
                <div className="flex items-center gap-1 mb-2">
                  <History className="w-3 h-3 text-gray-600" />
                  <span className="text-xs font-semibold text-gray-900">Parent History</span>
                </div>
                {selectedProduct.parentHistory && selectedProduct.parentHistory.length > 0 ? (
                  <div className="space-y-1">
                    {selectedProduct.parentHistory.slice(0, 3).map((parentId: string, index: number) => (
                      <div key={index} className="flex items-center p-1.5 bg-white rounded border border-gray-200">
                        <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">{index + 1}</span>
                        </div>
                        <div className="ml-2 flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">{formatAddress(parentId)}</p>
                        </div>
                      </div>
                    ))}
                    {selectedProduct.parentHistory.length > 3 && (
                      <p className="text-xs text-gray-500 text-center">+{selectedProduct.parentHistory.length - 3} more</p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-gray-500 text-xs">Original product</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}