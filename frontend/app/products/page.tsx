//@ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import Navigation from '@/components/Navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Package,
  Plus,
  Search,
  Filter,
  Eye,
  Send,
  MoreVertical,
  X,
  History,
  MapPin,
  Upload,
  Image as ImageIcon,
  Check,
  Loader2,
  Factory,
  QrCode
} from 'lucide-react';
import { Product } from '@/lib/contract';
import { formatAddress } from '@/lib/web3';
import { getIPFSUrl, uploadToIPFS, isValidImageFile, isValidFileSize } from '@/lib/ipfs';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import ManufactureProduct from '@/components/ManufactureProduct';
import ProductTreeViewer from '@/components/ProductTreeViewer';
import ProductTrackingQR from '@/components/ProductTrackingQR';

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().min(1, 'Product description is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  pricePerUnit: z.number().min(0.01, 'Price must be greater than 0'),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function Products() {
  const { isConnected, isRegistered, contract, account } = useWeb3();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'date-desc' | 'quantity-desc'>('date-desc');
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedProductForQR, setSelectedProductForQR] = useState<Product | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema)
  });

  const loadProducts = async () => {
    if (!contract || !account) return;

    try {
      setLoading(true);
      const productIds = await contract.getProductsByOwner(account);
      
      const productsData = await Promise.all(
        productIds.map(async (id: any) => {
          const product = await contract.getProduct(Number(id));
          console.log('Raw product data:', product);
          console.log('Raw pricePerUnit:', product.pricePerUnit.toString());
          return {
            id: Number(product.id),
            name: product.name,
            description: product.description,
            imageHash: product.imageHash,
            quantity: Number(product.quantity),
            pricePerUnit: Number(ethers.formatEther(product.pricePerUnit.toString())),
            currentOwner: product.currentOwner,
            createdTime: Number(product.createdTime),
            exists: product.exists,
            isManufactured: product.isManufactured,
            originalCreator: product.originalCreator,
            ownershipHistory: product.ownershipHistory,
            components: product.components?.map((comp: any) => ({
              productId: Number(comp.productId),
              quantityUsed: Number(comp.quantityUsed),
              supplier: comp.supplier,
              timestamp: Number(comp.timestamp)
            })) || []
          };
        })
      );

      setProducts(productsData);
      setFilteredProducts(productsData);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...products];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.id.toString().includes(searchTerm)
      );
    }
    
    // Apply price range filter
    if (priceRange.min) {
      const minPrice = ethers.parseEther(priceRange.min);
      filtered = filtered.filter(product => product.pricePerUnit >= Number(minPrice));
    }
    if (priceRange.max) {
      const maxPrice = ethers.parseEther(priceRange.max);
      filtered = filtered.filter(product => product.pricePerUnit <= Number(maxPrice));
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'name-asc':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'price-asc':
        filtered.sort((a, b) => a.pricePerUnit - b.pricePerUnit);
        break;
      case 'price-desc':
        filtered.sort((a, b) => b.pricePerUnit - a.pricePerUnit);
        break;
      case 'date-desc':
        filtered.sort((a, b) => b.createdTime - a.createdTime);
        break;
      case 'quantity-desc':
        filtered.sort((a, b) => b.quantity - a.quantity);
        break;
    }
    
    setFilteredProducts(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [products, searchTerm, priceRange, sortBy]);

  useEffect(() => {
    if (isConnected && isRegistered) {
      loadProducts();
    }
  }, [isConnected, isRegistered, contract, account]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isValidImageFile(file)) {
      toast.error('Please upload a valid image file (JPEG, PNG, GIF, WebP)');
      return;
    }

    if (!isValidFileSize(file, 10)) {
      toast.error('File size too large. Maximum size is 10MB.');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!contract) return;

    setSubmitting(true);
    let imageHash = '';

    try {
      if (selectedFile) {
        setUploadProgress('Uploading image to IPFS...');
        imageHash = await uploadToIPFS(selectedFile);
        setUploadProgress('Image uploaded successfully!');
      }

      setUploadProgress('Creating product on blockchain...');
      const tx = await contract.createProduct(
        data.name,
        data.description,
        imageHash,
        data.quantity,
        ethers.parseEther(data.pricePerUnit.toString())
      );
      
      setUploadProgress('Waiting for transaction confirmation...');
      await tx.wait();
      
      setUploadProgress('Product created successfully!');
      
      setTimeout(() => {
        toast.success('Product created successfully!');
        reset();
        setSelectedFile(null);
        setImagePreview(null);
        setUploadProgress('');
        setShowCreateModal(false);
        loadProducts();
      }, 1000);
    } catch (error: any) {
      console.error('Error creating product:', error);
      toast.error(error.message || 'Failed to create product');
      setUploadProgress('');
    } finally {
      setSubmitting(false);
    }
  };

  const viewProductDetails = async (product: Product) => {
    setSelectedProduct(product);
    setShowDetailsModal(true);
  };

  const handleShowProductQR = (product: Product) => {
    setSelectedProductForQR(product);
    setShowQRModal(true);
  };


  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navigation />
        <div className="lg:pl-72 pt-16 lg:pt-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <div className="bg-gradient-to-r from-blue-100 to-green-100 p-6 rounded-2xl inline-block mb-6 shadow-lg">
                <Package className="w-12 h-12 text-blue-600 mx-auto" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">
                Connect Your Wallet
              </h1>
              <p className="text-gray-600 text-lg max-w-md mx-auto">
                Please connect your wallet to access product management and start building your inventory
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
                <Package className="w-12 h-12 text-orange-600 mx-auto" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">
                Register Your Company
              </h1>
              <p className="text-gray-600 text-lg max-w-md mx-auto">
                Please register your company to access product management and start building your inventory
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
                Products
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                Manage your product inventory and track your supply chain
              </p>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200">
                <Package className="w-6 h-6 text-gray-600" />
              </div>
              <ManufactureProduct onSuccess={loadProducts} />
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-blue-600 to-green-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-green-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Create Product</span>
              </button>
            </div>
          </div>
          <div className="md:hidden mt-4 space-y-4">
            <ManufactureProduct onSuccess={loadProducts} />
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-green-700 transition-all duration-200 font-semibold shadow-lg flex items-center justify-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Create Product</span>
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="space-y-4">
            {/* Top row - Search and Filter Toggle */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products by name, description, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 font-medium ${
                  showFilters 
                    ? 'bg-gradient-to-r from-green-500 to-blue-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105' 
                    : 'border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-5 h-5" />
                <span>Filter</span>
              </button>
            </div>

            {/* Filter controls */}
            {showFilters && (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1">Min Price (ETH)</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={priceRange.min}
                      onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1">Max Price (ETH)</label>
                    <input
                      type="number"
                      placeholder="∞"
                      value={priceRange.max}
                      onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="date-desc">Newest First</option>
                      <option value="name-asc">Name: A to Z</option>
                      <option value="name-desc">Name: Z to A</option>
                      <option value="price-asc">Price: Low to High</option>
                      <option value="price-desc">Price: High to Low</option>
                      <option value="quantity-desc">Quantity: High to Low</option>
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setPriceRange({ min: '', max: '' });
                      setSortBy('date-desc');
                    }}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            )}

            {/* Results summary */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                {filteredProducts.length === products.length 
                  ? `Showing all ${products.length} products`
                  : `Showing ${filteredProducts.length} of ${products.length} products`
                }
              </span>
              {(searchTerm || priceRange.min || priceRange.max) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setPriceRange({ min: '', max: '' });
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 animate-pulse shadow-sm border border-gray-100">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-200 hover:scale-105">
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-gradient-to-r from-blue-500 to-green-500 p-3 rounded-xl shadow-lg">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="bg-gray-50 px-2 py-1 rounded-full">
                      <span className="text-xs font-medium text-gray-600">
                        ID: {product.id}
                      </span>
                    </div>
                    <div className="bg-blue-50 px-3 py-1 rounded-full">
                      <span className="text-xs font-medium text-blue-600">
                        {new Date(product.createdTime * 1000).toLocaleDateString()}
                      </span>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600 transition-colors">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{product.name}</h3>
                <p className="text-gray-600 text-sm mb-4 overflow-hidden" style={{ 
                  display: '-webkit-box', 
                  WebkitLineClamp: 2, 
                  WebkitBoxOrient: 'vertical' 
                }}>{product.description}</p>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Quantity:</span>
                    <span className="text-lg font-bold text-gray-900">{product.quantity}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Price per unit:</span>
                    <span className="text-lg font-bold text-gray-900">{typeof product.pricePerUnit === 'number' ? product.pricePerUnit.toFixed(4) : ethers.formatEther(product.pricePerUnit)} ETH</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="text-sm font-medium text-gray-600">Total value:</span>
                    <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                      {typeof product.pricePerUnit === 'number' ? (product.quantity * product.pricePerUnit).toFixed(4) : ethers.formatEther(BigInt(product.quantity) * product.pricePerUnit)} ETH
                    </span>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => viewProductDetails(product)}
                    className="flex-1 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-600 px-3 py-3 rounded-xl hover:from-blue-100 hover:to-blue-200 transition-all duration-200 flex items-center justify-center space-x-1 font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View</span>
                  </button>
                  <button 
                    onClick={() => handleShowProductQR(product)}
                    className="flex-1 bg-gradient-to-r from-purple-50 to-purple-100 text-purple-600 px-3 py-3 rounded-xl hover:from-purple-100 hover:to-purple-200 transition-all duration-200 flex items-center justify-center space-x-1 font-medium"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Track</span>
                  </button>
                  <button className="flex-1 bg-gradient-to-r from-green-50 to-green-100 text-green-600 px-3 py-3 rounded-xl hover:from-green-100 hover:to-green-200 transition-all duration-200 flex items-center justify-center space-x-1 font-medium">
                    <Send className="w-4 h-4" />
                    <span>Transfer</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12">
            <div className="text-center">
              <div className="bg-gradient-to-r from-gray-100 to-gray-200 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-600 mb-6 text-lg">
                {searchTerm ? 'No products match your search criteria' : 'Create your first product to get started'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-gradient-to-r from-blue-600 to-green-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-green-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Create Product
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Product Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-green-600 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Create New Product</h2>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedFile(null);
                    setImagePreview(null);
                    setUploadProgress('');
                    reset();
                  }}
                  className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            {submitting && (
              <div className="bg-blue-50 border-t border-blue-200 p-4">
                <div className="flex items-center space-x-3">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">Creating Product...</p>
                    <p className="text-xs text-blue-700 mt-1">{uploadProgress}</p>
                    <div className="w-full bg-blue-200 rounded-full h-1.5 mt-2">
                      <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300 animate-pulse" style={{width: '60%'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className={`p-6 ${submitting ? 'opacity-75 pointer-events-none' : ''}`}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Side - Image Upload */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <ImageIcon className="w-5 h-5 mr-2 text-blue-600" />
                      Product Image
                    </h3>
                    
                    {imagePreview ? (
                      <div className="space-y-4">
                        <div className="relative inline-block w-full">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-full h-64 object-cover rounded-xl shadow-md"
                          />
                          <button
                            type="button"
                            onClick={removeImage}
                            disabled={submitting}
                            className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-600 text-center">{selectedFile?.name}</p>
                      </div>
                    ) : (
                      <div className="w-full h-64 bg-gray-100 rounded-xl flex items-center justify-center">
                        <div className="text-center">
                          <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500 mb-4">No image selected</p>
                          <label className={`bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer transition-colors ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            Choose Image
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              disabled={submitting}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side - Product Details */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Package className="w-5 h-5 mr-2 text-green-600" />
                      Product Details
                    </h3>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      {...register('name')}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter product name"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      {...register('description')}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                      placeholder="Enter product description"
                      rows={4}
                    />
                    {errors.description && (
                      <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        {...register('quantity', { valueAsNumber: true })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter quantity"
                      />
                      {errors.quantity && (
                        <p className="mt-1 text-sm text-red-600">{errors.quantity.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price per Unit (ETH) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        {...register('pricePerUnit', { valueAsNumber: true })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="0.00"
                      />
                      {errors.pricePerUnit && (
                        <p className="mt-1 text-sm text-red-600">{errors.pricePerUnit.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 mt-8">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedFile(null);
                    setImagePreview(null);
                    setUploadProgress('');
                    reset();
                  }}
                  className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-xl hover:from-blue-700 hover:to-green-700 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      <span>Create Product</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Details Modal */}
      {showDetailsModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="relative bg-gradient-to-r from-blue-600 to-green-600 p-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                    <Package className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-white">
                    <h2 className="text-lg font-bold">{selectedProduct.name}</h2>
                    <p className="text-blue-100 text-xs">Product ID: {selectedProduct.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4">
              {/* Product Image and Basic Info */}
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="sm:w-1/3">
                  <div className="relative h-40 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden group">
                    {selectedProduct.imageHash ? (
                      <img
                        src={getIPFSUrl(selectedProduct.imageHash)}
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`${selectedProduct.imageHash ? 'hidden' : ''} absolute inset-0 flex items-center justify-center`}>
                      <div className="bg-gradient-to-r from-blue-500 to-green-500 p-4 rounded-lg shadow-lg">
                        <Package className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sm:w-2/3 space-y-3">
                  {/* Description */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      Description
                    </h3>
                    <p className="text-sm text-gray-700 leading-relaxed">{selectedProduct.description}</p>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white border border-blue-100 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">Created</span>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-gray-900">
                            {new Date(selectedProduct.createdTime * 1000).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white border border-green-100 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">Owner</span>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-gray-900 font-mono">
                            {formatAddress(selectedProduct.currentOwner)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className={`p-4 rounded-lg border ${
                  selectedProduct.isManufactured 
                    ? 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200'
                    : 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={`text-xs font-semibold ${
                      selectedProduct.isManufactured ? 'text-purple-900' : 'text-blue-900'
                    }`}>Quantity</h4>
                    {selectedProduct.isManufactured ? (
                      <Factory className="w-4 h-4 text-purple-600" />
                    ) : (
                      <Package className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <p className={`text-xl font-bold ${
                    selectedProduct.isManufactured ? 'text-purple-900' : 'text-blue-900'
                  }`}>{selectedProduct.quantity}</p>
                  <p className={`text-xs mt-1 ${
                    selectedProduct.isManufactured ? 'text-purple-600' : 'text-blue-600'
                  }`}>units</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-semibold text-green-900">Price/Unit</h4>
                    <span className="text-green-600 font-bold text-xs">ETH</span>
                  </div>
                  <p className="text-xl font-bold text-green-900">
                    {typeof selectedProduct.pricePerUnit === 'number' ? selectedProduct.pricePerUnit.toFixed(4) : ethers.formatEther(selectedProduct.pricePerUnit)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">per unit</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-semibold text-purple-900">Total</h4>
                    <span className="text-purple-600 font-bold text-xs">ETH</span>
                  </div>
                  <p className="text-xl font-bold text-purple-900">
                    {typeof selectedProduct.pricePerUnit === 'number' ? (selectedProduct.quantity * selectedProduct.pricePerUnit).toFixed(4) : ethers.formatEther(BigInt(selectedProduct.quantity) * selectedProduct.pricePerUnit)}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">value</p>
                </div>
              </div>

              {/* Supply Chain Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  {selectedProduct.isManufactured ? (
                    <>
                      <Factory className="w-4 h-4 mr-2 text-purple-600" />
                      Manufacturing Components
                    </>
                  ) : (
                    <>
                      <History className="w-4 h-4 mr-2 text-gray-600" />
                      Ownership History
                    </>
                  )}
                </h3>
                
                {/* Simple Supply Chain Tree Access */}
                <div className="pt-2">
                  <ProductTreeViewer 
                    productId={selectedProduct.id} 
                    productName={selectedProduct.name}
                    trigger={
                      <div className="w-full p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-gradient-to-r hover:from-blue-100 hover:to-purple-100 transition-colors">
                        <div className="flex items-center justify-center gap-3">
                          <Factory className="w-5 h-5 text-blue-600" />
                          <span className="text-base font-medium text-blue-800">View Supply Chain Tree</span>
                          <History className="w-5 h-5 text-blue-600" />
                        </div>
                        <p className="text-sm text-center text-blue-600 mt-2">
                          {selectedProduct.isManufactured 
                            ? "See complete manufacturing hierarchy with ownership histories" 
                            : "View ownership history and traceability"
                          }
                        </p>
                      </div>
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Tracking QR Modal */}
      {showQRModal && selectedProductForQR && (
        <ProductTrackingQR
          isOpen={showQRModal}
          onClose={() => {
            setShowQRModal(false);
            setSelectedProductForQR(null);
          }}
          productId={selectedProductForQR.id}
          productName={selectedProductForQR.name}
        />
      )}
        </div>
      </div>
  );
}