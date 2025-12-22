import React, { useState, useEffect } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { authApi } from '../../../services/api';

interface StepTwoProps {
  email: string;
  onVerified: (otp: string) => void;
  loading?: boolean;
}

export const StepTwo: React.FC<StepTwoProps> = ({ email, onVerified, loading = false }) => {
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);

    try {
      onVerified(otp);
    } catch (error) {
      toast.error('Invalid verification code. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    setResending(true);
    try {
      await authApi.resendOtp(email);
      setCountdown(30);
      toast.success('Verification code resent successfully');
    } catch (error) {
      toast.error('Failed to resend verification code');
    } finally {
      setResending(false);
    }
  };

  const isSubmitting = loading || verifying;

  return (
    <form onSubmit={handleVerifyOTP} className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mb-4">
          <KeyRound className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Enter Verification Code
        </h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          We've sent a verification code to <strong>{email}</strong>
        </p>
      </div>

      <div>
        <input
          type="text"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          className="block w-full text-center text-2xl tracking-widest rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white py-4"
          placeholder="000000"
          required
          disabled={isSubmitting}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || otp.length !== 6}
        className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify Code'}
      </button>

      <div className="text-center">
        {countdown > 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Resend code in {countdown}s
          </p>
        ) : (
          <button
            type="button"
            onClick={handleResendOTP}
            disabled={resending}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
          >
            {resending ? 'Sending...' : 'Resend verification code'}
          </button>
        )}
      </div>
    </form>
  );
};