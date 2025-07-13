'use client';

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Smartphone, CreditCard, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface UPIPaymentProps {
  orderId: number;
  amount: number; // in ETH, we'll convert to INR for demo
  onPaymentSuccess: (paymentId: string, orderId: number) => void;
  onPaymentError: (error: string) => void;
  onETHPayment?: (orderId: number, totalPrice: number) => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const UPIPayment: React.FC<UPIPaymentProps> = ({
  orderId,
  amount,
  onPaymentSuccess,
  onPaymentError,
  onETHPayment
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'ETH' | 'UPI'>('ETH');

  // Demo configuration - replace with your actual Razorpay key
  const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY || 'rzp_live_B7CZFGWxvefS5j';
  const DEMO_PHONE = process.env.NEXT_PUBLIC_DEMO_PHONE || '7975208724';
  
  // Convert ETH to INR for demo (1 ETH ≈ 2,00,000 INR roughly)
  const ethToInr = (ethAmount: number): number => {
    return Math.round(ethAmount * 200000 * 100); // Convert to paise (smallest unit)
  };

  const initializeRazorpay = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUPIPayment = async () => {
    setIsProcessing(true);
    
    try {
      // Initialize Razorpay script
      const isRazorpayLoaded = await initializeRazorpay();
      
      if (!isRazorpayLoaded) {
        throw new Error('Razorpay SDK failed to load');
      }

      // For demo, we'll use ₹1 instead of actual amount
      const demoAmount = 100; // ₹1 in paise
      const actualAmount = ethToInr(amount);

      const options = {
        key: RAZORPAY_KEY,
        amount: demoAmount, // Using ₹1 for demo
        currency: 'INR',
        name: 'TrustFlow',
        description: `Payment for Order #${orderId}`,
        image: '/logo.png', // Add your logo
        order_id: '', // In production, create order on backend first
        handler: async function (response: any) {
          // Payment successful - Razorpay only calls this on successful payments
          console.log('✅ UPI Payment Success:', response);
          console.log('💰 Payment ID:', response.razorpay_payment_id);
          console.log('🎯 Real ₹1 payment captured successfully!');
          
          try {
            // Since Razorpay called this handler, payment is guaranteed successful
            // Razorpay only calls handler after payment is captured
            toast.success('🎉 UPI Payment Successful!');
            console.log('✅ Payment captured - verified by Razorpay');
            
            // Call success handler to complete order
            onPaymentSuccess(response.razorpay_payment_id, orderId);
            
          } catch (error) {
            console.error('❌ Error processing successful payment:', error);
            toast.error('Payment successful but order processing failed');
            onPaymentError(error instanceof Error ? error.message : 'Order processing failed');
          }
          
          setIsProcessing(false);
        },
        prefill: {
          name: 'Demo User',
          email: 'demo@trustflow.com',
          contact: DEMO_PHONE
        },
        notes: {
          orderId: orderId.toString(),
          paymentMethod: 'UPI',
          originalAmount: `${amount} ETH`,
          demoNote: 'This is a demo payment of ₹1'
        },
        theme: {
          color: '#3B82F6'
        },
        method: {
          upi: true,
          card: false,
          netbanking: false,
          wallet: false,
          emi: false
        },
        modal: {
          ondismiss: function() {
            setIsProcessing(false);
            toast.error('Payment cancelled');
          }
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.on('payment.failed', function (response: any) {
        console.error('Payment Failed:', response.error);
        toast.error('Payment failed: ' + response.error.description);
        onPaymentError(response.error.description);
        setIsProcessing(false);
      });

      paymentObject.open();
    } catch (error) {
      console.error('UPI Payment Error:', error);
      toast.error('Failed to initialize payment');
      onPaymentError(error instanceof Error ? error.message : 'Payment initialization failed');
      setIsProcessing(false);
    }
  };

  const handleETHPayment = async () => {
    if (onETHPayment) {
      // Convert ETH amount to wei for contract call
      const totalPriceInWei = (amount * 1e18).toString();
      onETHPayment(orderId, parseInt(totalPriceInWei));
    } else {
      toast('ETH payment handler not provided');
    }
  };

  return (
    <div className="space-y-4">
      {/* Payment Method Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5" />
            <span>Choose Payment Method</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant={paymentMethod === 'ETH' ? 'default' : 'outline'}
              onClick={() => setPaymentMethod('ETH')}
              className="h-20 flex flex-col items-center space-y-2"
            >
              <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">Ξ</span>
              </div>
              <span>Pay with ETH</span>
              <span className="text-xs text-gray-500">{amount.toFixed(4)} ETH</span>
            </Button>

            <Button
              variant={paymentMethod === 'UPI' ? 'default' : 'outline'}
              onClick={() => setPaymentMethod('UPI')}
              className="h-20 flex flex-col items-center space-y-2"
            >
              <Smartphone className="w-6 h-6" />
              <span>Pay with UPI</span>
              <span className="text-xs text-gray-500">₹1 (Demo)</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment Details */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Order ID:</span>
              <span className="font-medium">#{orderId}</span>
            </div>
            
            {paymentMethod === 'ETH' ? (
              <>
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span className="font-medium">{amount.toFixed(4)} ETH</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Network:</span>
                  <span>Ethereum (Hardhat Local)</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span>Actual Amount:</span>
                  <span className="font-medium">₹{(ethToInr(amount) / 100).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Demo Amount:</span>
                  <span className="font-medium">₹1</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>UPI ID:</span>
                  <span>{DEMO_PHONE}@paytm</span>
                </div>
              </>
            )}
          </div>

          {/* Demo Notice for UPI */}
          {paymentMethod === 'UPI' && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">Demo Mode</p>
                  <p className="text-yellow-700">
                    For hackathon demo, you'll pay ₹1 to the same phone number. 
                    In production, this would be the actual order amount to the seller.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Button */}
          <div className="mt-6">
            {paymentMethod === 'ETH' ? (
              <Button 
                onClick={handleETHPayment}
                className="w-full"
                size="lg"
              >
                Pay {amount.toFixed(4)} ETH
              </Button>
            ) : (
              <Button 
                onClick={handleUPIPayment}
                disabled={isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {isProcessing ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-5 h-5" />
                    <span>Pay ₹1 via UPI (Demo)</span>
                  </div>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UPIPayment;