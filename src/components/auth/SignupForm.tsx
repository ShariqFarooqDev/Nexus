import React, { useState } from 'react';
import { StepOne } from './steps/StepOne';
import { StepTwo } from './steps/StepTwo';
import { StepThree } from './steps/StepThree';
import { StepFour } from './steps/StepFour';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { authApi, userApi } from '../../services/api';

interface SignupFormData {
  firstName: string;
  lastName: string;
  email: string;
  userType: 'entrepreneur' | 'investor';
  password: string;
  confirmPassword: string;
}

export const SignupForm = () => {
  const navigate = useNavigate();
  const { verifyOtp } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [formData, setFormData] = useState<SignupFormData>({
    firstName: '',
    lastName: '',
    email: '',
    userType: 'entrepreneur',
    password: '',
    confirmPassword: '',
  });

  const updateFormData = <K extends keyof SignupFormData>(field: K, value: SignupFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Step 1: Collect name and email, send OTP for verification
  const handleStepOneComplete = async () => {
    setLoading(true);
    try {
      // Just send OTP for email verification first (no registration yet)
      await authApi.sendOtp(formData.email);
      setPendingEmail(formData.email);
      toast.success('Verification code sent to your email');
      setStep(2);
    } catch (error: any) {
      // If user exists, show appropriate message
      if (error.response?.data?.message?.includes('already')) {
        toast.error('This email is already registered. Please login instead.');
      } else {
        toast.error('Failed to send verification code');
      }
      console.error('Send OTP error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleOtpVerified = async (otp: string) => {
    setLoading(true);
    try {
      // Just verify the OTP, don't complete registration yet
      await authApi.verifyOtpOnly(formData.email, otp);
      toast.success('Email verified!');
      setStep(3);
    } catch (error) {
      toast.error('Invalid verification code');
      console.error('OTP verification error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Select user type (just updates form data, goes to step 4)
  const handleUserTypeSelected = () => {
    setStep(4);
  };

  // Step 4: Set password and complete registration
  const handleSubmit = async () => {
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      // NOW register with all the collected data including role
      const response = await authApi.register({
        email: formData.email,
        password: formData.password,
        role: formData.userType, // This is now correctly set from Step 3
        profile: {
          firstName: formData.firstName,
          lastName: formData.lastName,
        },
      });

      if (response.success) {
        // Store tokens
        if (response.data?.accessToken) {
          localStorage.setItem('accessToken', response.data.accessToken);
        }
        if (response.data?.refreshToken) {
          localStorage.setItem('refreshToken', response.data.refreshToken);
        }

        toast.success('Account created successfully!');
        navigate('/dashboard');
        window.location.reload(); // Refresh to update auth state
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create account';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between mb-8">
        {[1, 2, 3, 4].map((number) => (
          <div
            key={number}
            className={`w-1/4 h-1 rounded-full transition-colors ${number <= step ? 'bg-blue-600' : 'bg-gray-200'
              }`}
          />
        ))}
      </div>

      {step === 1 && (
        <StepOne
          formData={{
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email
          }}
          onUpdate={updateFormData}
          onNext={handleStepOneComplete}
          loading={loading}
        />
      )}

      {step === 2 && (
        <StepTwo
          email={formData.email}
          onVerified={handleOtpVerified}
          loading={loading}
        />
      )}

      {step === 3 && (
        <StepThree
          userType={formData.userType}
          onUpdate={(value) => updateFormData('userType', value as 'entrepreneur' | 'investor')}
          onNext={handleUserTypeSelected}
        />
      )}

      {step === 4 && (
        <StepFour
          password={formData.password}
          confirmPassword={formData.confirmPassword}
          onUpdate={updateFormData}
          onSubmit={handleSubmit}
          loading={loading}
        />
      )}
    </div>
  );
};