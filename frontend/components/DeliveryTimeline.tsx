'use client';

import React from 'react';
import { 
  CheckCircle, 
  Clock, 
  Package, 
  Truck, 
  MapPin, 
  CreditCard,
  User,
  Calendar,
  ChevronRight,
  Award,
  Shield
} from 'lucide-react';
import { DeliveryEvent } from '@/lib/contract';
import { formatAddress } from '@/lib/web3';

interface DeliveryTimelineProps {
  events: DeliveryEvent[];
  currentUserAddress: string;
}

const getEventIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'approved':
      return <Shield className="h-5 w-5" />;
    case 'packed':
      return <Package className="h-5 w-5" />;
    case 'shipped':
      return <Truck className="h-5 w-5" />;
    case 'delivered':
      return <MapPin className="h-5 w-5" />;
    case 'quality_checked':
      return <Award className="h-5 w-5" />;
    case 'payment_sent':
      return <CreditCard className="h-5 w-5" />;
    default:
      return <Clock className="h-5 w-5" />;
  }
};

const getEventColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'approved':
      return {
        bg: 'bg-gradient-to-br from-green-50 to-emerald-100',
        icon: 'text-green-600',
        border: 'border-green-200',
        dot: 'bg-green-500'
      };
    case 'packed':
      return {
        bg: 'bg-gradient-to-br from-blue-50 to-cyan-100',
        icon: 'text-blue-600',
        border: 'border-blue-200',
        dot: 'bg-blue-500'
      };
    case 'shipped':
      return {
        bg: 'bg-gradient-to-br from-purple-50 to-indigo-100',
        icon: 'text-purple-600',
        border: 'border-purple-200',
        dot: 'bg-purple-500'
      };
    case 'delivered':
      return {
        bg: 'bg-gradient-to-br from-emerald-50 to-teal-100',
        icon: 'text-emerald-600',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500'
      };
    case 'quality_checked':
      return {
        bg: 'bg-gradient-to-br from-amber-50 to-yellow-100',
        icon: 'text-amber-600',
        border: 'border-amber-200',
        dot: 'bg-amber-500'
      };
    case 'payment_sent':
      return {
        bg: 'bg-gradient-to-br from-indigo-50 to-blue-100',
        icon: 'text-indigo-600',
        border: 'border-indigo-200',
        dot: 'bg-indigo-500'
      };
    default:
      return {
        bg: 'bg-gradient-to-br from-gray-50 to-slate-100',
        icon: 'text-gray-600',
        border: 'border-gray-200',
        dot: 'bg-gray-400'
      };
  }
};

const getEventTitle = (status: string) => {
  switch (status.toLowerCase()) {
    case 'approved':
      return 'Order Approved';
    case 'packed':
      return 'Package Prepared';
    case 'shipped':
      return 'In Transit';
    case 'delivered':
      return 'Package Delivered';
    case 'quality_checked':
      return 'Quality Verified';
    case 'payment_sent':
      return 'Payment Completed';
    default:
      return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
};

const getEventSubtitle = (status: string) => {
  switch (status.toLowerCase()) {
    case 'approved':
      return 'Seller has approved your order';
    case 'packed':
      return 'Order has been packed and ready to ship';
    case 'shipped':
      return 'Package is on its way to destination';
    case 'delivered':
      return 'Package successfully delivered';
    case 'quality_checked':
      return 'Quality inspection completed';
    case 'payment_sent':
      return 'Transaction completed successfully';
    default:
      return 'Order status updated';
  }
};

export default function DeliveryTimeline({ events, currentUserAddress }: DeliveryTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-gradient-to-br from-gray-100 to-gray-200 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Timeline Events</h3>
        <p className="text-sm text-gray-500">Order events will appear here as they happen</p>
      </div>
    );
  }

  // Sort events by timestamp (newest first for better UX)
  const sortedEvents = [...events].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center pb-4 border-b border-gray-100">
        <div className="inline-flex items-center gap-3 bg-gradient-to-r from-green-50 to-blue-50 px-4 py-2 rounded-full">
          <Truck className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">Order Journey</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative space-y-6">
        {sortedEvents.map((event, index) => {
          const colors = getEventColor(event.status);
          const isLast = index === sortedEvents.length - 1;
          
          return (
            <div key={index} className="relative">
              {/* Connecting Line */}
              {!isLast && (
                <div className="absolute left-6 top-16 w-0.5 h-6 bg-gradient-to-b from-gray-300 to-gray-200" />
              )}
              
              {/* Event Card */}
              <div className="relative flex items-start gap-4">
                {/* Icon Container */}
                <div className="relative z-10 flex-shrink-0">
                  <div className={`w-12 h-12 rounded-full border-2 ${colors.border} ${colors.bg} flex items-center justify-center shadow-sm`}>
                    <div className={colors.icon}>
                      {getEventIcon(event.status)}
                    </div>
                  </div>
                  {/* Pulse animation for latest event */}
                  {index === 0 && (
                    <div className={`absolute inset-0 rounded-full ${colors.dot} opacity-75 animate-ping`} />
                  )}
                </div>
                
                {/* Event Content */}
                <div className="flex-1 min-w-0">
                  <div className={`${colors.bg} border ${colors.border} rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200`}>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="text-base font-semibold text-gray-900 mb-1">
                          {getEventTitle(event.status)}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2">
                          {getEventSubtitle(event.status)}
                        </p>
                        {event.description && (
                          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                            <p className="text-sm text-gray-700 italic">
                              "{event.description}"
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Status Badge */}
                      <div className={`ml-4 px-3 py-1 rounded-full text-xs font-medium ${colors.icon} bg-white/50 backdrop-blur-sm border border-white/20`}>
                        {event.status.replace('_', ' ').toUpperCase()}
                      </div>
                    </div>
                    
                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <div className="flex items-center gap-4">
                        {/* Timestamp */}
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            {new Date(event.timestamp * 1000).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span>
                            {new Date(event.timestamp * 1000).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                      
                      {/* Updated By */}
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        <span className="font-medium">
                          {event.updatedBy.toLowerCase() === currentUserAddress.toLowerCase() 
                            ? 'You' 
                            : formatAddress(event.updatedBy)
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Footer */}
      <div className="text-center pt-4">
        <div className="inline-flex items-center gap-2 text-xs text-gray-500">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span>Timeline updates in real-time</span>
        </div>
      </div>
    </div>
  );
}