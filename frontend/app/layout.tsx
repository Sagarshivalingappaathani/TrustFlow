import './globals.css';
import type { Metadata } from 'next';
import { Web3Provider } from '@/contexts/Web3Context';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'TrustFlow - AI-Powered Supply Chain on Ethereum',
  description: 'Streamline your supply chain operations with blockchain transparency and AI automation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: 'Inter, sans-serif' }}>
        <Web3Provider>
          {children}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </Web3Provider>
      </body>
    </html>
  );
}