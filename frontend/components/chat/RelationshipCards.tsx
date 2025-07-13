import React from 'react';
import { Users, ArrowRight, DollarSign, Package, Building, TrendingUp, TrendingDown } from 'lucide-react';

interface Relationship {
  id: number;
  productName: string;
  currentPrice: number;
  supplierName?: string;
  buyerName?: string;
  status: string;
}

interface RelationshipCardsProps {
  relationships: Relationship[];
  userRole?: 'buyer' | 'supplier';
}

const RelationshipCards: React.FC<RelationshipCardsProps> = ({ relationships }) => {
  if (!relationships || relationships.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-600">No active relationships found</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 my-6">
      {relationships.map((relationship, index) => {
        const isBuyer = !!relationship.supplierName;
        const partnerName = relationship.supplierName || relationship.buyerName || 'Unknown Partner';
        
        return (
          <div
            key={relationship.id}
            className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
          >
            {/* Modern Header with Role Badge */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isBuyer ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-green-500 to-green-600'
                } shadow-lg`}>
                  {isBuyer ? (
                    <TrendingDown className="w-6 h-6 text-white" />
                  ) : (
                    <TrendingUp className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      {relationship.productName}
                    </h3>
                    <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                      isBuyer ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {isBuyer ? 'BUYING' : 'SELLING'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 font-medium">
                    ID #{relationship.id}
                  </p>
                </div>
              </div>
              
              <div className={`px-3 py-2 rounded-xl text-sm font-bold shadow-sm ${
                relationship.status === 'accepted' 
                  ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200' 
                  : 'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 border border-yellow-200'
              }`}>
                {relationship.status.toUpperCase()}
              </div>
            </div>

            {/* Clean Partnership Flow */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-4 mb-6">
              <div className="flex items-center justify-center space-x-4">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isBuyer ? 'bg-white border-2 border-blue-200' : 'bg-gradient-to-r from-blue-500 to-blue-600'
                  } shadow-sm`}>
                    <Building className={`w-5 h-5 ${isBuyer ? 'text-blue-600' : 'text-white'}`} />
                  </div>
                  <span className={`text-xs font-bold mt-1 ${isBuyer ? 'text-blue-600' : 'text-gray-700'}`}>
                    {isBuyer ? 'YOU' : partnerName.toUpperCase()}
                  </span>
                </div>
                
                <div className="flex flex-col items-center space-y-1">
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                  <Package className="w-4 h-4 text-gray-500" />
                </div>
                
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    !isBuyer ? 'bg-white border-2 border-green-200' : 'bg-gradient-to-r from-green-500 to-green-600'
                  } shadow-sm`}>
                    <Building className={`w-5 h-5 ${!isBuyer ? 'text-green-600' : 'text-white'}`} />
                  </div>
                  <span className={`text-xs font-bold mt-1 ${!isBuyer ? 'text-green-600' : 'text-gray-700'}`}>
                    {!isBuyer ? 'YOU' : partnerName.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Key Information Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Price</span>
                </div>
                <p className="text-lg font-bold text-green-600">
                  {relationship.currentPrice.toFixed(4)} ETH
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="w-4 h-4 text-gray-600" />
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Partner</span>
                </div>
                <p className="text-sm font-bold text-gray-900 truncate">
                  {partnerName}
                </p>
              </div>
            </div>

            {/* Status Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <span className="text-xs text-gray-600 font-medium">
                {isBuyer ? 'Ready to place orders' : 'Ready to receive orders'}
              </span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600 font-bold">ACTIVE</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RelationshipCards;