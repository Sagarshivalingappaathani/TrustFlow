import React from 'react';
import { Package, DollarSign, Hash, Layers } from 'lucide-react';

interface Product {
  name: string;
  quantity: number;
  pricePerUnit: number;
  totalValue: number;
}

interface ProductGridProps {
  products: Product[];
}

const ProductGrid: React.FC<ProductGridProps> = ({ products }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-6">
      {products.map((product, index) => (
        <div
          key={index}
          className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300"
        >
          {/* Product Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">{product.name}</h3>
                <p className="text-xs text-gray-500">Product</p>
              </div>
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-3">
            {/* Quantity */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Quantity</span>
              </div>
              <span className="font-medium text-gray-900">{product.quantity} units</span>
            </div>

            {/* Price per Unit */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Hash className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Unit Price</span>
              </div>
              <span className="font-medium text-gray-900">{product.pricePerUnit.toFixed(4)} ETH</span>
            </div>

            {/* Total Value */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Total Value</span>
              </div>
              <span className="font-bold text-green-600">
                {product.totalValue ? product.totalValue.toFixed(4) : (product.quantity * product.pricePerUnit).toFixed(4)} ETH
              </span>
            </div>
          </div>

          {/* Value Bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(((product.totalValue || (product.quantity * product.pricePerUnit)) / Math.max(...products.map(p => p.totalValue || (p.quantity * p.pricePerUnit)))) * 100, 100)}%` 
                }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Relative value indicator</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductGrid;