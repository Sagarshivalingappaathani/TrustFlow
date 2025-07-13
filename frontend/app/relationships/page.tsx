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
  Users,
  Plus,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  MessageCircle,
  ShoppingCart,
  Calendar,
  DollarSign,
  Building,
  Eye,
  Send,
  ArrowUpDown,
  X,
  AlertTriangle,
  ChevronDown,
  Check,
  FileText,
  Download,
  BarChart3,
  Loader2
} from 'lucide-react';
import { Relationship, Product, Company, NegotiationStep } from '@/lib/contract';
import { formatAddress } from '@/lib/web3';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { uploadToIPFS } from '@/lib/ipfs';
import jsPDF from 'jspdf';

const relationshipSchema = z.object({
  supplierAddress: z.string().optional(),
  buyerAddress: z.string().optional(),
  productId: z.number().min(1, 'Product ID is required'),
  pricePerUnit: z.number().min(0.01, 'Price must be greater than 0'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
});

const negotiationSchema = z.object({
  pricePerUnit: z.number().min(0.01, 'Price must be greater than 0'),
  endDate: z.string().min(1, 'End date is required'),
});

const orderSchema = z.object({
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  notes: z.string().optional(),
});

type RelationshipFormData = z.infer<typeof relationshipSchema>;
type NegotiationFormData = z.infer<typeof negotiationSchema>;
type OrderFormData = z.infer<typeof orderSchema>;

export default function Relationships() {
  const { isConnected, isRegistered, contract, account } = useWeb3();
  const [activeRelationships, setActiveRelationships] = useState<Relationship[]>([]);
  const [pendingRelationships, setPendingRelationships] = useState<Relationship[]>([]);
  const [rejectedRelationships, setRejectedRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNegotiationModal, setShowNegotiationModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<Relationship | null>(null);
  const [negotiationHistory, setNegotiationHistory] = useState<NegotiationStep[]>([]);
  const [relationshipHistories, setRelationshipHistories] = useState<{[key: number]: NegotiationStep[]}>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'rejected'>('active');
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [relationshipMode, setRelationshipMode] = useState<'selling' | 'buying'>('selling');
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [selectedBuyer, setSelectedBuyer] = useState<string>('');
  const [supplierProducts, setSupplierProducts] = useState<Product[]>([]);
  const [buyerDropdownOpen, setBuyerDropdownOpen] = useState(false);
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [supplierProductDropdownOpen, setSupplierProductDropdownOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [selectedSupplierProduct, setSelectedSupplierProduct] = useState<number | null>(null);
  const [orderQuantity, setOrderQuantity] = useState<number>(0);
  
  // Company Analysis State
  const [companyAnalysis, setCompanyAnalysis] = useState<{[companyAddress: string]: string}>({});
  const [analysisPDFs, setAnalysisPDFs] = useState<{[companyAddress: string]: string}>({});
  const [loadingAnalysis, setLoadingAnalysis] = useState<{[companyAddress: string]: boolean}>({});
  const [viewedAnalysis, setViewedAnalysis] = useState<{[companyAddress: string]: boolean}>({});

  const {
    register: registerRelationship,
    handleSubmit: handleSubmitRelationship,
    formState: { errors: relationshipErrors },
    reset: resetRelationship,
    setValue: setRelationshipValue
  } = useForm<RelationshipFormData>({
    resolver: zodResolver(relationshipSchema)
  });

  const {
    register: registerNegotiation,
    handleSubmit: handleSubmitNegotiation,
    formState: { errors: negotiationErrors },
    reset: resetNegotiation
  } = useForm<NegotiationFormData>({
    resolver: zodResolver(negotiationSchema)
  });

  const {
    register: registerOrder,
    handleSubmit: handleSubmitOrder,
    formState: { errors: orderErrors },
    reset: resetOrder
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema)
  });

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setBuyerDropdownOpen(false);
      setSupplierDropdownOpen(false);
      setProductDropdownOpen(false);
      setSupplierProductDropdownOpen(false);
    };

    if (buyerDropdownOpen || supplierDropdownOpen || productDropdownOpen || supplierProductDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [buyerDropdownOpen, supplierDropdownOpen, productDropdownOpen, supplierProductDropdownOpen]);

  useEffect(() => {
    if (isConnected && isRegistered && contract && account) {
      fetchRelationships();
      fetchAvailableProducts();
      fetchAllCompanies();
    }
  }, [isConnected, isRegistered, contract, account]);

  // Update form values based on mode - only reset when mode changes
  useEffect(() => {
    if (relationshipMode === 'buying') {
      setRelationshipValue('supplierAddress', selectedSupplier || '');
      setRelationshipValue('buyerAddress', account || '');
    } else if (relationshipMode === 'selling') {
      setRelationshipValue('supplierAddress', account || '');
      setRelationshipValue('buyerAddress', selectedBuyer || '');
    }
  }, [selectedSupplier, selectedBuyer, account, relationshipMode, setRelationshipValue]);

  const fetchRelationships = async () => {
    if (!contract || !account) return;
    
    try {
      setLoading(true);
      
      // Fetch active relationships
      const activeIds = await contract.getActiveRelationships(account);
      const activeRels = await Promise.all(
        activeIds.map(async (id: bigint) => {
          const rel = await contract.getRelationship(Number(id));
          
          // Fetch company names and negotiation history
          const [supplierCompany, buyerCompany, product, negotiationHistory] = await Promise.all([
            contract.getCompany(rel.supplier).catch(() => ({ name: 'Unknown Company' })),
            contract.getCompany(rel.buyer).catch(() => ({ name: 'Unknown Company' })),
            contract.getProduct(Number(rel.productId)).catch(() => ({ name: 'Unknown Product' })),
            contract.getNegotiationHistory(Number(rel.id)).catch(() => [])
          ]);
          
          return {
            id: Number(rel.id),
            supplier: rel.supplier,
            buyer: rel.buyer,
            supplierName: supplierCompany.name,
            buyerName: buyerCompany.name,
            productId: Number(rel.productId),
            productName: product.name,
            startDate: Number(rel.startDate),
            endDate: Number(rel.endDate),
            status: rel.status,
            exists: rel.exists,
            negotiationHistory: negotiationHistory.map((step: any) => ({
              step: Number(step.step),
              pricePerUnit: Number(step.pricePerUnit),
              requestFrom: step.requestFrom,
              timestamp: Number(step.timestamp),
              endDate: Number(step.endDate)
            }))
          };
        })
      );
      
      // Fetch pending relationships
      const pendingIds = await contract.getPendingRelationships(account);
      const pendingRels = await Promise.all(
        pendingIds.map(async (id: bigint) => {
          const rel = await contract.getRelationship(Number(id));
          
          // Fetch company names and negotiation history
          const [supplierCompany, buyerCompany, product, negotiationHistory] = await Promise.all([
            contract.getCompany(rel.supplier).catch(() => ({ name: 'Unknown Company' })),
            contract.getCompany(rel.buyer).catch(() => ({ name: 'Unknown Company' })),
            contract.getProduct(Number(rel.productId)).catch(() => ({ name: 'Unknown Product' })),
            contract.getNegotiationHistory(Number(rel.id)).catch(() => [])
          ]);
          
          return {
            id: Number(rel.id),
            supplier: rel.supplier,
            buyer: rel.buyer,
            supplierName: supplierCompany.name,
            buyerName: buyerCompany.name,
            productId: Number(rel.productId),
            productName: product.name,
            startDate: Number(rel.startDate),
            endDate: Number(rel.endDate),
            status: rel.status,
            exists: rel.exists,
            negotiationHistory: negotiationHistory.map((step: any) => ({
              step: Number(step.step),
              pricePerUnit: Number(step.pricePerUnit),
              requestFrom: step.requestFrom,
              timestamp: Number(step.timestamp),
              endDate: Number(step.endDate)
            }))
          };
        })
      );

      // Skip rejected relationships for now to improve performance
      // TODO: Add a smart contract function to get rejected relationships by user
      const rejectedRels: any[] = [];
      
      setActiveRelationships(activeRels);
      setPendingRelationships(pendingRels);
      setRejectedRelationships(rejectedRels);
      
      // Don't fetch negotiation history on initial load - fetch it when needed
      // This significantly improves performance
      
    } catch (error) {
      console.error('Error fetching relationships:', error);
      toast.error('Failed to load relationships');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableProducts = async () => {
    if (!contract || !account) return;
    
    try {
      const productIds = await contract.getProductsByOwner(account);
      const products = await Promise.all(
        productIds.map(async (id: bigint) => {
          const product = await contract.getProduct(Number(id));
          return {
            id: Number(product.id),
            name: product.name,
            parentHistory: product.parentHistory,
            quantity: Number(product.quantity),
            pricePerUnit: Number(product.pricePerUnit),
            currentOwner: product.currentOwner,
            exists: product.exists
          };
        })
      );
      setAvailableProducts(products);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchAllCompanies = async () => {
    if (!contract) return;
    
    try {
      const companyAddresses = await contract.getAllCompanies();
      const companies = await Promise.all(
        companyAddresses.map(async (address: string) => {
          try {
            const company = await contract.getCompany(address);
            return {
              id: Number(company.id),
              name: company.name,
              companyAddress: company.companyAddress,
              exists: company.exists
            };
          } catch (error) {
            console.error(`Error fetching company ${address}:`, error);
            return null;
          }
        })
      );
      
      // Filter out null entries and exclude current user's company
      const validCompanies = companies.filter(company => 
        company && 
        company.exists && 
        company.companyAddress.toLowerCase() !== account?.toLowerCase()
      );
      
      setAllCompanies(validCompanies);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchProductsBySupplier = async (supplierAddress: string) => {
    if (!contract || !supplierAddress) return;
    
    try {
      const productIds = await contract.getProductsByOwner(supplierAddress);
      const products = await Promise.all(
        productIds.map(async (id: bigint) => {
          const product = await contract.getProduct(Number(id));
          return {
            id: Number(product.id),
            name: product.name,
            parentHistory: product.parentHistory,
            quantity: Number(product.quantity),
            pricePerUnit: Number(product.pricePerUnit),
            currentOwner: product.currentOwner,
            exists: product.exists
          };
        })
      );
      setSupplierProducts(products);
    } catch (error) {
      console.error('Error fetching supplier products:', error);
      setSupplierProducts([]);
    }
  };

  const handleCreateRelationship = async (data: RelationshipFormData) => {
    if (!contract) return;
    
    try {
      setSubmitting(true);
      
      // Override addresses based on mode
      const supplierAddr = relationshipMode === 'buying' ? selectedSupplier : account;
      const buyerAddr = relationshipMode === 'buying' ? account : selectedBuyer;
      
      // Validation based on mode
      if (relationshipMode === 'buying') {
        if (!selectedSupplier) {
          toast.error('Please select a supplier company');
          return;
        }
        if (!selectedSupplierProduct) {
          toast.error('Please select a product');
          return;
        }
        if (selectedSupplierProduct <= 0) {
          toast.error('Invalid product selected');
          return;
        }
      } else if (relationshipMode === 'selling') {
        if (!selectedBuyer) {
          toast.error('Please select a buyer company');
          return;
        }
        if (!selectedProduct) {
          toast.error('Please select your product');
          return;
        }
        if (selectedProduct <= 0) {
          toast.error('Invalid product selected');
          return;
        }
      }
      
      // Final validation before submission
      const finalProductId = relationshipMode === 'buying' ? selectedSupplierProduct : selectedProduct;
      if (!finalProductId || finalProductId <= 0) {
        toast.error('Please select a valid product');
        return;
      }
      
      const startTimestamp = Math.floor(new Date(data.startDate).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(data.endDate).getTime() / 1000);
      
      const tx = await contract.requestRelationship(
        supplierAddr,
        buyerAddr,
        finalProductId,
        ethers.parseEther(data.pricePerUnit.toString()), // Convert ETH to wei
        startTimestamp,
        endTimestamp
      );
      
      const message = relationshipMode === 'selling' 
        ? 'Relationship offer sent successfully!' 
        : 'Purchase request sent successfully!';
      toast.success(message);
      await tx.wait();
      
      resetRelationship();
      setSelectedSupplier('');
      setSelectedBuyer('');
      setSupplierProducts([]);
      setSelectedProduct(null);
      setSelectedSupplierProduct(null);
      setRelationshipValue('productId', 0);
      setBuyerDropdownOpen(false);
      setSupplierDropdownOpen(false);
      setProductDropdownOpen(false);
      setSupplierProductDropdownOpen(false);
      setShowCreateModal(false);
      fetchRelationships();
    } catch (error: any) {
      console.error('Error creating relationship:', error);
      const errorMessage = error.reason || error.message || 'Failed to create relationship';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNegotiate = async (data: NegotiationFormData) => {
    if (!contract || !selectedRelationship) return;
    
    try {
      setSubmitting(true);
      
      const endTimestamp = Math.floor(new Date(data.endDate).getTime() / 1000);
      
      const tx = await contract.negotiateRelationship(
        selectedRelationship.id,
        ethers.parseEther(data.pricePerUnit.toString()),
        endTimestamp
      );
      
      toast.success('Negotiation terms sent successfully!');
      await tx.wait();
      
      resetNegotiation();
      setShowNegotiationModal(false);
      fetchRelationships();
    } catch (error: any) {
      console.error('Error negotiating:', error);
      toast.error(error.message || 'Failed to negotiate');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptRelationship = async (relationshipId: number) => {
    if (!contract) return;
    
    try {
      const tx = await contract.acceptRelationship(relationshipId);
      toast.success('Relationship accepted!');
      await tx.wait();
      fetchRelationships();
    } catch (error: any) {
      console.error('Error accepting relationship:', error);
      toast.error(error.message || 'Failed to accept relationship');
    }
  };

  const handleRejectRelationship = async (relationshipId: number) => {
    if (!contract) return;
    
    try {
      const tx = await contract.rejectRelationship(relationshipId);
      toast.success('Relationship rejected');
      await tx.wait();
      fetchRelationships();
    } catch (error: any) {
      console.error('Error rejecting relationship:', error);
      toast.error(error.message || 'Failed to reject relationship');
    }
  };

  const handlePlaceOrder = async (data: OrderFormData) => {
    if (!contract || !selectedRelationship) return;
    
    try {
      setSubmitting(true);
      
      // Use new order system instead of instant completion
      const tx = await contract.placeOrder(
        selectedRelationship.id,
        data.quantity,
        data.notes || '' // Optional notes field
      );
      
      toast.success('Order request sent to seller for approval!');
      await tx.wait();
      
      resetOrder();
      setOrderQuantity(0);
      setShowOrderModal(false);
      fetchRelationships();
    } catch (error: any) {
      console.error('Error placing order:', error);
      const errorMessage = error.reason || error.message || 'Failed to place order';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const fetchNegotiationHistory = async (relationshipId: number) => {
    if (!contract) return;
    
    try {
      const history = await contract.getNegotiationHistory(relationshipId);
      const formattedHistory = history.map((step: any) => ({
        step: Number(step.step),
        pricePerUnit: Number(step.pricePerUnit),
        requestFrom: step.requestFrom,
        timestamp: Number(step.timestamp),
        endDate: Number(step.endDate)
      }));
      setNegotiationHistory(formattedHistory);
    } catch (error) {
      console.error('Error fetching negotiation history:', error);
    }
  };

  // Company Analysis Functions
  const analyzeCompany = async (companyAddress: string, companyName: string) => {
    // Check if already analyzed
    if (companyAnalysis[companyAddress] || loadingAnalysis[companyAddress]) {
      return;
    }

    try {
      setLoadingAnalysis(prev => ({ ...prev, [companyAddress]: true }));
      
      // Call your AI analysis API
      const response = await fetch('https://479e197b80f0.ngrok-free.app/analyze-company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          company_name: companyName
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const analysisText = await response.text();
      
      // Store analysis
      setCompanyAnalysis(prev => ({ 
        ...prev, 
        [companyAddress]: analysisText 
      }));

      // Generate and upload PDF
      await generateAndUploadPDF(companyAddress, companyName, analysisText);
      
      toast.success('Company analysis completed!');
      
    } catch (error: any) {
      console.error('Error analyzing company:', error);
      toast.error('Failed to analyze company. Please try again.');
    } finally {
      setLoadingAnalysis(prev => ({ ...prev, [companyAddress]: false }));
    }
  };

  const generateAndUploadPDF = async (companyAddress: string, companyName: string, analysisText: string) => {
    try {
      // Create PDF
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.width;
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      
      // Title
      pdf.setFontSize(20);
      pdf.setFont(undefined, 'bold');
      pdf.text(`Company Analysis: ${companyName}`, margin, 30);
      
      // Date
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'normal');
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, 45);
      
      // Content
      pdf.setFontSize(11);
      const splitText = pdf.splitTextToSize(analysisText, maxWidth);
      pdf.text(splitText, margin, 60);
      
      // Convert to blob
      const pdfBlob = pdf.output('blob');
      const pdfFile = new File([pdfBlob], `${companyName}_analysis.pdf`, { type: 'application/pdf' });
      
      // Upload to IPFS
      const ipfsHash = await uploadToIPFS(pdfFile);
      
      // Store IPFS hash
      setAnalysisPDFs(prev => ({ 
        ...prev, 
        [companyAddress]: ipfsHash 
      }));
      
    } catch (error) {
      console.error('Error generating/uploading PDF:', error);
      toast.error('Failed to generate analysis PDF');
    }
  };

  const viewAnalysisPDF = async (companyAddress: string) => {
    const ipfsHash = analysisPDFs[companyAddress];
    const analysisText = companyAnalysis[companyAddress];
    
    if (!ipfsHash && !analysisText) {
      toast.error('Analysis not found');
      return;
    }

    try {
      // Check if it's a mock hash (development mode)
      if (ipfsHash && ipfsHash.startsWith('QmMock')) {
        // For development, create PDF directly and open it
        const pdf = new jsPDF();
        const pageWidth = pdf.internal.pageSize.width;
        const margin = 20;
        const maxWidth = pageWidth - (margin * 2);
        
        // Get company name
        const partnerName = allCompanies.find(c => c.companyAddress === companyAddress)?.name || 'Unknown Company';
        
        // Title
        pdf.setFontSize(20);
        pdf.setFont(undefined, 'bold');
        pdf.text(`Company Analysis: ${partnerName}`, margin, 30);
        
        // Date
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'normal');
        pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, 45);
        
        // Content
        pdf.setFontSize(11);
        const splitText = pdf.splitTextToSize(analysisText, maxWidth);
        pdf.text(splitText, margin, 60);
        
        // Open PDF in new tab
        const pdfUrl = pdf.output('bloburl');
        window.open(pdfUrl, '_blank');
      } else if (ipfsHash) {
        // For production with real IPFS hash
        const ipfsUrl = `https://apricot-academic-canid-70.mypinata.cloud/ipfs/${ipfsHash}`;
        window.open(ipfsUrl, '_blank');
      } else {
        // Fallback: create PDF from analysis text
        const pdf = new jsPDF();
        const pageWidth = pdf.internal.pageSize.width;
        const margin = 20;
        const maxWidth = pageWidth - (margin * 2);
        
        const partnerName = allCompanies.find(c => c.companyAddress === companyAddress)?.name || 'Unknown Company';
        
        pdf.setFontSize(20);
        pdf.setFont(undefined, 'bold');
        pdf.text(`Company Analysis: ${partnerName}`, margin, 30);
        
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'normal');
        pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, 45);
        
        pdf.setFontSize(11);
        const splitText = pdf.splitTextToSize(analysisText, maxWidth);
        pdf.text(splitText, margin, 60);
        
        const pdfUrl = pdf.output('bloburl');
        window.open(pdfUrl, '_blank');
      }
      
      // Mark as viewed (one-time only)
      setViewedAnalysis(prev => ({ ...prev, [companyAddress]: true }));
      
      toast.success('Analysis viewed! This was a one-time access.');
      
    } catch (error) {
      console.error('Error viewing PDF:', error);
      toast.error('Failed to open analysis PDF');
    }
  };

  const filteredActiveRelationships = activeRelationships.filter((rel: any) =>
    rel.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rel.buyer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rel.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rel.buyerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rel.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rel.productId.toString().includes(searchTerm)
  );

  const filteredPendingRelationships = pendingRelationships.filter((rel: any) =>
    rel.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rel.buyer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rel.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rel.buyerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rel.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rel.productId.toString().includes(searchTerm)
  );

  const filteredRejectedRelationships = rejectedRelationships.filter((rel: any) =>
    rel.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rel.buyer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rel.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rel.buyerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rel.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rel.productId.toString().includes(searchTerm)
  );

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navigation />
        <div className="lg:pl-72 pt-16 lg:pt-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-6 rounded-2xl inline-block mb-6 shadow-lg">
                <Users className="w-12 h-12 text-blue-600 mx-auto" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">
                Connect Your Wallet
              </h1>
              <p className="text-gray-600 text-lg max-w-md mx-auto">
                Please connect your wallet to manage supplier and buyer relationships
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
                Please register your company to manage supplier and buyer relationships
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
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                Relationships
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                Manage your supplier and buyer relationships
              </p>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200">
                <Users className="w-6 h-6 text-gray-600" />
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(true);
                  fetchAllCompanies(); // Refresh companies when modal opens
                }}
                className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-blue-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                New Relationship
              </button>
            </div>
          </div>
          <div className="md:hidden mt-4">
            <button
              onClick={() => {
                setShowCreateModal(true);
                fetchAllCompanies(); // Refresh companies when modal opens
              }}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-blue-700 transition-all duration-200 font-semibold shadow-lg flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" />
              New Relationship
            </button>
          </div>
        </div>

        {/* Search and Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by company name, product name, or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setActiveTab('active')}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'active'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Active ({activeRelationships.length})
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'pending'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Pending ({pendingRelationships.length})
              </button>
              <button
                onClick={() => setActiveTab('rejected')}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'rejected'
                    ? 'bg-white text-red-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Rejected ({rejectedRelationships.length})
              </button>
            </div>
          </div>
        </div>

        {/* Relationships List */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="grid gap-6">
            {activeTab === 'active' ? (
              filteredActiveRelationships.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No active relationships</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Create your first relationship to start trading.
                  </p>
                </div>
              ) : (
                filteredActiveRelationships.map((relationship) => (
                  <RelationshipCard
                    key={relationship.id}
                    relationship={relationship}
                    isActive={true}
                    onNegotiate={() => {
                      setSelectedRelationship(relationship);
                      fetchNegotiationHistory(relationship.id);
                      setShowNegotiationModal(true);
                    }}
                    onPlaceOrder={() => {
                      setSelectedRelationship(relationship);
                      setShowOrderModal(true);
                    }}
                    currentAccount={account || ''}
                    negotiationHistory={relationship.negotiationHistory || []}
                  />
                ))
              )
            ) : activeTab === 'pending' ? (
              filteredPendingRelationships.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No pending relationships</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    All your relationships are either active or you have no pending requests.
                  </p>
                </div>
              ) : (
                filteredPendingRelationships.map((relationship) => {
                  const isSupplier = relationship.supplier.toLowerCase() === (account || '').toLowerCase();
                  const partnerAddress = isSupplier ? relationship.buyer : relationship.supplier;
                  const partnerName = isSupplier ? relationship.buyerName : relationship.supplierName;
                  
                  return (
                    <RelationshipCard
                      key={relationship.id}
                      relationship={relationship}
                      isActive={false}
                      onAccept={() => handleAcceptRelationship(relationship.id)}
                      onReject={() => handleRejectRelationship(relationship.id)}
                      onNegotiate={() => {
                        setSelectedRelationship(relationship);
                        fetchNegotiationHistory(relationship.id);
                        setShowNegotiationModal(true);
                      }}
                      currentAccount={account || ''}
                      negotiationHistory={relationship.negotiationHistory || []}
                      onAnalyzeCompany={analyzeCompany}
                      onViewAnalysis={viewAnalysisPDF}
                      isAnalysisLoading={loadingAnalysis[partnerAddress] || false}
                      hasAnalysis={!!companyAnalysis[partnerAddress]}
                      hasViewedAnalysis={viewedAnalysis[partnerAddress] || false}
                    />
                  );
                })
              )
            ) : (
              // Rejected tab
              filteredRejectedRelationships.length === 0 ? (
                <div className="text-center py-12">
                  <XCircle className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No rejected relationships</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You have no rejected relationship requests.
                  </p>
                </div>
              ) : (
                filteredRejectedRelationships.map((relationship) => (
                  <RelationshipCard
                    key={relationship.id}
                    relationship={relationship}
                    isActive={false}
                    isRejected={true}
                    onNegotiate={() => {
                      setSelectedRelationship(relationship);
                      fetchNegotiationHistory(relationship.id);
                      setShowNegotiationModal(true);
                    }}
                    currentAccount={account || ''}
                    negotiationHistory={relationship.negotiationHistory || []}
                  />
                ))
              )
            )}
          </div>
        )}

        {/* Create Relationship Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-5 w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-2">
                  <div className="bg-gradient-to-r from-blue-500 to-green-500 p-2 rounded-lg shadow-lg">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Create Relationship</h2>
                    <p className="text-xs text-gray-600">Build new trading partnership</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Relationship Mode Toggle */}
              <div className="mb-4">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-3 border border-gray-200">
                  <h3 className="text-xs font-bold text-gray-900 mb-2">Relationship Type</h3>
                  <div className="flex bg-white rounded-lg p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setRelationshipMode('selling');
                        setSelectedSupplier('');
                        setSelectedBuyer('');
                        setSupplierProducts([]);
                        setSelectedProduct(null);
                        setSelectedSupplierProduct(null);
                        setRelationshipValue('productId', 0);
                      }}
                      className={`flex-1 px-3 py-2 rounded-md text-xs font-semibold transition-all duration-200 ${
                        relationshipMode === 'selling'
                          ? 'bg-gradient-to-r from-blue-500 to-green-500 text-white shadow-md'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      I'm Selling
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRelationshipMode('buying');
                        setSelectedSupplier('');
                        setSelectedBuyer('');
                        setSupplierProducts([]);
                        setSelectedProduct(null);
                        setSelectedSupplierProduct(null);
                        setRelationshipValue('productId', 0);
                      }}
                      className={`flex-1 px-3 py-2 rounded-md text-xs font-semibold transition-all duration-200 ${
                        relationshipMode === 'buying'
                          ? 'bg-gradient-to-r from-blue-500 to-green-500 text-white shadow-md'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      I'm Buying
                    </button>
                  </div>
                </div>
              </div>
              
              <form onSubmit={handleSubmitRelationship(handleCreateRelationship)}>
                <div className="space-y-4">
                  {relationshipMode === 'selling' ? (
                    // Selling Mode - Streamlined fields
                    <>
                      <div>
                        <label className="block text-xs font-bold text-gray-900 mb-2">
                          Buyer Company
                        </label>
                        <div className="flex items-center gap-2 mb-1">
                          <button
                            type="button"
                            onClick={() => {
                              console.log('Manual refresh clicked');
                              fetchAllCompanies();
                            }}
                            className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 hover:bg-gray-200"
                          >
                            Refresh
                          </button>
                          <span className="text-xs text-gray-500">
                            {allCompanies.length} companies
                          </span>
                        </div>
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setBuyerDropdownOpen(!buyerDropdownOpen)}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 flex items-center justify-between"
                          >
                            <span className="text-left">
                              {selectedBuyer ? 
                                allCompanies.find(c => c.companyAddress === selectedBuyer)?.name || 'Unknown Company' :
                                allCompanies.length === 0 
                                  ? "No other companies registered yet" 
                                  : `Select buyer company (${allCompanies.length} available)`
                              }
                            </span>
                            <ChevronDown className="h-4 w-4 ml-2" />
                          </button>
                          {buyerDropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-2xl shadow-lg z-50 max-h-48 overflow-y-auto">
                              {allCompanies.length === 0 ? (
                                <div className="px-3 py-2 text-gray-500 text-sm">No companies available</div>
                              ) : (
                                allCompanies.map((company) => (
                                  <div
                                    key={company.companyAddress}
                                    onClick={() => {
                                      setSelectedBuyer(company.companyAddress);
                                      setBuyerDropdownOpen(false);
                                    }}
                                    className="px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors text-sm"
                                  >
                                    {company.name} ({formatAddress(company.companyAddress || '')})
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                        {allCompanies.length === 0 && (
                          <div className="text-xs text-blue-600 mt-1">
                            <p>💡 Other companies need to register first</p>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-gray-900 mb-2">
                          Your Product
                        </label>
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setProductDropdownOpen(!productDropdownOpen)}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 flex items-center justify-between"
                          >
                            <span className="text-left">
                              {selectedProduct ? 
                                availableProducts.find(p => p.id === selectedProduct)?.name || 'Unknown Product' :
                                'Select your product'
                              }
                            </span>
                            <ChevronDown className="h-4 w-4 ml-2" />
                          </button>
                          {productDropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-2xl shadow-lg z-50 max-h-48 overflow-y-auto">
                              {availableProducts.length === 0 ? (
                                <div className="px-3 py-2 text-gray-500 text-sm">No products available</div>
                              ) : (
                                availableProducts.map((product) => (
                                  <div
                                    key={product.id}
                                    onClick={() => {
                                      setSelectedProduct(product.id);
                                      setRelationshipValue('productId', product.id);
                                      setProductDropdownOpen(false);
                                    }}
                                    className="px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors text-sm"
                                  >
                                    {product.name} (ID: {product.id})
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                        {relationshipErrors.productId && (
                          <p className="text-red-600 text-xs mt-1">{relationshipErrors.productId.message}</p>
                        )}
                      </div>
                    </>
                  ) : (
                    // Buying Mode - New fields
                    <>
                      <div>
                        <label className="block text-xs font-bold text-gray-900 mb-2">
                          Supplier Company
                        </label>
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setSupplierDropdownOpen(!supplierDropdownOpen)}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 flex items-center justify-between"
                          >
                            <span className="text-left">
                              {selectedSupplier ? 
                                allCompanies.find(c => c.companyAddress === selectedSupplier)?.name || 'Unknown Company' :
                                'Select supplier company'
                              }
                            </span>
                            <ChevronDown className="h-4 w-4 ml-2" />
                          </button>
                          {supplierDropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-2xl shadow-lg z-50 max-h-48 overflow-y-auto">
                              {allCompanies.length === 0 ? (
                                <div className="px-3 py-2 text-gray-500 text-sm">No companies available</div>
                              ) : (
                                allCompanies.map((company) => (
                                  <div
                                    key={company.companyAddress}
                                    onClick={() => {
                                      setSelectedSupplier(company.companyAddress);
                                      setSupplierDropdownOpen(false);
                                      fetchProductsBySupplier(company.companyAddress);
                                    }}
                                    className="px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors text-sm"
                                  >
                                    {company.name} ({formatAddress(company.companyAddress || '')})
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-gray-900 mb-2">
                          Product
                        </label>
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setSupplierProductDropdownOpen(!supplierProductDropdownOpen)}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 flex items-center justify-between"
                            disabled={!selectedSupplier}
                          >
                            <span className="text-left">
                              {selectedSupplierProduct ? 
                                supplierProducts.find(p => p.id === selectedSupplierProduct)?.name || 'Unknown Product' :
                                selectedSupplier ? 'Select product' : 'Select supplier first'
                              }
                            </span>
                            <ChevronDown className="h-4 w-4 ml-2" />
                          </button>
                          {supplierProductDropdownOpen && selectedSupplier && (
                            <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-2xl shadow-lg z-50 max-h-48 overflow-y-auto">
                              {supplierProducts.length === 0 ? (
                                <div className="px-3 py-2 text-gray-500 text-sm">No products available</div>
                              ) : (
                                supplierProducts.map((product) => (
                                  <div
                                    key={product.id}
                                    onClick={() => {
                                      setSelectedSupplierProduct(product.id);
                                      setRelationshipValue('productId', product.id);
                                      setSupplierProductDropdownOpen(false);
                                    }}
                                    className="px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors text-sm"
                                  >
                                    {product.name} (ID: {product.id})
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                        {relationshipErrors.productId && (
                          <p className="text-red-600 text-xs mt-1">{relationshipErrors.productId.message}</p>
                        )}
                      </div>
                      
                      {/* Hidden inputs for buyer mode - using key to force re-render */}
                      <input
                        {...registerRelationship('supplierAddress')}
                        type="hidden"
                        value={selectedSupplier || ''}
                        key={`supplier-${selectedSupplier}`}
                      />
                      <input
                        {...registerRelationship('buyerAddress')}
                        type="hidden"
                        value={account || ''}
                        key={`buyer-${account}`}
                      />
                    </>
                  )}
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-900 mb-2">
                      {relationshipMode === 'selling' ? 'Your Price Per Unit (ETH)' : 'Your Offer Price Per Unit (ETH)'}
                    </label>
                    <input
                      {...registerRelationship('pricePerUnit', { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="0.00"
                    />
                    {relationshipErrors.pricePerUnit && (
                      <p className="text-red-600 text-xs mt-1">{relationshipErrors.pricePerUnit.message}</p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-900 mb-2">
                        Start Date
                      </label>
                      <input
                        {...registerRelationship('startDate')}
                        type="date"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      />
                      {relationshipErrors.startDate && (
                        <p className="text-red-600 text-xs mt-1">{relationshipErrors.startDate.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-gray-900 mb-2">
                        End Date
                      </label>
                      <input
                        {...registerRelationship('endDate')}
                        type="date"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      />
                      {relationshipErrors.endDate && (
                        <p className="text-red-600 text-xs mt-1">{relationshipErrors.endDate.message}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3 mt-5">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white rounded-xl font-semibold disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
                  >
                    {submitting 
                      ? 'Creating...' 
                      : relationshipMode === 'selling' 
                        ? 'Create Offer' 
                        : 'Send Request'
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Negotiation Modal */}
        {showNegotiationModal && selectedRelationship && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">
                  {selectedRelationship.status === 'accepted' ? 'Negotiation History' : 'Negotiate Terms'}
                </h2>
                <button
                  onClick={() => setShowNegotiationModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Negotiation History */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Negotiation History</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {negotiationHistory.map((step, index) => {
                    const isLatest = index === negotiationHistory.length - 1;
                    return (
                      <div key={step.step} className={`flex items-center justify-between p-3 rounded-lg ${
                        isLatest ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                            isLatest ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {step.step}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {ethers.formatEther(step.pricePerUnit.toString())} ETH per unit
                            </p>
                            <p className="text-xs text-gray-500">
                              by {formatAddress(step.requestFrom || '')}
                              {isLatest && ' (Current Authority)'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">
                            {new Date(step.timestamp * 1000).toLocaleDateString()}
                          </p>
                          {isLatest && selectedRelationship.status === 'pending' && (
                            <p className="text-xs text-blue-600 font-medium">
                              Waiting for response
                            </p>
                          )}
                          {isLatest && selectedRelationship.status === 'accepted' && (
                            <p className="text-xs text-green-600 font-medium">
                              Final Terms
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Only show negotiation form for pending relationships */}
              {selectedRelationship.status === 'pending' && (
                <form onSubmit={handleSubmitNegotiation(handleNegotiate)}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        New Price Per Unit (ETH)
                      </label>
                      <input
                        {...registerNegotiation('pricePerUnit', { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                      />
                      {negotiationErrors.pricePerUnit && (
                        <p className="text-red-600 text-sm mt-1">{negotiationErrors.pricePerUnit.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        New End Date
                      </label>
                      <input
                        {...registerNegotiation('endDate')}
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {negotiationErrors.endDate && (
                        <p className="text-red-600 text-sm mt-1">{negotiationErrors.endDate.message}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowNegotiationModal(false)}
                      className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:opacity-50"
                    >
                      {submitting ? 'Negotiating...' : 'Send Counter-Offer'}
                    </button>
                  </div>
                </form>
              )}
              
              {/* Close button for accepted relationships (history view only) */}
              {selectedRelationship.status === 'accepted' && (
                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => setShowNegotiationModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Order Modal */}
        {showOrderModal && selectedRelationship && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-4 w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-2">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-lg shadow-lg">
                    <ShoppingCart className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Place Order</h2>
                    <p className="text-xs text-gray-600">Order from your relationship</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowOrderModal(false);
                    setOrderQuantity(0);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Relationship Info */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-3 mb-4 border border-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">
                      {selectedRelationship.productName || 'Unknown Product'}
                    </h3>
                    <p className="text-xs text-gray-600">
                      Price: <span className="font-bold text-blue-600">
                        {selectedRelationship.negotiationHistory?.length > 0 
                          ? ethers.formatEther(selectedRelationship.negotiationHistory[selectedRelationship.negotiationHistory.length - 1].pricePerUnit.toString()) + ' ETH'
                          : 'N/A'
                        }
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">ID #{selectedRelationship.id}</p>
                  </div>
                </div>
              </div>
              
              <form onSubmit={handleSubmitOrder(handlePlaceOrder)}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Quantity
                    </label>
                    <div className="relative">
                      <input
                        {...registerOrder('quantity', { valueAsNumber: true })}
                        type="number"
                        min="1"
                        value={orderQuantity || ''}
                        onChange={(e) => setOrderQuantity(Number(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 font-semibold"
                        placeholder="Enter quantity"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <span className="text-sm text-gray-500 font-medium">units</span>
                      </div>
                    </div>
                    {orderErrors.quantity && (
                      <p className="text-red-600 text-xs mt-1 flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{orderErrors.quantity.message}</span>
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Order Notes <span className="text-gray-500 font-normal">(Optional)</span>
                    </label>
                    <textarea
                      {...registerOrder('notes')}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                      placeholder="Add any special instructions..."
                    />
                    {orderErrors.notes && (
                      <p className="text-red-600 text-xs mt-1 flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{orderErrors.notes.message}</span>
                      </p>
                    )}
                  </div>

                  {/* Order Summary */}
                  <div className="bg-gray-50 rounded-xl p-3">
                    <h4 className="font-bold text-gray-900 mb-2 text-sm">Order Summary</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Quantity:</span>
                        <span className="font-semibold text-gray-900">{orderQuantity || 0} units</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Price per unit:</span>
                        <span className="font-semibold text-gray-900">
                          {selectedRelationship.negotiationHistory?.length > 0 
                            ? ethers.formatEther(selectedRelationship.negotiationHistory[selectedRelationship.negotiationHistory.length - 1].pricePerUnit.toString()) + ' ETH'
                            : 'N/A'
                          }
                        </span>
                      </div>
                      <div className="border-t border-gray-200 pt-1 mt-2">
                        <div className="flex justify-between">
                          <span className="font-bold text-gray-900 text-sm">Estimated Total:</span>
                          <span className="font-bold text-blue-600 text-sm">
                            {selectedRelationship.negotiationHistory?.length > 0 && orderQuantity > 0
                              ? (Number(ethers.formatEther(selectedRelationship.negotiationHistory[selectedRelationship.negotiationHistory.length - 1].pricePerUnit.toString())) * orderQuantity).toFixed(4) + ' ETH'
                              : orderQuantity > 0 ? 'N/A' : '0.0000 ETH'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowOrderModal(false);
                      setOrderQuantity(0);
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
                  >
                    {submitting ? 'Placing Order...' : 'Place Order'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

// Relationship Card Component
function RelationshipCard({ 
  relationship, 
  isActive, 
  isRejected = false,
  onAccept, 
  onReject, 
  onNegotiate, 
  onPlaceOrder,
  currentAccount,
  negotiationHistory = [],
  onAnalyzeCompany,
  onViewAnalysis,
  isAnalysisLoading,
  hasAnalysis,
  hasViewedAnalysis
}: {
  relationship: Relationship & { 
    supplierName?: string; 
    buyerName?: string; 
    productName?: string; 
  };
  isActive: boolean;
  isRejected?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
  onNegotiate?: () => void;
  onPlaceOrder?: () => void;
  currentAccount: string;
  negotiationHistory?: any[];
  onAnalyzeCompany?: (companyAddress: string, companyName: string) => void;
  onViewAnalysis?: (companyAddress: string) => void;
  isAnalysisLoading?: boolean;
  hasAnalysis?: boolean;
  hasViewedAnalysis?: boolean;
}) {
  const isSupplier = relationship.supplier.toLowerCase() === currentAccount.toLowerCase();
  const isBuyer = relationship.buyer.toLowerCase() === currentAccount.toLowerCase();
  const role = isSupplier ? 'Supplier' : 'Buyer';
  const partner = isSupplier ? relationship.buyer : relationship.supplier;
  const partnerRole = isSupplier ? 'Buyer' : 'Supplier';
  const partnerName = isSupplier ? relationship.buyerName : relationship.supplierName;
  const yourCompanyName = isSupplier ? relationship.supplierName : relationship.buyerName;
  
  // Determine current requestFrom (who has authority to wait)
  const currentRequestFrom = negotiationHistory.length > 0 
    ? negotiationHistory[negotiationHistory.length - 1].requestFrom.toLowerCase() 
    : '';
  const isCurrentRequestFrom = currentAccount.toLowerCase() === currentRequestFrom;
  const canTakeAction = !isCurrentRequestFrom && (isSupplier || isBuyer);
  
  // Get current price and terms from latest negotiation
  const currentTerms = negotiationHistory.length > 0 
    ? negotiationHistory[negotiationHistory.length - 1] 
    : null;
  const currentPrice = currentTerms ? ethers.formatEther(currentTerms.pricePerUnit.toString()) + ' ETH' : 'N/A';
  const totalNegotiations = negotiationHistory.length;

  return (
    <div className="group bg-white rounded-3xl border border-gray-200/60 overflow-hidden transition-all duration-300 hover:border-gray-300/80 hover:shadow-xl hover:shadow-gray-100/50">
      {/* Status Header with Gradient */}
      <div className={`relative px-6 py-4 ${
        isRejected 
          ? 'bg-gradient-to-r from-red-50 via-red-50/80 to-rose-50' 
          : isActive 
            ? 'bg-gradient-to-r from-emerald-50 via-green-50/80 to-teal-50' 
            : 'bg-gradient-to-r from-amber-50 via-yellow-50/80 to-orange-50'
      }`}>
        <div className="flex items-center justify-between">
          {/* Status Icon & Role Badge */}
          <div className="flex items-center gap-3">
            <div className={`relative w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-sm ${
              isRejected 
                ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/25' 
                : isActive 
                  ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/25' 
                  : 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/25'
            }`}>
              {isRejected ? <XCircle className="h-6 w-6 text-white" /> : isActive ? <CheckCircle className="h-6 w-6 text-white" /> : <Clock className="h-6 w-6 text-white" />}
              {/* Pulse animation for pending */}
              {!isActive && !isRejected && (
                <div className="absolute inset-0 rounded-2xl bg-amber-400 animate-ping opacity-20"></div>
              )}
            </div>
            
            {/* Role Badge */}
            <div className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide ${
              isSupplier 
                ? 'bg-blue-100 text-blue-700 border border-blue-200/50' 
                : 'bg-purple-100 text-purple-700 border border-purple-200/50'
            }`}>
              {isSupplier ? '📦 SUPPLIER' : '🛒 BUYER'}
            </div>
          </div>

          {/* Status Badge */}
          <div className={`px-4 py-2 rounded-2xl text-sm font-medium border backdrop-blur-sm ${
            isRejected
              ? 'bg-red-100/80 text-red-700 border-red-200/50'
              : isActive 
                ? 'bg-emerald-100/80 text-emerald-700 border-emerald-200/50' 
                : 'bg-amber-100/80 text-amber-700 border-amber-200/50'
          }`}>
            {relationship.status.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-5">
        {/* Product & Partner Info */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-gray-800 transition-colors">
                {relationship.productName || `Product #${relationship.productId}`}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                <span>Relationship #{relationship.id}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900 mb-1">{currentPrice}</div>
              <div className="text-xs text-gray-500 font-medium">Current Price</div>
            </div>
          </div>

          {/* Partner Connection */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50/80 to-gray-100/50 rounded-2xl border border-gray-200/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center border border-gray-200/50">
                <Building className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-sm">
                  {yourCompanyName || formatAddress(currentAccount || '')}
                </div>
                <div className="text-xs text-gray-500">Your Company</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-gradient-to-r from-gray-300 to-gray-400 rounded"></div>
              <Users className="h-4 w-4 text-gray-400" />
              <div className="w-8 h-0.5 bg-gradient-to-r from-gray-400 to-gray-300 rounded"></div>
            </div>
            
            <div className="flex items-center gap-3">
              <div>
                <div className="font-semibold text-gray-900 text-sm text-right">
                  {partnerName || formatAddress(partner || '')}
                </div>
                <div className="text-xs text-gray-500 text-right">{partnerRole}</div>
              </div>
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center border border-gray-200/50">
                <Building className="h-5 w-5 text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-white rounded-2xl border border-gray-200/50 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Duration</span>
            </div>
            <div className="text-sm font-medium text-gray-900">
              {new Date(relationship.startDate * 1000).toLocaleDateString()}
            </div>
            <div className="text-xs text-gray-500">
              to {new Date(relationship.endDate * 1000).toLocaleDateString()}
            </div>
          </div>
          
          <div className="p-4 bg-white rounded-2xl border border-gray-200/50 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpDown className="h-4 w-4 text-purple-500" />
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Negotiations</span>
            </div>
            <div className="text-sm font-medium text-gray-900">
              {totalNegotiations} Round{totalNegotiations !== 1 ? 's' : ''}
            </div>
            <div className="text-xs text-gray-500">
              {totalNegotiations > 0 ? 'Terms negotiated' : 'No negotiations yet'}
            </div>
          </div>
        </div>
        {/* Negotiation History Summary */}
        {negotiationHistory.length > 0 && (
          <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl border border-slate-200/50 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl flex items-center justify-center shadow-sm">
                  <MessageCircle className="h-4 w-4 text-white" />
                </div>
                <h4 className="font-semibold text-slate-900">Latest Negotiation</h4>
              </div>
              <div className="text-xs text-slate-500 font-medium bg-white px-3 py-1 rounded-full border border-slate-200">
                Step {negotiationHistory.length} • {new Date(currentTerms?.timestamp * 1000).toLocaleDateString()}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="p-3 bg-white rounded-xl border border-slate-200/50">
                <div className="text-xs text-slate-500 font-medium mb-1">NEGOTIATED PRICE</div>
                <div className="font-bold text-slate-900">{currentPrice}</div>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200/50">
                <div className="text-xs text-slate-500 font-medium mb-1">PROPOSED BY</div>
                <div className="font-bold text-slate-900 text-xs">{formatAddress((currentTerms?.requestFrom || '') as string)}</div>
              </div>
            </div>
            
            {!isActive && currentTerms && (
              <div className={`flex items-center gap-2 text-xs font-medium p-2 rounded-lg ${
                isCurrentRequestFrom 
                  ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                  : 'bg-blue-100 text-blue-700 border border-blue-200'
              }`}>
                {isCurrentRequestFrom ? (
                  <>
                    <Clock className="h-3 w-3" />
                    Waiting for {partnerRole.toLowerCase()} response
                  </>
                ) : (
                  <>
                    <Users className="h-3 w-3" />
                    Action required: Accept, reject, or negotiate
                  </>
                )}
              </div>
            )}
            
            {isActive && currentTerms && (
              <div className="flex items-center gap-2 text-xs font-medium p-2 bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200">
                <CheckCircle className="h-3 w-3" />
                Final agreed terms - Ready for orders
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="px-6 pb-6">
        <div className="flex gap-3 flex-wrap">
          {isRejected ? (
            <>
              {negotiationHistory.length > 0 && (
                <button
                  onClick={onNegotiate}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm bg-white hover:bg-gray-50 text-gray-700 rounded-xl border border-gray-200 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                >
                  <Eye className="h-4 w-4" />
                  View History
                </button>
              )}
              <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 bg-red-50 rounded-xl border border-red-200">
                <XCircle className="h-4 w-4" />
                <span className="font-medium">Relationship rejected</span>
              </div>
            </>
          ) : isActive ? (
            <>
              {isBuyer && (
                <button
                  onClick={onPlaceOrder}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Place Order
                </button>
              )}
              <button
                onClick={onNegotiate}
                className="flex items-center gap-2 px-4 py-2.5 text-sm bg-white hover:bg-gray-50 text-gray-700 rounded-xl border border-gray-200 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
              >
                <Eye className="h-4 w-4" />
                View History
              </button>
            </>
          ) : (
            <>
              {canTakeAction ? (
                <>
                  <button
                    onClick={onAccept}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Accept Terms
                  </button>
                  <button
                    onClick={onReject}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                  <button
                    onClick={onNegotiate}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm bg-white hover:bg-gray-50 text-gray-700 rounded-xl border border-gray-200 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Negotiate
                  </button>
                  
                  {/* Company Analysis Button */}
                  {!hasViewedAnalysis && (
                    <div className="flex gap-2">
                      {!hasAnalysis ? (
                        <button
                          onClick={() => onAnalyzeCompany?.(partner, partnerName || 'Unknown Company')}
                          disabled={isAnalysisLoading}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none"
                        >
                          {isAnalysisLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <BarChart3 className="h-4 w-4" />
                          )}
                          {isAnalysisLoading ? 'Analyzing...' : 'Analyze Partner'}
                        </button>
                      ) : (
                        <button
                          onClick={() => onViewAnalysis?.(partner)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                        >
                          <FileText className="h-4 w-4" />
                          View Analysis (One-time)
                        </button>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-amber-600 bg-amber-50 rounded-xl border border-amber-200">
                  <Clock className="h-4 w-4 animate-pulse" />
                  <span className="font-medium">Waiting for {partnerRole.toLowerCase()} response...</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

