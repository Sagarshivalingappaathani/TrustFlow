import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, paymentMethod, paymentId, transactionHash } = body;

    console.log('🔄 Completing order...');
    console.log('Order ID:', orderId);
    console.log('Payment Method:', paymentMethod);
    console.log('Payment ID:', paymentId);
    
    if (paymentMethod === 'UPI') {
      console.log('✅ Order completed via UPI payment');
      
      // In a real app, you would:
      // 1. Update database to mark order as completed
      // 2. Send notifications to buyer and seller
      // 3. Update blockchain state if needed
      // 4. Generate receipt/invoice
      
      const completionRecord = {
        orderId,
        paymentMethod: 'UPI',
        paymentId,
        status: 'completed',
        completedAt: new Date().toISOString(),
        demo: true
      };

      return NextResponse.json({
        success: true,
        message: 'Order completed successfully via UPI',
        record: completionRecord
      });
      
    } else if (paymentMethod === 'ETH') {
      console.log('✅ Order completed via ETH payment');
      console.log('Transaction Hash:', transactionHash);
      
      const completionRecord = {
        orderId,
        paymentMethod: 'ETH',
        transactionHash,
        status: 'completed',
        completedAt: new Date().toISOString()
      };

      return NextResponse.json({
        success: true,
        message: 'Order completed successfully via ETH',
        record: completionRecord
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid payment method'
    }, { status: 400 });

  } catch (error) {
    console.error('Order completion error:', error);
    return NextResponse.json({
      success: false,
      error: 'Order completion failed'
    }, { status: 500 });
  }
}