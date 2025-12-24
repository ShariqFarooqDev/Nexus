import config from '../config/env.js';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

// Use Brevo HTTP API instead of SMTP (works on Railway)
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    console.error('BREVO_API_KEY not configured, skipping email');
    return;
  }

  const payload = {
    sender: {
      name: config.email.fromName,
      email: config.email.fromEmail,
    },
    to: [{ email: options.to }],
    subject: options.subject,
    htmlContent: options.html || options.text,
  };

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(JSON.stringify(error));
    }

    console.log(`✅ Email sent to ${options.to}`);
  } catch (error) {
    console.error('Failed to send email via Brevo API:', error);
    throw error;
  }
};

export const sendOTPEmail = async (email: string, otp: string): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Nexus - Verification Code</h2>
      <p>Your verification code is:</p>
      <h1 style="color: #1e40af; font-size: 32px; letter-spacing: 8px;">${otp}</h1>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this code, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;"/>
      <p style="color: #6b7280; font-size: 12px;">
        © ${new Date().getFullYear()} Nexus. All rights reserved.
      </p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: 'Your Nexus Verification Code',
    html,
  });
};

export const sendWelcomeEmail = async (
  email: string,
  name: string
): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Welcome to Nexus, ${name}! 🎉</h2>
      <p>Thank you for joining our community of entrepreneurs and investors.</p>
      <p>Here's what you can do now:</p>
      <ul>
        <li>Complete your profile</li>
        <li>Explore the platform</li>
        <li>Connect with other members</li>
        <li>Schedule your first meeting</li>
      </ul>
      <a href="${config.frontendUrl}/dashboard" 
         style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                text-decoration: none; border-radius: 6px; margin-top: 16px;">
        Go to Dashboard
      </a>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;"/>
      <p style="color: #6b7280; font-size: 12px;">
        © ${new Date().getFullYear()} Nexus. All rights reserved.
      </p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: 'Welcome to Nexus!',
    html,
  });
};

export const sendPasswordResetEmail = async (
  email: string,
  resetUrl: string
): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Password Reset Request</h2>
      <p>You requested a password reset. Click the button below to reset your password:</p>
      <a href="${resetUrl}" 
         style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                text-decoration: none; border-radius: 6px; margin-top: 16px;">
        Reset Password
      </a>
      <p style="margin-top: 16px;">This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;"/>
      <p style="color: #6b7280; font-size: 12px;">
        © ${new Date().getFullYear()} Nexus. All rights reserved.
      </p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: 'Nexus - Password Reset',
    html,
  });
};

export const sendMeetingInviteEmail = async (
  email: string,
  meetingTitle: string,
  organizerName: string,
  scheduledTime: Date
): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Meeting Invitation</h2>
      <p>${organizerName} has invited you to a meeting:</p>
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h3 style="margin: 0 0 8px 0;">${meetingTitle}</h3>
        <p style="margin: 0; color: #4b5563;">
          📅 ${scheduledTime.toLocaleString()}
        </p>
      </div>
      <a href="${config.frontendUrl}/meetings" 
         style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                text-decoration: none; border-radius: 6px;">
        View Meeting
      </a>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;"/>
      <p style="color: #6b7280; font-size: 12px;">
        © ${new Date().getFullYear()} Nexus. All rights reserved.
      </p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: `Meeting Invitation: ${meetingTitle}`,
    html,
  });
};
