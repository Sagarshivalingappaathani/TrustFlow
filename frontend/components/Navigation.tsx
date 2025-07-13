'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWeb3 } from '@/contexts/Web3Context';
import { formatAddress } from '@/lib/web3';
import {
  Truck,
  Home,
  Package,
  Users,
  ShoppingCart,
  History,
  BarChart3,
  Menu,
  X,
  Wallet,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  MessageCircle
} from 'lucide-react';

const Navigation = () => {
  const pathname = usePathname();
  const { isConnected, account, connectWallet, disconnect, loading, balance, accountSwitching } = useWeb3();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Products', href: '/products', icon: Package },
    { name: 'Relationships', href: '/relationships', icon: Users },
    { name: 'Orders', href: '/orders', icon: ClipboardList },
    { name: 'Marketplace', href: '/marketplace', icon: ShoppingCart },
    { name: 'Transactions', href: '/transactions', icon: History },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'AI Chat', href: '/chat', icon: MessageCircle },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 ${isSidebarOpen ? 'lg:w-72' : 'lg:w-20'} transition-all duration-300 ease-in-out z-50`}>
        <div className="flex flex-col flex-grow bg-gradient-to-b from-gray-50 to-white shadow-xl border-r border-gray-200 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-6 py-6">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="bg-gradient-to-r from-blue-600 to-green-600 p-3 rounded-xl shadow-lg group-hover:scale-105 transition-transform duration-200">
                <Truck className="w-6 h-6 text-white" />
              </div>
              {isSidebarOpen && (
                <div>
                  <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">TrustFlow</span>
                  <div className="text-xs text-gray-500 font-medium">Supply Chain Platform</div>
                </div>
              )}
            </Link>
          </div>

          {/* Sidebar Toggle */}
          <div className="flex justify-end px-6 mb-6">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 shadow-sm border border-gray-200"
            >
              {isSidebarOpen ? (
                <ChevronLeft className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 space-y-2">
            {navigationItems.map((item, index) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 relative ${active
                      ? 'bg-gradient-to-r from-blue-500 to-green-500 text-white shadow-lg transform scale-105'
                      : 'text-gray-700 hover:bg-white hover:text-blue-600 hover:shadow-md hover:scale-105 border border-transparent hover:border-gray-200'
                    }`}
                  title={!isSidebarOpen ? item.name : undefined}
                >
                  {/* Active indicator */}
                  {active && (
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"></div>
                  )}

                  <Icon className={`flex-shrink-0 h-5 w-5 ${active
                      ? 'text-white'
                      : 'text-gray-500 group-hover:text-blue-500'
                    } transition-colors duration-200`} />

                  {isSidebarOpen && (
                    <span className="ml-3 font-semibold">{item.name}</span>
                  )}

                  {/* Hover effect for collapsed sidebar */}
                  {!isSidebarOpen && (
                    <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
                      {item.name}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Wallet Section */}
          <div className="flex-shrink-0 px-4 pb-6 mt-6 border-t border-gray-200 pt-6">
            {isConnected ? (
              <div className="space-y-3">
                {isSidebarOpen && (
                  <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-semibold text-gray-900">Connected</span>
                    </div>
                    <div className="text-sm font-medium text-gray-900 font-mono">
                      {formatAddress(account!)}
                    </div>
                    <div className="text-xs text-gray-600 font-semibold">
                      {parseFloat(balance).toFixed(2)} ETH
                    </div>
                  </div>
                )}
                <button
                  onClick={disconnect}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl transition-all duration-200 border border-red-200 hover:border-red-300 hover:shadow-md ${!isSidebarOpen ? 'justify-center' : ''
                    }`}
                  title={!isSidebarOpen ? 'Disconnect' : undefined}
                >
                  <LogOut className="flex-shrink-0 h-5 w-5" />
                  {isSidebarOpen && (
                    <span className="ml-3">Disconnect</span>
                  )}
                </button>
              </div>
            ) : (
              <button
                onClick={() => connectWallet()}
                disabled={loading}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium bg-gradient-to-r from-blue-600 to-green-600 text-white hover:from-blue-700 hover:to-green-700 rounded-xl transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-105 ${!isSidebarOpen ? 'justify-center' : ''
                  }`}
                title={!isSidebarOpen ? 'Connect Wallet' : undefined}
              >
                <Wallet className="flex-shrink-0 h-5 w-5" />
                {isSidebarOpen && (
                  <span className="ml-3 font-semibold">
                    {loading ? 'Connecting...' : accountSwitching ? 'Switching...' : 'Connect Wallet'}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Top Bar */}
      <div className="lg:hidden bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">TrustFlow</span>
          </Link>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <>
          {/* Overlay */}
          <div className="lg:hidden fixed inset-0 z-40 bg-gray-600 bg-opacity-75" onClick={() => setIsMobileMenuOpen(false)} />

          {/* Mobile Sidebar */}
          <div className="lg:hidden fixed inset-y-0 left-0 z-50 w-80 bg-gradient-to-b from-gray-50 to-white shadow-2xl">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <Link href="/" className="flex items-center space-x-3 group">
                  <div className="bg-gradient-to-r from-blue-600 to-green-600 p-3 rounded-xl shadow-lg group-hover:scale-105 transition-transform duration-200">
                    <Truck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">TrustFlow</span>
                    <div className="text-xs text-gray-500 font-medium">Supply Chain Platform</div>
                  </div>
                </Link>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-4 py-6 space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 relative ${active
                          ? 'bg-gradient-to-r from-blue-500 to-green-500 text-white shadow-lg'
                          : 'text-gray-700 hover:bg-white hover:text-blue-600 hover:shadow-md border border-transparent hover:border-gray-200'
                        }`}
                    >
                      {/* Active indicator */}
                      {active && (
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"></div>
                      )}

                      <Icon className={`flex-shrink-0 h-5 w-5 mr-3 ${active
                          ? 'text-white'
                          : 'text-gray-500'
                        } transition-colors duration-200`} />
                      <span className="font-semibold">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Mobile Wallet Section */}
              <div className="p-4 border-t border-gray-200">
                {isConnected ? (
                  <div className="space-y-3">
                    <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-semibold text-gray-900">Connected</span>
                      </div>
                      <div className="text-sm font-medium text-gray-900 font-mono">
                        {formatAddress(account!)}
                      </div>
                      <div className="text-xs text-gray-600 font-semibold">
                        💰 {parseFloat(balance).toFixed(4)} ETH
                      </div>
                    </div>
                    <button
                      onClick={disconnect}
                      className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl transition-all duration-200 border border-red-200 hover:border-red-300"
                    >
                      <LogOut className="h-5 w-5 mr-2" />
                      <span className="font-semibold">Disconnect</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => connectWallet()}
                    disabled={loading}
                    className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium bg-gradient-to-r from-blue-600 to-green-600 text-white hover:from-blue-700 hover:to-green-700 rounded-xl transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl"
                  >
                    <Wallet className="h-5 w-5 mr-2" />
                    <span className="font-semibold">
                      {loading ? 'Connecting...' : accountSwitching ? 'Switching...' : 'Connect Wallet'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Navigation;