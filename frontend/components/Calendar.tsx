'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Package, Users, Clock, Calendar as CalendarIcon, Info } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'product' | 'relationship_start' | 'relationship_end';
  data: any;
}

interface CalendarProps {
  events?: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}

export default function Calendar({ events = [], onEventClick }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipDate, setTooltipDate] = useState<Date | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    while (current <= lastDay || current.getDay() !== 0) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      event.date.toDateString() === date.toDateString()
    );
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSameMonth = (date: Date, currentDate: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'product':
        return <Package className="w-3 h-3" />;
      case 'relationship_start':
        return <Users className="w-3 h-3" />;
      case 'relationship_end':
        return <Clock className="w-3 h-3" />;
      default:
        return <CalendarIcon className="w-3 h-3" />;
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'product':
        return 'bg-blue-500';
      case 'relationship_start':
        return 'bg-green-500';
      case 'relationship_end':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getEventDescription = (event: CalendarEvent) => {
    switch (event.type) {
      case 'product':
        return `Product "${event.data.name}" was created with ${event.data.quantity} units at ${event.data.pricePerUnit / 1e18} ETH per unit`;
      case 'relationship_start':
        return `Business relationship started for product ID ${event.data.productId} (Status: ${event.data.status})`;
      case 'relationship_end':
        return `Business relationship ends for product ID ${event.data.productId} (Status: ${event.data.status})`;
      default:
        return event.title;
    }
  };

  const formatEventsSummary = (dayEvents: CalendarEvent[]) => {
    if (dayEvents.length === 0) return null;
    
    const productEvents = dayEvents.filter(e => e.type === 'product');
    const relationshipStartEvents = dayEvents.filter(e => e.type === 'relationship_start');
    const relationshipEndEvents = dayEvents.filter(e => e.type === 'relationship_end');
    
    const summary = [];
    
    if (productEvents.length > 0) {
      summary.push(`${productEvents.length} product${productEvents.length > 1 ? 's' : ''} created`);
    }
    
    if (relationshipStartEvents.length > 0) {
      summary.push(`${relationshipStartEvents.length} relationship${relationshipStartEvents.length > 1 ? 's' : ''} started`);
    }
    
    if (relationshipEndEvents.length > 0) {
      summary.push(`${relationshipEndEvents.length} relationship${relationshipEndEvents.length > 1 ? 's' : ''} ending`);
    }
    
    return summary.join(', ');
  };

  const handleDayClick = (day: Date, event: React.MouseEvent) => {
    const dayEvents = getEventsForDate(day);
    
    // Only show tooltip if there are events
    if (dayEvents.length > 0) {
      const rect = event.currentTarget.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      });
      setTooltipDate(day);
      setShowTooltip(true);
    } else {
      setShowTooltip(false);
    }
    
    setSelectedDate(day);
  };

  const closeTooltip = () => {
    setShowTooltip(false);
    setTooltipDate(null);
  };

  const days = getDaysInMonth(currentDate);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-blue-500 to-green-500 p-2 rounded-lg">
            <CalendarIcon className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Calendar</h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="px-4 py-2 text-lg font-semibold text-gray-900">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </div>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {daysOfWeek.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const dayEvents = getEventsForDate(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isTodayDate = isToday(day);
          const hasEvents = dayEvents.length > 0;
          
          // Group events by type for dot display
          const productEvents = dayEvents.filter(e => e.type === 'product');
          const relationshipStartEvents = dayEvents.filter(e => e.type === 'relationship_start');
          const relationshipEndEvents = dayEvents.filter(e => e.type === 'relationship_end');
          
          return (
            <div
              key={index}
              className={`h-[80px] p-2 border border-gray-100 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors relative ${
                !isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
              } ${isTodayDate ? 'bg-blue-50 border-blue-200' : ''} ${
                hasEvents ? 'hover:shadow-md' : ''
              }`}
              onClick={(e) => handleDayClick(day, e)}
            >
              <div className={`text-sm font-medium mb-2 ${isTodayDate ? 'text-blue-600' : ''}`}>
                {day.getDate()}
              </div>
              
              {/* Event dots */}
              {hasEvents && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {/* Product dots (blue) */}
                  {productEvents.map((_, index) => (
                    <div
                      key={`product-${index}`}
                      className="w-2 h-2 bg-blue-500 rounded-full"
                      title="Product created"
                    />
                  ))}
                  
                  {/* Relationship start dots (green) */}
                  {relationshipStartEvents.map((_, index) => (
                    <div
                      key={`rel-start-${index}`}
                      className="w-2 h-2 bg-green-500 rounded-full"
                      title="Relationship started"
                    />
                  ))}
                  
                  {/* Relationship end dots (red) */}
                  {relationshipEndEvents.map((_, index) => (
                    <div
                      key={`rel-end-${index}`}
                      className="w-2 h-2 bg-red-500 rounded-full"
                      title="Relationship ending"
                    />
                  ))}
                  
                  {/* Show count if too many events */}
                  {dayEvents.length > 6 && (
                    <div className="text-xs text-gray-500 font-medium">
                      +{dayEvents.length - 6}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Product Created</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Relationship Start</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Relationship End</span>
          </div>
        </div>
      </div>

      {/* Click outside to close tooltip */}
      {showTooltip && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={closeTooltip}
        />
      )}

      {/* Tooltip */}
      {showTooltip && tooltipDate && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: 'translateX(-50%) translateY(calc(-100% - 8px))',
            width: '320px',
            maxHeight: '240px',
            minHeight: '120px'
          }}
        >
          {/* Header with close button */}
          <div className="px-3 py-2 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-t-lg flex-shrink-0 flex items-center justify-between">
            <div className="font-medium text-sm">
              {tooltipDate.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              })}
            </div>
            <button 
              onClick={closeTooltip}
              className="text-white hover:text-gray-200 transition-colors"
            >
              ✕
            </button>
          </div>
          
          {(() => {
            const dayEvents = getEventsForDate(tooltipDate);
            const summary = formatEventsSummary(dayEvents);
            
            return (
              <div className="flex flex-col h-full" style={{ height: 'calc(240px - 48px)' }}>
                {/* Summary - Fixed Height */}
                <div className="px-3 py-2 border-b border-gray-100 flex-shrink-0">
                  <div className="text-sm font-semibold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                    {summary}
                  </div>
                </div>
                
                {/* Events List - Scrollable Area */}
                <div className="flex-1 overflow-y-auto px-3 py-2">
                  <div className="space-y-2">
                    {dayEvents.map((event, index) => (
                      <div key={index} className="bg-gray-50 rounded-md p-2 text-xs">
                        <div className="flex items-start gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${
                            event.type === 'product' ? 'bg-blue-500' :
                            event.type === 'relationship_start' ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {event.title}
                            </div>
                            <div className="text-gray-600 mt-0.5 line-clamp-2">
                              {getEventDescription(event)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Footer - Only show if scrollable */}
                {dayEvents.length > 4 && (
                  <div className="px-3 py-1 border-t border-gray-100 text-center flex-shrink-0">
                    <div className="text-xs text-gray-400">
                      ↕ Scroll for more
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}