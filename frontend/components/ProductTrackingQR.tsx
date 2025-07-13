'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { QrCode, Download, TreePine } from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from 'react-hot-toast';

interface ProductTrackingQRProps {
  isOpen: boolean;
  onClose: () => void;
  productId: number;
  productName?: string;
}

const ProductTrackingQR: React.FC<ProductTrackingQRProps> = ({
  isOpen,
  onClose,
  productId,
  productName
}) => {
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');
  const trackingUrl = `https://order-tracking-plum.vercel.app/product/${productId}`;

  useEffect(() => {
    if (isOpen && productId) {
      generateQRCode();
    }
  }, [isOpen, productId]);

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


  const downloadQR = () => {
    if (!qrCodeDataURL) return;
    
    const link = document.createElement('a');
    link.download = `product-${productId}-ownership-tree-qr.png`;
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
            <TreePine className="w-5 h-5 text-green-600" />
            <span>Product Ownership Tree</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Product Info */}
          <div className="text-center">
            <p className="text-sm text-gray-600">Product ID</p>
            <p className="text-lg font-semibold">#{productId}</p>
            {productName && (
              <p className="text-sm text-gray-700 mt-1">{productName}</p>
            )}
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            {qrCodeDataURL ? (
              <div className="p-4 bg-white rounded-lg border-2 border-green-200">
                <img 
                  src={qrCodeDataURL} 
                  alt={`QR Code for Product #${productId} Ownership Tree`}
                  className="w-48 h-48"
                />
              </div>
            ) : (
              <div className="w-48 h-48 flex items-center justify-center border-2 border-green-200 rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Generating QR...</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button 
              onClick={downloadQR}
              variant="outline"
              className="flex-1 border-green-200 text-green-700 hover:bg-green-50"
              disabled={!qrCodeDataURL}
            >
              <Download className="w-4 h-4 mr-2" />
              Download QR
            </Button>
          </div>

          {/* Close Button */}
          <Button 
            onClick={onClose}
            variant="secondary"
            className="w-full"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductTrackingQR;