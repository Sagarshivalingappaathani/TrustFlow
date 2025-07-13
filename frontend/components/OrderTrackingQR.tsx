'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { QrCode, ExternalLink, Copy, Download } from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from 'react-hot-toast';

interface OrderTrackingQRProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
}

const OrderTrackingQR: React.FC<OrderTrackingQRProps> = ({
  isOpen,
  onClose,
  orderId
}) => {
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');
  const trackingUrl = `https://order-tracking-plum.vercel.app/track/${orderId}`;

  useEffect(() => {
    if (isOpen && orderId) {
      generateQRCode();
    }
  }, [isOpen, orderId]);

  const generateQRCode = async () => {
    try {
      const qrDataURL = await QRCode.toDataURL(trackingUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeDataURL(qrDataURL);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate QR code');
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(trackingUrl);
      toast.success('Tracking URL copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy URL');
    }
  };

  const openTrackingPage = () => {
    window.open(trackingUrl, '_blank');
  };

  const downloadQR = () => {
    if (!qrCodeDataURL) return;
    
    const link = document.createElement('a');
    link.download = `order-${orderId}-qr.png`;
    link.href = qrCodeDataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR code downloaded!');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <QrCode className="w-5 h-5" />
            <span>Order Tracking QR Code</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Order Info */}
          <div className="text-center">
            <p className="text-sm text-gray-600">Order ID</p>
            <p className="text-lg font-semibold">#{orderId}</p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            {qrCodeDataURL ? (
              <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
                <img 
                  src={qrCodeDataURL} 
                  alt={`QR Code for Order #${orderId}`}
                  className="w-48 h-48"
                />
              </div>
            ) : (
              <div className="w-48 h-48 flex items-center justify-center border-2 border-gray-200 rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Generating QR...</p>
                </div>
              </div>
            )}
          </div>


          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button 
              onClick={downloadQR}
              variant="default"
              className="flex-1"
              disabled={!qrCodeDataURL}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            
            <Button 
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderTrackingQR;