/**
 * Brevo Email Service
 * Sends email notifications using Brevo API
 */

const BREVO_API_KEY = import.meta.env.VITE_BREVO_API_KEY || '';
const BREVO_SENDER_EMAIL = import.meta.env.VITE_BREVO_SENDER_EMAIL || '';
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

// Send email via Brevo
async function sendEmail(to, subject, htmlContent) {
  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY
      },
      body: JSON.stringify({
        sender: {
          email: BREVO_SENDER_EMAIL,
          name: 'Scholaco'
        },
        to: [{ email: to }],
        subject,
        htmlContent
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Email send error:', error);
    return { error };
  }
}

// Send welcome email
export async function sendWelcomeEmail(userEmail, userName) {
  const subject = 'Welcome to Scholaco! 🎓';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #800020 0%, #a91e43 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Welcome to Scholaco!</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2>Hi ${userName}!</h2>
        <p>Thank you for joining Scholaco. We're excited to help you track your scholarship applications!</p>
        <p><strong>What you can do:</strong></p>
        <ul>
          <li>Track all your scholarship applications in one place</li>
          <li>Never miss a deadline with smart reminders</li>
          <li>Monitor your progress with beautiful analytics</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${window.location.origin}" style="background: #800020; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block;">Get Started</a>
        </div>
        <p>Best of luck with your applications!</p>
      </div>
    </div>
  `;
  
  return await sendEmail(userEmail, subject, html);
}

// Send deadline reminder
export async function sendDeadlineReminder(userEmail, appName, organization, deadline, daysLeft) {
  const subject = `⏰ Reminder: ${appName} deadline in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #800020 0%, #a91e43 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">⏰ Deadline Reminder</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2>Don't forget!</h2>
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${appName}</h3>
          <p><strong>Organization:</strong> ${organization}</p>
          <p><strong>Deadline:</strong> ${new Date(deadline).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p><strong>Time Remaining:</strong> ${daysLeft} day${daysLeft !== 1 ? 's' : ''}</p>
        </div>
        <p><strong>Action items:</strong></p>
        <ul>
          <li>Complete all required documents</li>
          <li>Review your application</li>
          <li>Submit before the deadline</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${window.location.origin}/dashboard" style="background: #800020; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block;">View in Scholaco</a>
        </div>
        <p>Good luck! 🚀</p>
      </div>
    </div>
  `;
  
  return await sendEmail(userEmail, subject, html);
}

// Send application submitted confirmation
export async function sendApplicationSubmitted(userEmail, appName) {
  const subject = `✅ Application Submitted: ${appName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #800020 0%, #a91e43 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">✅ Application Submitted!</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2>Great job!</h2>
        <p>Your application for <strong>${appName}</strong> has been marked as submitted.</p>
        <p>We'll keep tracking it for you. You can view all your applications in your Scholaco dashboard.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${window.location.origin}/dashboard" style="background: #800020; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block;">View Dashboard</a>
        </div>
        <p>Keep up the great work! 🎉</p>
      </div>
    </div>
  `;
  
  return await sendEmail(userEmail, subject, html);
}