'use client';

import React, { useState } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Building2 } from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

const schema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(100, 'Company name too long'),
  companyAddress: z.string().min(1, 'Address is required').regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
});

type FormData = z.infer<typeof schema>;

interface CompanyRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CompanyRegistrationModal: React.FC<CompanyRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { contract, account } = useWeb3();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyAddress: account || ''
    }
  });

  React.useEffect(() => {
    if (account) {
      setValue('companyAddress', account);
    }
  }, [account, setValue]);

  const onSubmit = async (data: FormData) => {
    if (!contract) {
      toast.error('Contract not connected');
      return;
    }

    setLoading(true);
    try {
      const tx = await contract.registerCompany(data.companyName, data.companyAddress);
      toast.loading('Registering company...', { id: 'register-company' });
      
      await tx.wait();
      
      toast.success('Company registered successfully!', { id: 'register-company' });
      reset();
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Failed to register company', { id: 'register-company' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Register Company</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name
            </label>
            <input
              type="text"
              {...register('companyName')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter company name"
            />
            {errors.companyName && (
              <p className="mt-1 text-sm text-red-600">{errors.companyName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ethereum Address
            </label>
            <input
              type="text"
              {...register('companyAddress')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0x..."
            />
            {errors.companyAddress && (
              <p className="mt-1 text-sm text-red-600">{errors.companyAddress.message}</p>
            )}
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Registering...</span>
                </>
              ) : (
                <span>Register Company</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyRegistrationModal;