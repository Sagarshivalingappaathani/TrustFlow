//@ts-nocheck
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, AlertCircle, Wallet } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { useWeb3 } from '@/contexts/Web3Context';
import FormattedResponse from '@/components/chat/FormattedResponse';

interface Message {
  id: number;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatResponse {
  response: string;
}

interface ConversationHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

const ChatInterface: React.FC = () => {
  const { isConnected, account, connectWallet } = useWeb3();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [useBlockchainData, setUseBlockchainData] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const adjustTextareaHeight = (): void => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setError('');
    setIsLoading(true);

    // Add user message to chat
    const newUserMessage: Message = {
      id: Date.now(),
      content: userMessage,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMessage]);

    try {
      // Determine which endpoint to use based on wallet connection and user preference
      const endpoint = (isConnected && account && useBlockchainData) 
        ? 'http://localhost:8002/chat/with-data'
        : 'http://localhost:8002/chat';
      
      const requestBody = (isConnected && account && useBlockchainData) 
        ? {
            message: userMessage,
            user_address: account,
            conversation_history: messages.slice(-10).map((msg): ConversationHistoryItem => ({
              role: msg.role,
              content: msg.content
            }))
          }
        : {
            message: userMessage,
            conversation_history: messages.slice(-10).map((msg): ConversationHistoryItem => ({
              role: msg.role,
              content: msg.content
            }))
          };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ChatResponse = await response.json();

      // Add assistant message to chat
      const assistantMessage: Message = {
        id: Date.now() + 1,
        content: data.response,
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (err) {
      const errorMessage = isConnected && account && useBlockchainData 
        ? 'Failed to get response with blockchain data. Please check if the backend and blockchain are running.'
        : 'Failed to get response. Please check if the backend is running.';
      setError(errorMessage);
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any); // Type assertion needed due to event type mismatch
    }
  };

  const formatTimestamp = (timestamp: Date): string => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Chat Configuration Bar */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Wallet className="w-4 h-4 text-gray-600" />
                {isConnected && account ? (
                  <span className="text-sm text-green-600">
                    Connected: {account.slice(0, 6)}...{account.slice(-4)}
                  </span>
                ) : (
                  <button
                    onClick={connectWallet}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Connect Wallet
                  </button>
                )}
              </div>
              
              {isConnected && account && (
                <div className="flex items-center space-x-2">
                  <label className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={useBlockchainData}
                      onChange={(e) => setUseBlockchainData(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">Use Blockchain Data</span>
                  </label>
                </div>
              )}
            </div>
            
            {isConnected && account && useBlockchainData && (
              <div className="flex items-center space-x-1 text-xs text-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-1.5 rounded-full border border-blue-200">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Enhanced AI with your real supply chain data</span>
              </div>
            )}
          </div>
        </div>
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.length === 0 ? (
              <div className="text-center py-16">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Welcome to TrustFlow AI Chat
                </h2>
                <p className="text-gray-600 max-w-md mx-auto">
                  {isConnected && account && useBlockchainData 
                    ? "AI assistant with access to your real blockchain data for accurate supply chain insights."
                    : "Start a conversation with our AI assistant to get help with your supply chain questions."
                  }
                </p>
                {!isConnected && (
                  <div className="mt-4">
                    <button
                      onClick={connectWallet}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Connect Wallet for Enhanced AI
                    </button>
                  </div>
                )}
                {isConnected && account && useBlockchainData && (
                  <div className="mt-6 text-left">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Try asking:</h3>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div>• "What's my current inventory value?"</div>
                      <div>• "Show me my sales performance this month"</div>
                      <div>• "How do my prices compare to market averages?"</div>
                      <div>• "Which products are my most profitable?"</div>
                      <div>• "What insights can you give me about my business?"</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`flex max-w-3xl ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                      }`}
                  >
                    {/* Avatar */}
                    <div className={`flex-shrink-0 ${message.role === 'user' ? 'ml-3' : 'mr-3'}`}>
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600'
                          }`}
                      >
                        {message.role === 'user' ? (
                          <User className="w-4 h-4" />
                        ) : (
                          <Bot className="w-4 h-4" />
                        )}
                      </div>
                    </div>

                    {/* Message Content */}
                    <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`px-4 py-3 rounded-2xl max-w-full shadow-sm ${message.role === 'user'
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                            : 'bg-white text-gray-900 border border-gray-200 hover:border-gray-300 transition-colors'
                          }`}
                      >
                        <div className="break-words">
                          {message.role === 'assistant' && isConnected && account && useBlockchainData ? (
                            <FormattedResponse content={message.content} />
                          ) : (
                            <div className="whitespace-pre-wrap">
                              {message.content}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 px-1">
                        {formatTimestamp(message.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex max-w-3xl">
                  <div className="flex-shrink-0 mr-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="bg-white text-gray-900 border border-gray-200 px-4 py-3 rounded-2xl">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span className="text-gray-600">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="flex justify-center">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 max-w-md">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Error</p>
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 px-4 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <div className="flex items-end space-x-3">
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={inputMessage}
                    onChange={(e) => {
                      setInputMessage(e.target.value);
                      adjustTextareaHeight();
                    }}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none max-h-48 min-h-[50px]"
                    rows={1}
                    disabled={isLoading}
                  />
                  <button
                    onClick={(e) => handleSubmit(e as any)}
                    disabled={!inputMessage.trim() || isLoading}
                    className="absolute right-2 bottom-2 p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500 text-center">
              Press Enter to send, Shift+Enter for new line
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;