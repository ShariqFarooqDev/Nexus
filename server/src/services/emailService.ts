import config from '../config/env.js';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

// Email sending - logs for demo, would use service in production
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  // In demo mode, just log that email would be sent
  console.log(`📧 [Demo] Email would be sent to: ${options.to}`);
  console.log(`   Subject: ${options.subject}`);
};

export const sendOTPEmail = async (email: string, otp: string): Promise<void> => {
  // OTP is already logged in authController, just acknowledge here
  console.log(`📧 [Demo] OTP email would be sent to: ${email}`);
};

export const sendWelcomeEmail = async (
  email: string,
  name: string
): Promise<void> => {
  console.log(`📧 [Demo] Welcome email would be sent to: ${email} for ${name}`);
};

export const sendPasswordResetEmail = async (
  email: string,
  resetUrl: string
): Promise<void> => {
  console.log(`📧 [Demo] Password reset email would be sent to: ${email}`);
};

export const sendMeetingInviteEmail = async (
  email: string,
  meetingTitle: string,
  organizerName: string,
  scheduledTime: Date
): Promise<void> => {
  console.log(`📧 [Demo] Meeting invite would be sent to: ${email} for "${meetingTitle}"`);
};
