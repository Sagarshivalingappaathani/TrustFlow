'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Truck, 
  Shield, 
  Zap, 
  Users, 
  BarChart3, 
  CheckCircle,
  ArrowRight,
  Globe,
  Lock,
  Cpu,
  Star,
  TrendingUp,
  Play,
  MessageSquare
} from 'lucide-react';

export default function Home() {
  const features = [
    {
      icon: Shield,
      title: 'Blockchain Security',
      description: 'Immutable records and smart contracts ensure data integrity and trust.',
      color: 'text-blue-600'
    },
    {
      icon: Zap,
      title: 'AI-Powered Automation',
      description: 'Intelligent agents optimize supply chain operations and decision-making.',
      color: 'text-green-600'
    },
    {
      icon: Users,
      title: 'B2B Relationships',
      description: 'Streamlined supplier-buyer relationships with automated negotiations.',
      color: 'text-purple-600'
    },
    {
      icon: BarChart3,
      title: 'Real-time Analytics',
      description: 'Comprehensive dashboards provide insights into supply chain performance.',
      color: 'text-orange-600'
    }
  ];

  const benefits = [
    'Reduce supply chain costs by up to 30%',
    'Improve transparency and traceability',
    'Automate compliance and documentation',
    'Enhance supplier relationships',
    'Enable real-time tracking and updates',
    'Secure transactions with blockchain technology'
  ];

  const useCases = [
    {
      title: 'Enterprises',
      description: 'Large corporations managing complex global supply chains',
      icon: Globe
    },
    {
      title: 'SMBs',
      description: 'Small and medium businesses looking to scale efficiently',
      icon: Users
    },
    {
      title: 'Consumers',
      description: 'End consumers seeking product authenticity and transparency',
      icon: Shield
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="relative bg-gradient-to-br from-blue-50 via-white to-green-50 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-green-600 p-3 rounded-xl shadow-lg hover:scale-105 transition-transform duration-200">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">TrustFlow</span>
                <div className="text-xs text-gray-500 font-medium">Supply Chain Platform</div>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <Link
                href="/dashboard"
                className="text-gray-700 hover:text-blue-600 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:bg-blue-50"
              >
                Dashboard
              </Link>
              <Link
                href="/chat"
                className="text-gray-700 hover:text-green-600 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:bg-green-50 flex items-center space-x-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>AI Chat</span>
              </Link>
              <Link
                href="/dashboard"
                className="group bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-green-50 py-20 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Trust indicators */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200 mb-6">
              <Star className="w-5 h-5 text-yellow-500 mr-2" />
              <span className="text-sm text-gray-600">Trusted by <span className="font-semibold text-gray-900">500+</span> companies worldwide</span>
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">TrustFlow</span>
            </h1>
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              AI-powered supply chain management on blockchain
            </p>

            {/* Real Blockchain Data */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10 max-w-4xl mx-auto">
              <div className="bg-white bg-opacity-80 backdrop-blur-sm p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="text-2xl font-bold text-blue-600">110.0000</div>
                <div className="text-sm text-gray-600">ETH Total Inventory</div>
              </div>
              <div className="bg-white bg-opacity-80 backdrop-blur-sm p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="text-2xl font-bold text-green-600">5</div>
                <div className="text-sm text-gray-600">Active Transactions</div>
              </div>
              <div className="bg-white bg-opacity-80 backdrop-blur-sm p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="text-2xl font-bold text-purple-600">2</div>
                <div className="text-sm text-gray-600">Business Relationships</div>
              </div>
              <div className="bg-white bg-opacity-80 backdrop-blur-sm p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="text-2xl font-bold text-orange-600">3</div>
                <div className="text-sm text-gray-600">Product Types</div>
              </div>
            </div>

            {/* Quick Action */}
            <div className="flex justify-center">
              <Link
                href="/dashboard"
                className="group bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white px-8 py-4 rounded-xl text-lg font-medium transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <span>View Dashboard</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              The Supply Chain Challenge
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Traditional B2B supply chains suffer from lack of transparency, inefficient processes, 
              and fragmented relationships that cost businesses billions annually.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="bg-red-100 p-3 rounded-lg w-fit mb-4">
                <Lock className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Lack of Transparency</h3>
              <p className="text-gray-600">
                Poor visibility into supply chain operations leads to inefficiencies and trust issues.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="bg-orange-100 p-3 rounded-lg w-fit mb-4">
                <Cpu className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Manual Processes</h3>
              <p className="text-gray-600">
                Time-consuming manual negotiations and documentation slow down operations.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="bg-yellow-100 p-3 rounded-lg w-fit mb-4">
                <Users className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Fragmented Relationships</h3>
              <p className="text-gray-600">
                Disconnected systems make it difficult to maintain strong supplier-buyer relationships.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Overview */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Our Solution: Dual Operating Model
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              TrustFlow combines the best of both worlds with relationship-based partnerships 
              and flexible spot market trading.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-blue-50 p-8 rounded-xl">
              <h3 className="text-xl font-semibold text-blue-900 mb-4">Relationship Hub</h3>
              <p className="text-blue-700 mb-4">
                Build long-term partnerships with suppliers and buyers through automated 
                negotiations and smart contracts.
              </p>
              <ul className="space-y-2 text-blue-600">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Automated negotiations</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Smart contract execution</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Long-term partnerships</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-green-50 p-8 rounded-xl">
              <h3 className="text-xl font-semibold text-green-900 mb-4">Spot Marketplace</h3>
              <p className="text-green-700 mb-4">
                Access immediate inventory and products through a transparent, 
                blockchain-secured marketplace.
              </p>
              <ul className="space-y-2 text-green-600">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Instant transactions</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Transparent pricing</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Flexible purchasing</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-20 bg-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white"></div>
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-blue-50 rounded-full mb-4">
              <Zap className="w-4 h-4 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-800">Powerful Features</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Everything you need to modernize your 
              <span className="text-blue-600"> supply chain</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Built with cutting-edge technology and designed for scalability, security, and efficiency
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="group bg-white p-8 rounded-2xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-blue-200 transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className={`${feature.color} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <div className="bg-gray-50 p-4 rounded-xl w-fit group-hover:bg-blue-50 transition-colors duration-300">
                    <feature.icon className="w-8 h-8" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                
                {/* Hover effect indicator */}
                <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <ArrowRight className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            ))}
          </div>

          {/* Feature highlight */}
          <div className="mt-16 bg-gradient-to-r from-blue-600 to-green-600 rounded-2xl p-8 text-center text-white">
            <h3 className="text-2xl font-bold mb-4">🚀 AI Chat Integration</h3>
            <p className="text-lg text-blue-100 mb-6">
              Get real-time insights about your supply chain through natural language conversations with our AI assistant
            </p>
            <Link
              href="/chat"
              className="inline-flex items-center px-6 py-3 bg-white text-blue-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              Try AI Chat
            </Link>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Transform Your Supply Chain
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Join thousands of businesses already using TrustFlow to optimize their 
                supply chain operations and build stronger business relationships.
              </p>
              <div className="space-y-3">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              {useCases.map((useCase, index) => (
                <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex items-start space-x-4">
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <useCase.icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{useCase.title}</h3>
                      <p className="text-gray-600">{useCase.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold">TrustFlow</span>
            </div>
            <div className="text-gray-400 text-sm">
              © 2024 TrustFlow. All rights reserved. Built on Ethereum.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}