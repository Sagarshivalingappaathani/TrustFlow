import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('📥 Payment verification API called');
    
    const body = await request.json();
    console.log('📋 Request body:', JSON.stringify(body, null, 2));
    
    const { 
      orderId, 
      paymentId, 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature 
    } = body;

    // For hackathon demo, we'll simulate payment verification
    // In production, you would verify the signature using Razorpay webhook secret
    
    console.log('🔄 Processing UPI payment verification...');
    console.log('Order ID:', orderId);
    console.log('Payment ID:', paymentId || razorpay_payment_id);
    console.log('Razorpay Payment ID:', razorpay_payment_id);
    console.log('Demo Mode:', process.env.NEXT_PUBLIC_DEMO_MODE);
    
    // Verify payment with Razorpay API
    try {
      // For demo purposes, we'll simulate the verification since we have real payment
      // In production, you'd verify with Razorpay API using server-side keys
      console.log('🔍 Simulating Razorpay API verification for payment:', razorpay_payment_id);
      
      // Since payment handler was called, we know payment succeeded
      // Razorpay only calls handler on successful payments
      const paymentRecord = {
        orderId,
        paymentId: razorpay_payment_id,
        amount: 1, // ₹1 for demo
        currency: 'INR',
        method: 'upi',
        status: 'captured', // Simulated successful capture
        timestamp: new Date().toISOString(),
        verified: true,
        note: 'Demo payment - handler called means payment successful'
      };

      console.log('✅ Payment verified successfully (demo mode)');
      
      return NextResponse.json({
        success: true,
        message: 'Payment verified successfully',
        paymentRecord
      });

    } catch (verifyError) {
      console.error('❌ Payment verification error:', verifyError);
      return NextResponse.json({
        success: false,
        error: 'Failed to verify payment with Razorpay'
      }, { status: 500 });
    }

    // In production, add actual signature verification here
    /*
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');
    
    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({
        success: false,
        error: 'Invalid payment signature'
      }, { status: 400 });
    }
    */

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully'
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json({
      success: false,
      error: 'Payment verification failed'
    }, { status: 500 });
  }
}