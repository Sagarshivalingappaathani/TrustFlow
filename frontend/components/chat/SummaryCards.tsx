import React from 'react';
import { DollarSign, Package, TrendingUp, TrendingDown, Users, ShoppingCart, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface SummaryCardsProps {
  data: {
    totalRevenue?: number;
    totalSpending?: number;
    netProfit?: number;
    inventoryValue?: number;
    totalProducts?: number;
    totalTransactions?: number;
    relationshipCount?: number;
  };
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ data }) => {
  const cards = [
    {
      title: 'Total Revenue',
      value: data.totalRevenue || 0,
      suffix: 'ETH',
      icon: DollarSign,
      color: 'green',
      trend: data.totalRevenue && data.totalRevenue > 0 ? 'up' : 'neutral'
    },
    {
      title: 'Net Profit',
      value: data.netProfit !== undefined ? data.netProfit : ((data.totalRevenue || 0) - (data.totalSpending || 0)),
      suffix: 'ETH',
      icon: TrendingUp,
      color: (data.netProfit !== undefined ? data.netProfit : ((data.totalRevenue || 0) - (data.totalSpending || 0))) > 0 ? 'green' : 'red',
      trend: (data.netProfit !== undefined ? data.netProfit : ((data.totalRevenue || 0) - (data.totalSpending || 0))) > 0 ? 'up' : 'down'
    },
    {
      title: 'Inventory Value',
      value: data.inventoryValue || 0,
      suffix: 'ETH',
      icon: Package,
      color: 'blue',
      trend: 'neutral'
    },
    {
      title: 'Total Products',
      value: data.totalProducts || 0,
      suffix: '',
      icon: Package,
      color: 'purple',
      trend: 'neutral'
    },
    {
      title: 'Transactions',
      value: data.totalTransactions || 0,
      suffix: '',
      icon: ShoppingCart,
      color: 'indigo',
      trend: 'neutral'
    },
    {
      title: 'Relationships',
      value: data.relationshipCount || 0,
      suffix: '',
      icon: Users,
      color: 'orange',
      trend: 'neutral'
    }
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return {
          bg: 'bg-green-50',
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          text: 'text-green-900',
          border: 'border-green-200'
        };
      case 'red':
        return {
          bg: 'bg-red-50',
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          text: 'text-red-900',
          border: 'border-red-200'
        };
      case 'blue':
        return {
          bg: 'bg-blue-50',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          text: 'text-blue-900',
          border: 'border-blue-200'
        };
      case 'purple':
        return {
          bg: 'bg-purple-50',
          iconBg: 'bg-purple-100',
          iconColor: 'text-purple-600',
          text: 'text-purple-900',
          border: 'border-purple-200'
        };
      case 'indigo':
        return {
          bg: 'bg-indigo-50',
          iconBg: 'bg-indigo-100',
          iconColor: 'text-indigo-600',
          text: 'text-indigo-900',
          border: 'border-indigo-200'
        };
      case 'orange':
        return {
          bg: 'bg-orange-50',
          iconBg: 'bg-orange-100',
          iconColor: 'text-orange-600',
          text: 'text-orange-900',
          border: 'border-orange-200'
        };
      default:
        return {
          bg: 'bg-gray-50',
          iconBg: 'bg-gray-100',
          iconColor: 'text-gray-600',
          text: 'text-gray-900',
          border: 'border-gray-200'
        };
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-6">
      {cards.map((card, index) => {
        const colors = getColorClasses(card.color);
        const Icon = card.icon;
        const TrendIcon = card.trend === 'up' ? ArrowUpRight : card.trend === 'down' ? ArrowDownRight : null;
        
        return (
          <div
            key={index}
            className={`${colors.bg} ${colors.border} border rounded-xl p-6 hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-default`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                <div className="flex items-baseline space-x-2">
                  <p className={`text-2xl font-bold ${colors.text}`}>
                    {typeof card.value === 'number' ? card.value.toFixed(card.suffix === 'ETH' ? 4 : 0) : card.value}
                  </p>
                  {card.suffix && (
                    <span className="text-sm font-medium text-gray-500">{card.suffix}</span>
                  )}
                </div>
                {TrendIcon && (
                  <div className="flex items-center mt-1">
                    <TrendIcon className={`w-4 h-4 ${card.trend === 'up' ? 'text-green-500' : 'text-red-500'}`} />
                    <span className={`text-xs ml-1 ${card.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {card.trend === 'up' ? 'Profitable' : 'Loss'}
                    </span>
                  </div>
                )}
              </div>
              <div className={`${colors.iconBg} p-3 rounded-lg`}>
                <Icon className={`w-6 h-6 ${colors.iconColor}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SummaryCards;