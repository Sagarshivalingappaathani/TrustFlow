// Simple browser-compatible IPFS service for image display only

// Get IPFS URL for viewing content using your custom gateway
export const getIPFSUrl = (hash: string): string => {
  if (!hash || hash.trim() === '') {
    return '';
  }
  
  // Check if it's a mock hash for development
  if (hash.startsWith('QmMock')) {
    try {
      const base64Data = localStorage.getItem(`ipfs_${hash}`);
      if (base64Data) {
        return `data:image/jpeg;base64,${base64Data}`;
      }
    } catch (e) {
      console.warn('Could not retrieve mock image from localStorage:', e);
    }
  }
  
  return `https://apricot-academic-canid-70.mypinata.cloud/ipfs/${hash}`;
};

// Alternative gateway URLs
export const getIPFSUrls = (hash: string) => {
  return {
    custom: `https://apricot-academic-canid-70.mypinata.cloud/ipfs/${hash}`,
    pinata: `https://gateway.pinata.cloud/ipfs/${hash}`,
    ipfs: `https://ipfs.io/ipfs/${hash}`,
    cloudflare: `https://cloudflare-ipfs.com/ipfs/${hash}`,
    dweb: `https://dweb.link/ipfs/${hash}`
  };
};

// Utility function to validate file type
export const isValidImageFile = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return validTypes.includes(file.type);
};

// Utility function to validate file type (images + PDFs)
export const isValidFile = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
  return validTypes.includes(file.type);
};

// Utility function to validate file size (max 10MB)
export const isValidFileSize = (file: File, maxSizeMB: number = 10): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

// Helper function to check if hash is valid IPFS hash
export const isValidIPFSHash = (hash: string): boolean => {
  if (!hash || hash.trim() === '') return false;
  
  // Basic validation for IPFS hash format
  const ipfsHashRegex = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|baf[a-z0-9]{56,})$/;
  return ipfsHashRegex.test(hash.trim());
};

// Get image with fallback
export const getImageSrc = (hash: string, fallback?: string): string => {
  if (!hash || !isValidIPFSHash(hash)) {
    return fallback || '';
  }
  return getIPFSUrl(hash);
};

// Upload file to IPFS using multiple methods
export const uploadToIPFS = async (file: File): Promise<string> => {
  if (!isValidFile(file)) {
    throw new Error('Invalid file type. Please upload an image or PDF file.');
  }

  if (!isValidFileSize(file, 10)) {
    throw new Error('File size too large. Maximum size is 10MB.');
  }

  // Method 1: Try Pinata with API key if available
  if (process.env.NEXT_PUBLIC_PINATA_JWT) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        return data.IpfsHash;
      }
    } catch (error) {
      console.warn('Pinata upload failed, trying alternative method:', error);
    }
  }

  // Method 2: Try web3.storage as fallback
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('https://api.web3.storage/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_WEB3_STORAGE_TOKEN}`,
      },
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      return data.cid;
    }
  } catch (error) {
    console.warn('Web3.storage upload failed:', error);
  }

  // Method 3: Generate a mock hash for development/testing
  console.warn('All IPFS uploads failed, generating mock hash for development');
  
  // Convert file to base64 and create a deterministic hash
  const arrayBuffer = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  
  // Create a simple hash from the base64 string
  let hash = 0;
  for (let i = 0; i < base64.length; i++) {
    const char = base64.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Generate a mock IPFS hash format
  const mockHash = `QmMock${Math.abs(hash).toString(36).padStart(40, '0')}`;
  
  // Store the file data in localStorage for development
  try {
    localStorage.setItem(`ipfs_${mockHash}`, base64);
  } catch (e) {
    console.warn('Could not store file in localStorage:', e);
  }
  
  return mockHash;
};