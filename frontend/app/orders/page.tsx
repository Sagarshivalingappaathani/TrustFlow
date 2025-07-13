'use client';

// @ts-nocheck

import React, { useState, useEffect } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import Navigation from '@/components/Navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  ShoppingCart,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard,
  Building,
  Calendar,
  DollarSign,
  FileText,
  Check,
  X,
  Timer,
  Package,
  Truck,
  MapPin,
  QrCode
} from 'lucide-react';
import { Order, DeliveryEvent } from '@/lib/contract';
import DeliveryTimeline from '@/components/DeliveryTimeline';
import UPIPayment from '@/components/UPIPayment';
import OrderTrackingQR from '@/components/OrderTrackingQR';
import { formatAddress } from '@/lib/web3';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

export default function Orders() {
  const { isConnected, isRegistered, contract, account } = useWeb3();
  const [myOrders, setMyOrders] = useState<(Order & { productName?: string; sellerName?: string; buyerName?: string })[]>([]);
  const [pendingOrders, setPendingOrders] = useState<(Order & { productName?: string; sellerName?: string; buyerName?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my-orders' | 'pending-approvals' | 'payment-due'>('my-orders');
  const [approvedOrders, setApprovedOrders] = useState<(Order & { productName?: string; sellerName?: string; buyerName?: string })[]>([]);
  const [selectedOrderEvents, setSelectedOrderEvents] = useState<{[orderId: number]: DeliveryEvent[]}>({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedOrderForQR, setSelectedOrderForQR] = useState<Order | null>(null);

  useEffect(() => {
    if (isConnected && isRegistered && contract && account) {
      fetchOrders();
    }
  }, [isConnected, isRegistered, contract, account]);

  const fetchOrders = async () => {
    if (!contract || !account) return;
    
    try {
      setLoading(true);
      
      // Fetch orders as buyer (excluding orders ready for payment)
      const buyerOrderIds = await contract.getOrdersByBuyer(account);
      const buyerOrders = [];
      
      for (const id of buyerOrderIds) {
        const order = await contract.getOrder(Number(id));
        
        // Only include orders where current user is actually the buyer
        if (order.buyer.toLowerCase() !== account.toLowerCase()) {
          continue;
        }
        
        // Check if this order is ready for payment (if so, exclude from "My Orders")
        let isReadyForPayment = false;
        try {
          const deliveryEvents = await contract.getOrderDeliveryHistory(Number(id));
          const events = deliveryEvents.map((event: any) => ({
            status: event.status
          }));
          
          const hasQualityCheck = events.some((e: any) => e.status === 'quality_checked');
          const hasPayment = events.some((e: any) => e.status === 'payment_sent');
          isReadyForPayment = hasQualityCheck && !hasPayment;
        } catch (error) {
          // No delivery events, not ready for payment
        }
        
        // Skip orders that are ready for payment (they go to "Payment Due" tab)
        if (isReadyForPayment) {
          continue;
        }
        
        // Fetch additional details
        const [product, sellerCompany] = await Promise.all([
          contract.getProduct(Number(order.productId)).catch(() => ({ name: 'Unknown Product' })),
          contract.getCompany(order.seller).catch(() => ({ name: 'Unknown Company' }))
        ]);
        
        buyerOrders.push({
          id: Number(order.id),
          buyer: order.buyer,
          seller: order.seller,
          productId: Number(order.productId),
          productName: product.name,
          sellerName: sellerCompany.name,
          quantity: Number(order.quantity),
          unitPrice: Number(order.unitPrice),
          totalPrice: Number(order.totalPrice),
          orderType: order.orderType,
          status: order.status,
          createdAt: Number(order.createdAt),
          approvalDeadline: Number(order.approvalDeadline),
          paymentDeadline: Number(order.paymentDeadline),
          notes: order.notes,
          exists: order.exists,
          isPartialTransfer: order.isPartialTransfer,
          originalProductId: Number(order.originalProductId),
          listingId: Number(order.listingId)
        });
      }
      
      // Fetch all orders as seller (pending + approved) - only orders where current user is the seller
      const allSellerOrderIds = await contract.getOrdersBySeller(account);
      const sellerOrders = await Promise.all(
        allSellerOrderIds
          .map(async (id: bigint) => {
            const order = await contract.getOrder(Number(id));
            
            // Only include orders where current user is actually the seller AND status is pending or approved
            if (order.seller.toLowerCase() !== account.toLowerCase()) {
              return null;
            }
            
            // Show both pending and approved orders for seller
            if (order.status !== 'pending' && order.status !== 'approved') {
              return null;
            }
            
            // Fetch additional details
            const [product, buyerCompany] = await Promise.all([
              contract.getProduct(Number(order.productId)).catch(() => ({ name: 'Unknown Product' })),
              contract.getCompany(order.buyer).catch(() => ({ name: 'Unknown Company' }))
            ]);
            
            return {
              id: Number(order.id),
              buyer: order.buyer,
              seller: order.seller,
              productId: Number(order.productId),
              productName: product.name,
              buyerName: buyerCompany.name,
              quantity: Number(order.quantity),
              unitPrice: Number(order.unitPrice),
              totalPrice: Number(order.totalPrice),
              orderType: order.orderType,
              status: order.status,
              createdAt: Number(order.createdAt),
              approvalDeadline: Number(order.approvalDeadline),
              paymentDeadline: Number(order.paymentDeadline),
              notes: order.notes,
              exists: order.exists,
              isPartialTransfer: order.isPartialTransfer,
              originalProductId: Number(order.originalProductId),
              listingId: Number(order.listingId)
            };
          })
      ).then(orders => orders.filter(order => order !== null));
      
      // Fetch orders ready for payment (quality check completed but payment not sent)
      const allBuyerOrderIds = await contract.getOrdersByBuyer(account);
      const readyForPaymentOrders = [];
      
      for (const id of allBuyerOrderIds) {
        const order = await contract.getOrder(Number(id));
        
        // Only include orders where current user is actually the buyer
        if (order.buyer.toLowerCase() !== account.toLowerCase()) {
          continue;
        }
        
        // Check delivery events to see if ready for payment
        try {
          const deliveryEvents = await contract.getOrderDeliveryHistory(Number(id));
          const events = deliveryEvents.map((event: any) => ({
            timestamp: Number(event.timestamp),
            status: event.status,
            description: event.description,
            updatedBy: event.updatedBy
          }));
          
          // Order is ready for payment if quality_checked is done but payment_sent is not
          const hasQualityCheck = events.some((e: any) => e.status === 'quality_checked');
          const hasPayment = events.some((e: any) => e.status === 'payment_sent');
          
          if (hasQualityCheck && !hasPayment) {
            // Fetch additional details
            const [product, sellerCompany] = await Promise.all([
              contract.getProduct(Number(order.productId)).catch(() => ({ name: 'Unknown Product' })),
              contract.getCompany(order.seller).catch(() => ({ name: 'Unknown Company' }))
            ]);
            
            readyForPaymentOrders.push({
              id: Number(order.id),
              buyer: order.buyer,
              seller: order.seller,
              productId: Number(order.productId),
              productName: product.name,
              sellerName: sellerCompany.name,
              quantity: Number(order.quantity),
              unitPrice: Number(order.unitPrice),
              totalPrice: Number(order.totalPrice),
              orderType: order.orderType,
              status: order.status,
              createdAt: Number(order.createdAt),
              approvalDeadline: Number(order.approvalDeadline),
              paymentDeadline: Number(order.paymentDeadline),
              notes: order.notes,
              exists: order.exists,
              isPartialTransfer: order.isPartialTransfer,
              originalProductId: Number(order.originalProductId),
              listingId: Number(order.listingId)
            });
          }
        } catch (error) {
          // No delivery events yet, skip this order
          continue;
        }
      }
      
      const approvedOrdersList = readyForPaymentOrders;
      
      setMyOrders(buyerOrders);
      setPendingOrders(sellerOrders);
      setApprovedOrders(approvedOrdersList);
      
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveOrder = async (orderId: number) => {
    // Use delivery event system instead of disabled approveOrder function
    await handleAddDeliveryEvent(orderId, 'approved', 'Order approved by seller');
  };

  const handleRejectOrder = async (orderId: number, reason: string = '') => {
    if (!contract) return;
    
    try {
      const tx = await contract.rejectOrder(orderId, reason);
      toast.success('Order rejected');
      await tx.wait();
      fetchOrders();
    } catch (error: any) {
      console.error('Error rejecting order:', error);
      toast.error(error.reason || error.message || 'Failed to reject order');
    }
  };

  const handlePayForOrder = async (orderId: number, totalPrice: number) => {
    if (!contract) return;
    
    try {
      // Convert totalPrice from wei to ETH (smart contract stores price in wei)
      // totalPrice is already in wei, so we use it directly
      const tx = await contract.payForOrder(orderId, {
        value: totalPrice.toString()
      });
      toast.success('ETH Payment sent successfully!');
      await tx.wait();
      
      // Note: payForOrder now automatically adds payment_sent delivery event and completes order
      toast.success('Order completed via ETH!');
      fetchOrders();
    } catch (error: any) {
      console.error('Error paying for order:', error);
      toast.error(error.reason || error.message || 'Failed to process ETH payment');
    }
  };

  const handleShowPaymentModal = (order: Order & { productName?: string; sellerName?: string; buyerName?: string }) => {
    setSelectedOrderForPayment(order);
    setShowPaymentModal(true);
  };

  const handleUPIPaymentSuccess = async (paymentId: string, orderId: number) => {
    try {
      // UPI payment completed successfully - now update blockchain
      console.log('✅ UPI Payment completed:', { paymentId, orderId });
      
      if (!contract) {
        throw new Error('Contract not available');
      }

      // Call smart contract to add payment_sent event and complete order
      const tx = await contract.completeOrderWithExternalPayment(
        orderId,
        "UPI",
        paymentId
      );
      
      toast.success('Updating blockchain...');
      await tx.wait();
      
      toast.success('🎉 Order completed via UPI payment!');
      console.log('✅ Blockchain updated with UPI payment');
      
      setShowPaymentModal(false);
      setSelectedOrderForPayment(null);
      fetchOrders();
    } catch (error: any) {
      console.error('Error handling UPI payment success:', error);
      toast.error(error.reason || error.message || 'Payment successful but blockchain update failed');
    }
  };

  const handleUPIPaymentError = (error: string) => {
    console.error('UPI Payment Error:', error);
    toast.error(`UPI Payment failed: ${error}`);
  };

  const handleShowQR = (order: Order) => {
    setSelectedOrderForQR(order);
    setShowQRModal(true);
  };

  const handleAddDeliveryEvent = async (orderId: number, status: string, description: string) => {
    if (!contract) return;
    
    try {
      const tx = await contract.addDeliveryEvent(orderId, status, description);
      toast.success(`${status.charAt(0).toUpperCase() + status.slice(1)} event added successfully!`);
      await tx.wait();
      
      // Refresh delivery events for this order
      await fetchDeliveryEvents(orderId);
      fetchOrders();
    } catch (error: any) {
      console.error('Error adding delivery event:', error);
      toast.error(error.reason || error.message || 'Failed to add delivery event');
    }
  };

  const fetchDeliveryEvents = async (orderId: number) => {
    if (!contract) return;
    
    try {
      const events = await contract.getOrderDeliveryHistory(orderId);
      setSelectedOrderEvents(prev => ({
        ...prev,
        [orderId]: events.map((event: any) => ({
          timestamp: Number(event.timestamp),
          status: event.status,
          description: event.description,
          updatedBy: event.updatedBy
        }))
      }));
    } catch (error) {
      console.error('Error fetching delivery events:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'paid':
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'expired':
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'approved':
        return 'bg-blue-100 text-blue-700';
      case 'packed':
        return 'bg-blue-100 text-blue-700';
      case 'shipped':
        return 'bg-purple-100 text-purple-700';
      case 'delivered':
        return 'bg-emerald-100 text-emerald-700';
      case 'awaiting_payment':
        return 'bg-orange-100 text-orange-700';
      case 'paid':
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'expired':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navigation />
        <div className="lg:pl-72 pt-16 lg:pt-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <div className="bg-gradient-to-r from-blue-100 to-green-100 p-6 rounded-2xl inline-block mb-6 shadow-lg">
                <ShoppingCart className="w-12 h-12 text-blue-600 mx-auto" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">
                Connect Your Wallet
              </h1>
              <p className="text-gray-600 text-lg max-w-md mx-auto">
                Please connect your wallet to view and manage your orders
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
                Please register your company to view and manage your orders
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
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                  Orders
                </h1>
                <p className="text-gray-600 mt-2 text-lg">
                  Manage your order requests and approvals
                </p>
              </div>
              <div className="hidden md:flex items-center space-x-4">
                <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200">
                  <ShoppingCart className="w-6 h-6 text-gray-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setActiveTab('my-orders')}
                className={`flex-1 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'my-orders'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                My Orders ({myOrders.length})
              </button>
              <button
                onClick={() => setActiveTab('pending-approvals')}
                className={`flex-1 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'pending-approvals'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Supplier Orders ({pendingOrders.length})
              </button>
              <button
                onClick={() => setActiveTab('payment-due')}
                className={`flex-1 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'payment-due'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Payment Due ({approvedOrders.length})
              </button>
            </div>
          </div>

          {/* Orders List */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {activeTab === 'my-orders' && (
                <>
                  {myOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No orders yet</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Place your first order through relationships.
                      </p>
                    </div>
                  ) : (
                    myOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        currentAccount={account || ''}
                        onApprove={handleApproveOrder}
                        onReject={handleRejectOrder}
                        onPay={handlePayForOrder}
                        onShowPaymentModal={handleShowPaymentModal}
                        onShowQR={handleShowQR}
                        onAddDeliveryEvent={handleAddDeliveryEvent}
                        onFetchDeliveryEvents={fetchDeliveryEvents}
                        deliveryEvents={selectedOrderEvents[order.id] || []}
                        getStatusIcon={getStatusIcon}
                        getStatusColor={getStatusColor}
                        userRole="buyer"
                      />
                    ))
                  )}
                </>
              )}

              {activeTab === 'pending-approvals' && (
                <>
                  {pendingOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <Clock className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No pending orders</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        No orders awaiting your approval.
                      </p>
                    </div>
                  ) : (
                    pendingOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        currentAccount={account || ''}
                        onApprove={handleApproveOrder}
                        onReject={handleRejectOrder}
                        onPay={handlePayForOrder}
                        onShowPaymentModal={handleShowPaymentModal}
                        onShowQR={handleShowQR}
                        onAddDeliveryEvent={handleAddDeliveryEvent}
                        onFetchDeliveryEvents={fetchDeliveryEvents}
                        deliveryEvents={selectedOrderEvents[order.id] || []}
                        getStatusIcon={getStatusIcon}
                        getStatusColor={getStatusColor}
                        userRole="seller"
                      />
                    ))
                  )}
                </>
              )}

              {activeTab === 'payment-due' && (
                <>
                  {approvedOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No payments due</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        All approved orders have been paid.
                      </p>
                    </div>
                  ) : (
                    approvedOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        currentAccount={account || ''}
                        onApprove={handleApproveOrder}
                        onReject={handleRejectOrder}
                        onPay={handlePayForOrder}
                        onShowPaymentModal={handleShowPaymentModal}
                        onShowQR={handleShowQR}
                        onAddDeliveryEvent={handleAddDeliveryEvent}
                        onFetchDeliveryEvents={fetchDeliveryEvents}
                        deliveryEvents={selectedOrderEvents[order.id] || []}
                        getStatusIcon={getStatusIcon}
                        getStatusColor={getStatusColor}
                        userRole="buyer"
                      />
                    ))
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Payment Modal */}
        {showPaymentModal && selectedOrderForPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
              <div className="bg-gradient-to-r from-blue-600 to-green-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">
                        Payment for Order #{selectedOrderForPayment.id}
                      </h3>
                      <p className="text-blue-100 text-sm">
                        {(selectedOrderForPayment as any).productName || `Product #${selectedOrderForPayment.productId}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowPaymentModal(false);
                      setSelectedOrderForPayment(null);
                    }}
                    className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                <UPIPayment
                  orderId={selectedOrderForPayment.id}
                  amount={parseFloat(ethers.formatEther(selectedOrderForPayment.totalPrice.toString()))}
                  onPaymentSuccess={handleUPIPaymentSuccess}
                  onPaymentError={handleUPIPaymentError}
                  onETHPayment={(orderId, totalPrice) => {
                    handlePayForOrder(orderId, totalPrice);
                    setShowPaymentModal(false);
                    setSelectedOrderForPayment(null);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* QR Code Modal */}
        {showQRModal && selectedOrderForQR && (
          <OrderTrackingQR
            isOpen={showQRModal}
            onClose={() => {
              setShowQRModal(false);
              setSelectedOrderForQR(null);
            }}
            orderId={selectedOrderForQR.id}
          />
        )}
      </div>
    </div>
  );
}

// Order Card Component
function OrderCard({
  order,
  currentAccount,
  onReject,
  onShowPaymentModal,
  onShowQR,
  onAddDeliveryEvent,
  onFetchDeliveryEvents,
  deliveryEvents,
  getStatusColor,
  userRole
}: {
  order: Order & { productName?: string; sellerName?: string; buyerName?: string };
  currentAccount: string;
  onApprove: (orderId: number) => void;
  onReject: (orderId: number) => void;
  onPay: (orderId: number, totalPrice: number) => void;
  onShowPaymentModal: (order: Order & { productName?: string; sellerName?: string; buyerName?: string }) => void;
  onShowQR: (order: Order & { productName?: string; sellerName?: string; buyerName?: string }) => void;
  onAddDeliveryEvent: (orderId: number, status: string, description: string) => void;
  onFetchDeliveryEvents: (orderId: number) => void;
  deliveryEvents: DeliveryEvent[];
  getStatusIcon: (status: string) => JSX.Element;
  getStatusColor: (status: string) => string;
  userRole: 'buyer' | 'seller';
}) {
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventStatus, setEventStatus] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [showTimelineModal, setShowTimelineModal] = useState(false);

  const timeLeft = (deadline: number) => {
    const diff = deadline - Date.now() / 1000;
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / 3600);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} days left`;
    return `${hours} hours left`;
  };

  const getNextDeliveryEvents = () => {
    const lastEvent = deliveryEvents[deliveryEvents.length - 1];
    const lastStatus = lastEvent?.status || '';

    if (userRole === 'seller') {
      switch (lastStatus) {
        case '':
          return [{ status: 'approved', label: 'Approve Order', icon: <Check className="h-4 w-4" />, color: 'bg-green-600 hover:bg-green-700' }];
        case 'approved':
          return [{ status: 'packed', label: 'Mark as Packed', icon: <Package className="h-4 w-4" />, color: 'bg-blue-600 hover:bg-blue-700' }];
        case 'packed':
          return [{ status: 'shipped', label: 'Mark as Shipped', icon: <Truck className="h-4 w-4" />, color: 'bg-purple-600 hover:bg-purple-700' }];
        default:
          return [];
      }
    } else {
      switch (lastStatus) {
        case 'shipped':
          return [{ status: 'delivered', label: 'Mark as Delivered', icon: <MapPin className="h-4 w-4" />, color: 'bg-emerald-600 hover:bg-emerald-700' }];
        case 'delivered':
          return [{ status: 'quality_checked', label: 'Quality Check', icon: <CheckCircle className="h-4 w-4" />, color: 'bg-teal-600 hover:bg-teal-700' }];
        case 'quality_checked':
          return [{ status: 'payment_sent', label: 'Send Payment', icon: <CreditCard className="h-4 w-4" />, color: 'bg-indigo-600 hover:bg-indigo-700' }];
        default:
          return [];
      }
    }
  };

  const handleAddEvent = async () => {
    if (!eventStatus || !eventDescription.trim()) return;
    
    onAddDeliveryEvent(order.id, eventStatus, eventDescription);
    setShowEventForm(false);
    setEventStatus('');
    setEventDescription('');
  };

  React.useEffect(() => {
    if (order.id) {
      onFetchDeliveryEvents(order.id);
    }
  }, [order.id]);

  const nextEvents = getNextDeliveryEvents();

  // Determine actual status based on delivery events
  const getActualStatus = () => {
    if (deliveryEvents.length === 0) return order.status;
    
    const lastEvent = deliveryEvents[deliveryEvents.length - 1];
    switch (lastEvent.status) {
      case 'payment_sent': return 'completed';
      case 'quality_checked': return 'awaiting_payment';
      case 'delivered': return 'delivered';
      case 'shipped': return 'shipped';
      case 'packed': return 'packed';
      case 'approved': return 'approved';
      default: return order.status;
    }
  };

  const actualStatus = getActualStatus();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300">
      <div className="p-6">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Order #{order.id}
              </h3>
              <p className="text-sm text-gray-600">
                {order.productName || `Product #${order.productId}`}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  order.orderType === 'relationship' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {order.orderType === 'relationship' ? 'Relationship Order' : 'Marketplace Order'}
                </span>
              </div>
            </div>
          </div>
          <span className={`px-3 py-1.5 text-xs font-medium rounded-full ${getStatusColor(actualStatus)}`}>
            {actualStatus === 'awaiting_payment' ? 'Awaiting Payment' : 
             actualStatus.charAt(0).toUpperCase() + actualStatus.slice(1)}
          </span>
        </div>

        {/* Order Info in Horizontal Layout */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-500 uppercase font-medium">
                {userRole === 'buyer' ? 'Seller' : 'Buyer'}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-900 truncate">
              {userRole === 'buyer' 
                ? (order.sellerName || formatAddress(order.seller))
                : (order.buyerName || formatAddress(order.buyer))
              }
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-500 uppercase font-medium">Total Price</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {ethers.formatEther(order.totalPrice.toString())} ETH
            </p>
          </div>
        </div>

        {/* Secondary Info */}
        <div className="flex items-center justify-between text-sm text-gray-600 mb-4 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            <span>Qty: {order.quantity}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{new Date(order.createdAt * 1000).toLocaleDateString()}</span>
          </div>
        </div>

        {order.notes && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-gray-500" />
              <span className="text-xs font-medium text-gray-700">Notes</span>
            </div>
            <p className="text-sm text-gray-800">{order.notes}</p>
          </div>
        )}

        {/* Deadline Information */}
        {order.status === 'pending' && deliveryEvents.length === 0 && (
          <div className="mb-4 flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 px-3 py-2 rounded-lg">
            <Timer className="h-4 w-4" />
            <span>Approval deadline: {timeLeft(order.approvalDeadline)}</span>
          </div>
        )}

        {order.status === 'approved' && 
         !deliveryEvents.some(e => e.status === 'payment_sent') && 
         deliveryEvents.some(e => e.status === 'quality_checked') && (
          <div className="mb-4 flex items-center gap-2 text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded-lg">
            <Timer className="h-4 w-4" />
            <span>Payment deadline: {timeLeft(order.paymentDeadline)}</span>
          </div>
        )}

        {/* Progress and Timeline */}
        {deliveryEvents.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">
                Progress: {deliveryEvents.some(e => e.status === 'payment_sent') ? 'Completed' : `${deliveryEvents.length}/6 steps`}
              </span>
              <button
                onClick={() => setShowTimelineModal(true)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                View Details
              </button>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-gradient-to-r from-green-500 to-blue-600 h-1.5 rounded-full transition-all duration-500"
                style={{ 
                  width: `${Math.min(100, (deliveryEvents.length / 6) * 100)}%` 
                }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons - Moved to Bottom */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2 justify-end">
          {/* QR Code Button - Always show for tracking */}
          <button
            onClick={() => onShowQR(order)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-md font-medium transition-colors"
          >
            <QrCode className="h-3 w-3" />
            Track Order
          </button>

          {/* Legacy reject button for pending orders */}
          {userRole === 'seller' && order.status === 'pending' && deliveryEvents.length === 0 && (
            <button
              onClick={() => onReject(order.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded-md font-medium transition-colors"
            >
              <X className="h-3 w-3" />
              Reject
            </button>
          )}

          {/* Dynamic delivery event buttons */}
          {nextEvents.map((event) => {
            // For payment, show payment options modal
            if (event.status === 'payment_sent') {
              return (
                <div key={event.status} className="flex gap-1">
                  <button
                    onClick={() => onShowPaymentModal(order)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white rounded-md font-medium transition-colors"
                  >
                    <CreditCard className="h-3 w-3" />
                    Choose Payment
                  </button>
                </div>
              );
            }
            
            // All other events use the form
            return (
              <button
                key={event.status}
                onClick={() => {
                  setEventStatus(event.status);
                  setShowEventForm(true);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs ${event.color} text-white rounded-md font-medium transition-colors`}
              >
                {React.cloneElement(event.icon, { className: 'h-3 w-3' })}
                {event.label}
              </button>
            );
          })}

          {/* Show completed status */}
          {deliveryEvents.some(e => e.status === 'payment_sent') && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-green-700 bg-green-50 rounded-md font-medium">
              <CheckCircle className="h-3 w-3" />
              Completed
            </span>
          )}
        </div>
      </div>

      {/* Timeline Modal */}
      {showTimelineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-500 to-blue-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Truck className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">
                    Order #{order.id} Timeline
                  </h3>
                </div>
                <button
                  onClick={() => setShowTimelineModal(false)}
                  className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <DeliveryTimeline 
                events={deliveryEvents} 
                currentUserAddress={currentAccount}
              />
            </div>
          </div>
        </div>
      )}

      {/* Event Form Modal */}
      {showEventForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Add {eventStatus.charAt(0).toUpperCase() + eventStatus.slice(1).replace('_', ' ')} Event
              </h3>
              <p className="text-sm text-gray-600">Update the order progress with delivery information</p>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Description
              </label>
              <textarea
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                placeholder="Enter detailed description of this event..."
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleAddEvent}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200"
                disabled={!eventDescription.trim()}
              >
                Add Event
              </button>
              <button
                onClick={() => {
                  setShowEventForm(false);
                  setEventStatus('');
                  setEventDescription('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}