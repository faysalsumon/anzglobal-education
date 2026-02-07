import { Resend } from 'resend';

// Initialize Resend with API key
const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error('WARNING: RESEND_API_KEY is not set. Email notifications will not be sent.');
}

const resend = apiKey ? new Resend(apiKey) : null;

// Email configuration
const FROM_EMAIL = 'CampQ <noreply@anzglobal.com.au>';
const ADMIN_EMAIL = 'admin@anzglobal.com.au';

interface ContactInquiryEmailData {
  inquiryType: 'student' | 'institution';
  // Student fields
  studentName?: string;
  // Institution fields
  institutionName?: string;
  contactPerson?: string;
  // Common fields
  email: string;
  phone?: string;
  message: string;
  // Additional fields
  country?: string;
  courseInterest?: string;
  studyLevel?: string;
  visaStatus?: string;
  website?: string;
  partnershipType?: string;
}

// HTML email template for user confirmation
function getUserConfirmationEmailHtml(data: ContactInquiryEmailData): string {
  const name = data.inquiryType === 'student' ? data.studentName : data.contactPerson;
  const isStudent = data.inquiryType === 'student';
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
    : (process.env.REPL_URL || 'https://anzglobal.com.au');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Thank you for contacting CampQ</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
      <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f7fa; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #3465A5 0%, #FF5000 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
                  <img src="${baseUrl}/logo.png" alt="CampQ" style="width: 80px; height: auto; margin-bottom: 16px;" />
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px;">CampQ</h1>
                  <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">Your Gateway to Global Education</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Thank You for Contacting Us!</h2>
                  
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Dear ${name || 'Valued Contact'},
                  </p>
                  
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    We have successfully received your ${isStudent ? 'study inquiry' : 'partnership inquiry'} and appreciate your interest in CampQ.
                  </p>
                  
                  <div style="background-color: #f8f9fa; border-left: 4px solid #3465A5; padding: 20px; margin: 30px 0; border-radius: 4px;">
                    <h3 style="color: #3465A5; margin: 0 0 15px 0; font-size: 18px;">Your Inquiry Details:</h3>
                    <table cellpadding="5" cellspacing="0" style="width: 100%;">
                      ${isStudent ? `
                        <tr>
                          <td style="color: #666666; font-size: 14px; padding: 5px 0;"><strong>Name:</strong></td>
                          <td style="color: #333333; font-size: 14px; padding: 5px 0;">${data.studentName}</td>
                        </tr>
                        ${data.country ? `
                        <tr>
                          <td style="color: #666666; font-size: 14px; padding: 5px 0;"><strong>Country:</strong></td>
                          <td style="color: #333333; font-size: 14px; padding: 5px 0;">${data.country}</td>
                        </tr>
                        ` : ''}
                        ${data.courseInterest ? `
                        <tr>
                          <td style="color: #666666; font-size: 14px; padding: 5px 0;"><strong>Course Interest:</strong></td>
                          <td style="color: #333333; font-size: 14px; padding: 5px 0;">${data.courseInterest}</td>
                        </tr>
                        ` : ''}
                        ${data.studyLevel ? `
                        <tr>
                          <td style="color: #666666; font-size: 14px; padding: 5px 0;"><strong>Study Level:</strong></td>
                          <td style="color: #333333; font-size: 14px; padding: 5px 0;">${data.studyLevel}</td>
                        </tr>
                        ` : ''}
                      ` : `
                        <tr>
                          <td style="color: #666666; font-size: 14px; padding: 5px 0;"><strong>Institution:</strong></td>
                          <td style="color: #333333; font-size: 14px; padding: 5px 0;">${data.institutionName}</td>
                        </tr>
                        <tr>
                          <td style="color: #666666; font-size: 14px; padding: 5px 0;"><strong>Contact Person:</strong></td>
                          <td style="color: #333333; font-size: 14px; padding: 5px 0;">${data.contactPerson}</td>
                        </tr>
                        ${data.partnershipType ? `
                        <tr>
                          <td style="color: #666666; font-size: 14px; padding: 5px 0;"><strong>Partnership Type:</strong></td>
                          <td style="color: #333333; font-size: 14px; padding: 5px 0;">${data.partnershipType}</td>
                        </tr>
                        ` : ''}
                      `}
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 5px 0;"><strong>Email:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 5px 0;">${data.email}</td>
                      </tr>
                      ${data.phone ? `
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 5px 0;"><strong>Phone:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 5px 0;">${data.phone}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </div>
                  
                  <h3 style="color: #333333; margin: 30px 0 15px 0; font-size: 18px;">What Happens Next?</h3>
                  
                  <ul style="color: #555555; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">
                    <li>Our team will review your inquiry within 24-48 hours</li>
                    <li>A dedicated counselor will be assigned to assist you</li>
                    <li>You will receive a personalized response via email</li>
                    ${isStudent ? 
                      '<li>We may suggest suitable courses and institutions based on your profile</li>' :
                      '<li>We will schedule a meeting to discuss partnership opportunities</li>'
                    }
                  </ul>
                  
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                    If you have any urgent questions, please don't hesitate to contact us directly.
                  </p>
                  
                  <!-- CTA Button -->
                  <div style="text-align: center; margin: 40px 0;">
                    <a href="https://anzglobaleducation.com" style="display: inline-block; background-color: #3465A5; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-size: 16px; font-weight: bold;">Visit Our Website</a>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; text-align: center;">
                  <p style="color: #666666; font-size: 14px; margin: 0 0 10px 0;">
                    CampQ - Connecting Students with Global Opportunities
                  </p>
                  <p style="color: #999999; font-size: 12px; margin: 0;">
                    © 2024 CampQ. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// HTML email template for admin notification
function getAdminNotificationEmailHtml(data: ContactInquiryEmailData & { id: string }): string {
  const isStudent = data.inquiryType === 'student';
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
    : (process.env.REPL_URL || 'https://anzglobal.com.au');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Contact Inquiry - CampQ</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
      <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f7fa; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background-color: ${isStudent ? '#3465A5' : '#FF5000'}; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                  <img src="${baseUrl}/logo.png" alt="CampQ" style="width: 80px; height: auto; margin-bottom: 16px;" />
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px;">New ${isStudent ? 'Student' : 'Institution'} Inquiry</h1>
                  <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">Inquiry ID: ${data.id}</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 30px;">
                  <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
                    <p style="color: #856404; margin: 0; font-size: 14px;">
                      <strong>⚠️ Action Required:</strong> Please review and respond to this inquiry within 24-48 hours.
                    </p>
                  </div>
                  
                  <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">Contact Details</h2>
                  
                  <table cellpadding="8" cellspacing="0" style="width: 100%; border: 1px solid #e0e0e0; border-radius: 6px;">
                    ${isStudent ? `
                      <tr style="background-color: #f8f9fa;">
                        <td style="color: #666666; font-size: 14px; padding: 10px; border-bottom: 1px solid #e0e0e0;"><strong>Name:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 10px; border-bottom: 1px solid #e0e0e0;">${data.studentName}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 10px; border-bottom: 1px solid #e0e0e0;"><strong>Email:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 10px; border-bottom: 1px solid #e0e0e0;">
                          <a href="mailto:${data.email}" style="color: #3465A5; text-decoration: none;">${data.email}</a>
                        </td>
                      </tr>
                      ${data.phone ? `
                      <tr style="background-color: #f8f9fa;">
                        <td style="color: #666666; font-size: 14px; padding: 10px; border-bottom: 1px solid #e0e0e0;"><strong>Phone:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 10px; border-bottom: 1px solid #e0e0e0;">${data.phone}</td>
                      </tr>
                      ` : ''}
                      ${data.country ? `
                      <tr ${data.phone ? '' : 'style="background-color: #f8f9fa;"'}>
                        <td style="color: #666666; font-size: 14px; padding: 10px; border-bottom: 1px solid #e0e0e0;"><strong>Country:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 10px; border-bottom: 1px solid #e0e0e0;">${data.country}</td>
                      </tr>
                      ` : ''}
                      ${data.courseInterest ? `
                      <tr style="background-color: #f8f9fa;">
                        <td style="color: #666666; font-size: 14px; padding: 10px; border-bottom: 1px solid #e0e0e0;"><strong>Course Interest:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 10px; border-bottom: 1px solid #e0e0e0;">${data.courseInterest}</td>
                      </tr>
                      ` : ''}
                      ${data.studyLevel ? `
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 10px; border-bottom: 1px solid #e0e0e0;"><strong>Study Level:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 10px; border-bottom: 1px solid #e0e0e0;">${data.studyLevel}</td>
                      </tr>
                      ` : ''}
                      ${data.visaStatus ? `
                      <tr style="background-color: #f8f9fa;">
                        <td style="color: #666666; font-size: 14px; padding: 10px;"><strong>Visa Status:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 10px;">${data.visaStatus}</td>
                      </tr>
                      ` : ''}
                    ` : `
                      <tr style="background-color: #f8f9fa;">
                        <td style="color: #666666; font-size: 14px; padding: 10px; border-bottom: 1px solid #e0e0e0;"><strong>Institution:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 10px; border-bottom: 1px solid #e0e0e0;">${data.institutionName}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 10px; border-bottom: 1px solid #e0e0e0;"><strong>Contact Person:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 10px; border-bottom: 1px solid #e0e0e0;">${data.contactPerson}</td>
                      </tr>
                      <tr style="background-color: #f8f9fa;">
                        <td style="color: #666666; font-size: 14px; padding: 10px; border-bottom: 1px solid #e0e0e0;"><strong>Email:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 10px; border-bottom: 1px solid #e0e0e0;">
                          <a href="mailto:${data.email}" style="color: #3465A5; text-decoration: none;">${data.email}</a>
                        </td>
                      </tr>
                      ${data.phone ? `
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 10px; border-bottom: 1px solid #e0e0e0;"><strong>Phone:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 10px; border-bottom: 1px solid #e0e0e0;">${data.phone}</td>
                      </tr>
                      ` : ''}
                      ${data.website ? `
                      <tr style="background-color: #f8f9fa;">
                        <td style="color: #666666; font-size: 14px; padding: 10px; border-bottom: 1px solid #e0e0e0;"><strong>Website:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 10px; border-bottom: 1px solid #e0e0e0;">
                          <a href="${data.website}" style="color: #3465A5; text-decoration: none;">${data.website}</a>
                        </td>
                      </tr>
                      ` : ''}
                      ${data.partnershipType ? `
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 10px;"><strong>Partnership Type:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 10px;">${data.partnershipType}</td>
                      </tr>
                      ` : ''}
                    `}
                  </table>
                  
                  <h3 style="color: #333333; margin: 30px 0 15px 0; font-size: 18px;">Message</h3>
                  <div style="background-color: #f8f9fa; border-left: 4px solid ${isStudent ? '#3465A5' : '#FF5000'}; padding: 15px; border-radius: 4px;">
                    <p style="color: #333333; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${data.message}</p>
                  </div>
                  
                  <!-- CTA Buttons -->
                  <div style="text-align: center; margin: 40px 0;">
                    <a href="https://anzglobaleducation.com/admin/dashboard" style="display: inline-block; background-color: #3465A5; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 6px; font-size: 14px; font-weight: bold; margin: 0 10px;">View in Dashboard</a>
                    <a href="mailto:${data.email}" style="display: inline-block; background-color: #28a745; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 6px; font-size: 14px; font-weight: bold; margin: 0 10px;">Reply to Inquiry</a>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f9fa; padding: 20px; border-radius: 0 0 12px 12px; text-align: center;">
                  <p style="color: #999999; font-size: 12px; margin: 0;">
                    This is an automated notification from CampQ Contact System
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// Send confirmation email to user
export async function sendContactInquiryConfirmation(data: ContactInquiryEmailData): Promise<void> {
  if (!resend) {
    console.log('Resend not configured - skipping confirmation email');
    return;
  }
  
  try {
    const name = data.inquiryType === 'student' ? data.studentName : data.contactPerson;
    const subject = data.inquiryType === 'student' 
      ? `Thank you for your study inquiry, ${name}!`
      : `Partnership Inquiry Received - ${data.institutionName}`;
    
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: subject,
      html: getUserConfirmationEmailHtml(data),
    });
    
    console.log(`Confirmation email sent to ${data.email}, ID: ${result.data?.id}`);
  } catch (error: any) {
    console.error('Error sending confirmation email:', error);
    console.error('Error details:', error.message);
    // Don't throw error to prevent blocking the inquiry submission
  }
}

// Send notification email to admin
export async function sendAdminNotification(data: ContactInquiryEmailData & { id: string }): Promise<void> {
  if (!resend) {
    console.log('Resend not configured - skipping admin notification email');
    return;
  }
  
  try {
    const subject = data.inquiryType === 'student'
      ? `New Student Inquiry - ${data.studentName} (${data.country || 'Unknown Country'})`
      : `New Institution Inquiry - ${data.institutionName}`;
    
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: subject,
      html: getAdminNotificationEmailHtml(data),
    });
    
    console.log(`Admin notification email sent for inquiry ${data.id}, ID: ${result.data?.id}`);
  } catch (error: any) {
    console.error('Error sending admin notification email:', error);
    console.error('Error details:', error.message);
    // Don't throw error to prevent blocking the inquiry submission
  }
}

// Combined function to send both emails
export async function sendContactInquiryEmails(data: ContactInquiryEmailData & { id: string }): Promise<void> {
  // Send both emails in parallel
  await Promise.all([
    sendContactInquiryConfirmation(data),
    sendAdminNotification(data),
  ]);
}

// ============================================
// APPLICATION WORKFLOW EMAIL NOTIFICATIONS
// ============================================

interface ApplicationEmailData {
  studentEmail: string;
  studentName: string;
  applicationId: string;
  courseTitle: string;
  universityName: string;
  currentStage: string;
  previousStage?: string;
  documentTypes?: string[];
  requestNote?: string;
  consultantName?: string;
}

// Stage transition notification HTML
function getStageTransitionEmailHtml(data: ApplicationEmailData): string {
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
    : (process.env.REPL_URL || 'https://anzglobal.com.au');
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Application Stage Update</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
      <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f7fa; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <tr>
                <td style="background: linear-gradient(135deg, #3465A5 0%, #FF5000 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
                  <img src="${baseUrl}/logo.png" alt="CampQ" style="width: 80px; height: auto; margin-bottom: 16px;" />
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Application Update</h1>
                  <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">Your application has been updated</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Hello ${data.studentName}!</h2>
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Great news! Your application for <strong>${data.courseTitle}</strong> at <strong>${data.universityName}</strong> has progressed to the next stage.
                  </p>
                  <div style="background-color: #e8f4f8; border-left: 4px solid #3465A5; padding: 20px; margin: 30px 0; border-radius: 4px;">
                    <h3 style="color: #3465A5; margin: 0 0 15px 0; font-size: 18px;">Current Stage:</h3>
                    <p style="color: #333333; font-size: 20px; font-weight: bold; margin: 0;">${data.currentStage}</p>
                    ${data.previousStage ? `<p style="color: #666666; font-size: 14px; margin: 10px 0 0 0;">Previously: ${data.previousStage}</p>` : ''}
                  </div>
                  <div style="text-align: center; margin: 40px 0;">
                    <a href="https://anzglobaleducation.com/student/applications" style="display: inline-block; background-color: #3465A5; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-size: 16px; font-weight: bold;">View Application</a>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; text-align: center;">
                  <p style="color: #666666; font-size: 14px; margin: 0 0 10px 0;">CampQ</p>
                  <p style="color: #999999; font-size: 12px; margin: 0;">© 2024 CampQ. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// Document request notification HTML
function getDocumentRequestEmailHtml(data: ApplicationEmailData): string {
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
    : (process.env.REPL_URL || 'https://anzglobal.com.au');
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Document Request</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
      <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f7fa; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <tr>
                <td style="background-color: #FF5000; padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
                  <img src="${baseUrl}/logo.png" alt="CampQ" style="width: 80px; height: auto; margin-bottom: 16px;" />
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Document Request</h1>
                  <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">Action Required</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Hello ${data.studentName}!</h2>
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    The university has requested additional documents for your application to <strong>${data.courseTitle}</strong>.
                  </p>
                  <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 20px; margin: 20px 0;">
                    <p style="color: #856404; margin: 0; font-size: 14px;">
                      <strong>⚠️ Important:</strong> Please upload the requested documents as soon as possible to avoid delays in processing your application.
                    </p>
                  </div>
                  <h3 style="color: #333333; margin: 30px 0 15px 0; font-size: 18px;">Requested Documents:</h3>
                  <ul style="color: #555555; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">
                    ${data.documentTypes?.map(doc => `<li>${doc}</li>`).join('')}
                  </ul>
                  ${data.requestNote ? `
                    <div style="background-color: #f8f9fa; border-left: 4px solid #3465A5; padding: 15px; border-radius: 4px; margin: 20px 0;">
                      <p style="color: #666666; font-size: 14px; margin: 0;"><strong>Note:</strong></p>
                      <p style="color: #333333; font-size: 14px; margin: 10px 0 0 0;">${data.requestNote}</p>
                    </div>
                  ` : ''}
                  <div style="text-align: center; margin: 40px 0;">
                    <a href="https://anzglobaleducation.com/student/applications" style="display: inline-block; background-color: #FF5000; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-size: 16px; font-weight: bold;">Upload Documents</a>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; text-align: center;">
                  <p style="color: #666666; font-size: 14px; margin: 0 0 10px 0;">CampQ</p>
                  <p style="color: #999999; font-size: 12px; margin: 0;">© 2024 CampQ. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// Send stage transition notification
export async function sendStageTransitionNotification(data: ApplicationEmailData): Promise<void> {
  if (!resend) {
    console.log('Resend not configured - skipping stage transition email');
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.studentEmail,
      subject: `Application Update: ${data.currentStage} - ${data.courseTitle}`,
      html: getStageTransitionEmailHtml(data),
    });

    console.log(`Stage transition email sent to ${data.studentEmail} for application ${data.applicationId}`);
  } catch (error: any) {
    console.error('Error sending stage transition email:', error.message);
  }
}

// Send document request notification  
export async function sendDocumentRequestNotification(data: ApplicationEmailData): Promise<void> {
  if (!resend) {
    console.log('Resend not configured - skipping document request email');
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.studentEmail,
      subject: `Document Request for ${data.courseTitle}`,
      html: getDocumentRequestEmailHtml(data),
    });

    console.log(`Document request email sent to ${data.studentEmail} for application ${data.applicationId}`);
  } catch (error: any) {
    console.error('Error sending document request email:', error.message);
  }
}

// ============================================
// NEW TRANSACTIONAL EMAIL TEMPLATES
// ============================================

interface WelcomeEmailData {
  email: string;
  firstName: string;
  userType: 'student' | 'institution' | 'admin';
}

interface ProfileReminderEmailData {
  email: string;
  firstName: string;
  profileCompletion: number;
  missingFields: string[];
}

interface ApplicationSubmittedEmailData {
  email: string;
  studentName: string;
  courseTitle: string;
  institutionName: string;
  applicationId: string;
  submittedDate: string;
}

// Welcome email HTML template
function getWelcomeEmailHtml(data: WelcomeEmailData): string {
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
    : (process.env.REPL_URL || 'https://anzglobal.com.au');
  const userTypeMessages = {
    student: {
      title: 'Welcome to Your Study Journey!',
      description: 'Your account has been verified and you\'re ready to explore thousands of courses from top universities worldwide.',
      cta: 'Start Exploring Courses',
      ctaUrl: 'https://anzglobal.com.au/courses'
    },
    institution: {
      title: 'Welcome to CampQ!',
      description: 'Your institution account is now active. Start connecting with international students and showcase your programs.',
      cta: 'Access Your Dashboard',
      ctaUrl: 'https://anzglobal.com.au/university/dashboard'
    },
    admin: {
      title: 'Welcome to CampQ!',
      description: 'Your admin account has been activated.',
      cta: 'Go to Admin Dashboard',
      ctaUrl: 'https://anzglobal.com.au/admin/dashboard'
    }
  };

  const msg = userTypeMessages[data.userType] || userTypeMessages.student;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to CampQ</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
      <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f7fa; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <tr>
                <td style="background: linear-gradient(135deg, #3465A5 0%, #FF5000 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
                  <img src="${baseUrl}/logo.png" alt="CampQ" style="width: 80px; height: auto; margin-bottom: 16px;" />
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px;">CampQ</h1>
                  <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">Your Gateway to Global Education</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">${msg.title}</h2>
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Hi ${data.firstName},
                  </p>
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    ${msg.description}
                  </p>
                  ${data.userType === 'student' ? `
                  <div style="background-color: #e8f4f8; border-left: 4px solid #3465A5; padding: 20px; margin: 30px 0; border-radius: 4px;">
                    <h3 style="color: #3465A5; margin: 0 0 15px 0; font-size: 18px;">What's Next?</h3>
                    <ul style="color: #555555; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                      <li>Complete your profile to get personalized recommendations</li>
                      <li>Browse courses from top Australian universities</li>
                      <li>Save your favorite courses to compare later</li>
                      <li>Start your application when you're ready</li>
                    </ul>
                  </div>
                  ` : ''}
                  <div style="text-align: center; margin: 40px 0;">
                    <a href="${msg.ctaUrl}" style="display: inline-block; background-color: #3465A5; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-size: 16px; font-weight: bold;">${msg.cta}</a>
                  </div>
                  <p style="color: #888888; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                    Need help? Our support team is here for you at support@anzglobal.com.au
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; text-align: center;">
                  <p style="color: #888888; font-size: 12px; margin: 0;">
                    CampQ | Your Gateway to Global Education<br>
                    <a href="https://anzglobal.com.au" style="color: #3465A5;">www.anzglobal.com.au</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// Profile completion reminder email HTML template
function getProfileReminderEmailHtml(data: ProfileReminderEmailData): string {
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
    : (process.env.REPL_URL || 'https://anzglobal.com.au');
  const missingFieldsList = data.missingFields.map(field => `<li>${field}</li>`).join('');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Complete Your Profile - CampQ</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
      <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f7fa; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <tr>
                <td style="background: linear-gradient(135deg, #3465A5 0%, #FF5000 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
                  <img src="${baseUrl}/logo.png" alt="CampQ" style="width: 80px; height: auto; margin-bottom: 16px;" />
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px;">CampQ</h1>
                  <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">Complete Your Profile</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Your Profile is ${data.profileCompletion}% Complete</h2>
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Hi ${data.firstName},
                  </p>
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    A complete profile helps universities understand your background better and increases your chances of a successful application.
                  </p>
                  <div style="background-color: #fff3cd; border-left: 4px solid #FF5000; padding: 20px; margin: 30px 0; border-radius: 4px;">
                    <h3 style="color: #FF5000; margin: 0 0 15px 0; font-size: 18px;">Missing Information:</h3>
                    <ul style="color: #555555; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                      ${missingFieldsList}
                    </ul>
                  </div>
                  <div style="text-align: center; margin: 40px 0;">
                    <a href="https://anzglobal.com.au/student/profile" style="display: inline-block; background-color: #FF5000; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-size: 16px; font-weight: bold;">Complete Your Profile</a>
                  </div>
                  <p style="color: #888888; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                    Having a complete profile makes your applications stand out and helps us match you with the right courses.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; text-align: center;">
                  <p style="color: #888888; font-size: 12px; margin: 0;">
                    CampQ | Your Gateway to Global Education<br>
                    <a href="https://anzglobal.com.au" style="color: #3465A5;">www.anzglobal.com.au</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// Application submitted confirmation email HTML template
function getApplicationSubmittedEmailHtml(data: ApplicationSubmittedEmailData): string {
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
    : (process.env.REPL_URL || 'https://anzglobal.com.au');
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Application Submitted - CampQ</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
      <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f7fa; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <tr>
                <td style="background: linear-gradient(135deg, #3465A5 0%, #FF5000 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
                  <img src="${baseUrl}/logo.png" alt="CampQ" style="width: 80px; height: auto; margin-bottom: 16px;" />
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Application Submitted!</h1>
                  <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">Congratulations on taking this step</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Great News, ${data.studentName}!</h2>
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Your application has been successfully submitted and is now being reviewed.
                  </p>
                  <div style="background-color: #e8f4f8; border-left: 4px solid #3465A5; padding: 20px; margin: 30px 0; border-radius: 4px;">
                    <h3 style="color: #3465A5; margin: 0 0 15px 0; font-size: 18px;">Application Details:</h3>
                    <table cellpadding="8" cellspacing="0" style="width: 100%;">
                      <tr>
                        <td style="color: #666666; font-size: 14px;"><strong>Application ID:</strong></td>
                        <td style="color: #333333; font-size: 14px;">${data.applicationId}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px;"><strong>Course:</strong></td>
                        <td style="color: #333333; font-size: 14px;">${data.courseTitle}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px;"><strong>Institution:</strong></td>
                        <td style="color: #333333; font-size: 14px;">${data.institutionName}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px;"><strong>Submitted:</strong></td>
                        <td style="color: #333333; font-size: 14px;">${data.submittedDate}</td>
                      </tr>
                    </table>
                  </div>
                  <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 20px; margin: 30px 0; border-radius: 4px;">
                    <h3 style="color: #28a745; margin: 0 0 15px 0; font-size: 18px;">What Happens Next?</h3>
                    <ol style="color: #555555; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                      <li>Our team will review your application</li>
                      <li>You may receive requests for additional documents</li>
                      <li>The institution will assess your application</li>
                      <li>You'll receive updates at each stage via email</li>
                    </ol>
                  </div>
                  <div style="text-align: center; margin: 40px 0;">
                    <a href="https://anzglobal.com.au/student/applications" style="display: inline-block; background-color: #3465A5; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-size: 16px; font-weight: bold;">Track Your Application</a>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; text-align: center;">
                  <p style="color: #888888; font-size: 12px; margin: 0;">
                    CampQ | Your Gateway to Global Education<br>
                    <a href="https://anzglobal.com.au" style="color: #3465A5;">www.anzglobal.com.au</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// Send welcome email to new users
export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
  if (!resend) {
    console.log('Resend not configured - skipping welcome email');
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: `Welcome to CampQ, ${data.firstName}!`,
      html: getWelcomeEmailHtml(data),
    });

    console.log(`Welcome email sent to ${data.email}`);
  } catch (error: any) {
    console.error('Error sending welcome email:', error.message);
  }
}

// ============================================
// ADMIN-CREATED USER EMAIL (with temp password)
// ============================================

interface AdminCreatedUserEmailData {
  email: string;
  firstName: string;
  lastName: string;
  tempPassword: string;
  createdByName: string;
}

function getAdminCreatedUserEmailHtml(data: AdminCreatedUserEmailData): string {
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
    : (process.env.REPL_URL || 'https://anzglobal.com.au');
  const loginUrl = `${baseUrl}/admin/login`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your CampQ Account</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
      <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f7fa; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #3465A5 0%, #FF5000 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
                  <img src="${baseUrl}/logo.png" alt="CampQ" style="width: 80px; height: auto; margin-bottom: 16px;" />
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px;">CampQ</h1>
                  <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">Your Account Has Been Created</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Welcome, ${data.firstName}!</h2>
                  
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    <strong>${data.createdByName}</strong> has created an account for you on the CampQ platform.
                  </p>
                  
                  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #333333; margin: 0 0 15px 0; font-size: 16px;">Your Login Credentials</h3>
                    <p style="color: #555555; font-size: 14px; margin: 5px 0;">
                      <strong>Email:</strong> ${data.email}
                    </p>
                    <p style="color: #555555; font-size: 14px; margin: 5px 0;">
                      <strong>Temporary Password:</strong> <code style="background-color: #e9ecef; padding: 2px 8px; border-radius: 4px; font-family: monospace;">${data.tempPassword}</code>
                    </p>
                  </div>
                  
                  <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px 20px; margin: 20px 0; border-radius: 4px;">
                    <p style="color: #856404; font-size: 14px; margin: 0;">
                      <strong>⚠️ Important:</strong> You will be required to change your password when you first log in.
                    </p>
                  </div>
                  
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                    Click the button below to sign in to your account:
                  </p>
                  
                  <!-- CTA Button -->
                  <table cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td align="center" style="padding: 20px 0;">
                        <a href="${loginUrl}" style="display: inline-block; background-color: #3465A5; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                          Sign In to Your Account
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="color: #888888; font-size: 12px; margin-top: 30px;">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <a href="${loginUrl}" style="color: #3465A5;">${loginUrl}</a>
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f9fa; padding: 20px 40px; border-radius: 0 0 12px 12px; text-align: center;">
                  <p style="color: #888888; font-size: 12px; margin: 0;">
                    CampQ - Your Gateway to Global Education
                  </p>
                  <p style="color: #888888; font-size: 11px; margin: 10px 0 0 0;">
                    If you didn't expect this email, please contact your administrator.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export async function sendAdminCreatedUserEmail(data: AdminCreatedUserEmailData): Promise<void> {
  if (!resend) {
    console.log('Resend not configured - skipping admin created user email');
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: `Your CampQ Account Has Been Created`,
      html: getAdminCreatedUserEmailHtml(data),
    });

    console.log(`Admin created user email sent to ${data.email}`);
  } catch (error: any) {
    console.error('Error sending admin created user email:', error.message);
    throw error;
  }
}

// Send profile completion reminder email
export async function sendProfileReminderEmail(data: ProfileReminderEmailData): Promise<void> {
  if (!resend) {
    console.log('Resend not configured - skipping profile reminder email');
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: `Complete Your Profile - ${data.profileCompletion}% Done`,
      html: getProfileReminderEmailHtml(data),
    });

    console.log(`Profile reminder email sent to ${data.email}`);
  } catch (error: any) {
    console.error('Error sending profile reminder email:', error.message);
  }
}

// Send application submitted confirmation email
export async function sendApplicationSubmittedEmail(data: ApplicationSubmittedEmailData): Promise<void> {
  if (!resend) {
    console.log('Resend not configured - skipping application submitted email');
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: `Application Submitted: ${data.courseTitle} at ${data.institutionName}`,
      html: getApplicationSubmittedEmailHtml(data),
    });

    console.log(`Application submitted email sent to ${data.email} for application ${data.applicationId}`);
  } catch (error: any) {
    console.error('Error sending application submitted email:', error.message);
  }
}

// Admin approval notification interfaces
interface AdminApprovalNotificationData {
  email: string;
  firstName: string;
  lastName: string;
}

interface AdminApprovedNotificationData {
  email: string;
  firstName: string;
  assignedRole: string;
  approvedByName: string;
}

interface AdminRejectedNotificationData {
  email: string;
  firstName: string;
  reason?: string;
}

// Format role for display
function formatRole(role: string): string {
  const roleLabels: Record<string, string> = {
    cto: 'CTO',
    platform_admin: 'Platform Admin',
    support_manager: 'Support Manager',
    support_staff: 'Support Staff',
    operations_staff: 'Operations Staff',
  };
  return roleLabels[role] || role;
}

// Send notification to existing admins when new admin signup needs approval
export async function sendNewAdminPendingNotification(data: AdminApprovalNotificationData): Promise<void> {
  if (!resend) {
    console.log('Resend not configured - skipping new admin pending notification');
    return;
  }

  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Admin Signup Pending Approval</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
        <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f7fa; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <tr>
                  <td style="background: linear-gradient(135deg, #3465A5 0%, #FF5000 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">New Admin Signup</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #333333; margin: 0 0 20px 0;">Action Required: Review New Admin</h2>
                    
                    <p style="color: #555555; font-size: 16px; line-height: 1.6;">
                      A new user has signed up as a platform administrator and is awaiting your approval.
                    </p>
                    
                    <div style="background-color: #f8f9fa; border-left: 4px solid #3465A5; padding: 20px; margin: 20px 0; border-radius: 4px;">
                      <p style="margin: 0 0 10px 0;"><strong>Name:</strong> ${data.firstName} ${data.lastName}</p>
                      <p style="margin: 0;"><strong>Email:</strong> ${data.email}</p>
                    </div>
                    
                    <p style="color: #555555; font-size: 16px; line-height: 1.6;">
                      Please log in to the admin dashboard to review and approve this request.
                    </p>
                    
                    <div style="text-align: center; margin-top: 30px;">
                      <a href="${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/admin/dashboard#users" style="background-color: #3465A5; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Review in Dashboard</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `New Admin Signup Pending: ${data.firstName} ${data.lastName}`,
      html,
    });

    console.log(`New admin pending notification sent for ${data.email}`);
  } catch (error: any) {
    console.error('Error sending new admin pending notification:', error.message);
  }
}

// Send notification to user when their admin account is approved
export async function sendAdminApprovedNotification(data: AdminApprovedNotificationData): Promise<void> {
  if (!resend) {
    console.log('Resend not configured - skipping admin approved notification');
    return;
  }

  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Your Admin Account Has Been Approved</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
        <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f7fa; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <tr>
                  <td style="background: linear-gradient(135deg, #10b981 0%, #3465A5 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Account Approved!</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #333333; margin: 0 0 20px 0;">Welcome to the Team, ${data.firstName}!</h2>
                    
                    <p style="color: #555555; font-size: 16px; line-height: 1.6;">
                      Great news! Your administrator account has been approved by ${data.approvedByName}.
                    </p>
                    
                    <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 4px;">
                      <p style="margin: 0 0 10px 0;"><strong>Assigned Role:</strong> ${formatRole(data.assignedRole)}</p>
                      <p style="margin: 0;"><strong>Status:</strong> Active</p>
                    </div>
                    
                    <p style="color: #555555; font-size: 16px; line-height: 1.6;">
                      You now have access to the admin dashboard. Log in to get started!
                    </p>
                    
                    <div style="text-align: center; margin-top: 30px;">
                      <a href="${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/admin/dashboard" style="background-color: #10b981; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: 'Your Admin Account Has Been Approved - CampQ',
      html,
    });

    console.log(`Admin approved notification sent to ${data.email}`);
  } catch (error: any) {
    console.error('Error sending admin approved notification:', error.message);
  }
}

// Send notification to user when their admin request is rejected
export async function sendAdminRejectedNotification(data: AdminRejectedNotificationData): Promise<void> {
  if (!resend) {
    console.log('Resend not configured - skipping admin rejected notification');
    return;
  }

  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Admin Account Request Update</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
        <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f7fa; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <tr>
                  <td style="background-color: #333333; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Account Request Update</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #333333; margin: 0 0 20px 0;">Hello ${data.firstName},</h2>
                    
                    <p style="color: #555555; font-size: 16px; line-height: 1.6;">
                      We regret to inform you that your administrator account request was not approved at this time.
                    </p>
                    
                    ${data.reason ? `
                    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 4px;">
                      <p style="margin: 0;"><strong>Reason:</strong> ${data.reason}</p>
                    </div>
                    ` : ''}
                    
                    <p style="color: #555555; font-size: 16px; line-height: 1.6;">
                      If you believe this was in error or have questions, please contact our team at <a href="mailto:support@anzglobal.com.au" style="color: #3465A5;">support@anzglobal.com.au</a>.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: 'Admin Account Request Update - CampQ',
      html,
    });

    console.log(`Admin rejected notification sent to ${data.email}`);
  } catch (error: any) {
    console.error('Error sending admin rejected notification:', error.message);
  }
}

// ============================================
// TEAM INVITATION EMAIL NOTIFICATIONS
// ============================================

interface TeamInvitationEmailData {
  email: string;
  inviterName: string;
  roleName: string;
  inviteToken: string;
  expiresAt: Date;
  note?: string;
}

// HTML email template for team invitation
function getTeamInvitationEmailHtml(data: TeamInvitationEmailData): string {
  // Use Replit dev domain in development, fallback to production
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
    : (process.env.REPL_URL || 'https://anzglobal.com.au');
  const inviteUrl = `${baseUrl}/auth/accept-invite?token=${data.inviteToken}`;
  const expiryDate = new Date(data.expiresAt).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>You're Invited to Join CampQ</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
      <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f7fa; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #3465A5 0%, #FF5000 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
                  <img src="${baseUrl}/logo.png" alt="CampQ" style="width: 80px; height: auto; margin-bottom: 16px;" />
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px;">CampQ</h1>
                  <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">You're Invited to Join Our Team!</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Welcome to the Team!</h2>
                  
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    <strong>${data.inviterName}</strong> has invited you to join the CampQ platform as a <strong>${data.roleName}</strong>.
                  </p>
                  
                  ${data.note ? `
                  <div style="background-color: #f8f9fa; border-left: 4px solid #3465A5; padding: 15px 20px; margin: 20px 0; border-radius: 4px;">
                    <p style="color: #555555; font-size: 14px; font-style: italic; margin: 0;">"${data.note}"</p>
                  </div>
                  ` : ''}
                  
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                    Click the button below to set up your account and get started:
                  </p>
                  
                  <!-- CTA Button -->
                  <div style="text-align: center; margin: 40px 0;">
                    <a href="${inviteUrl}" style="display: inline-block; background-color: #3465A5; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 18px; font-weight: bold;">Accept Invitation</a>
                  </div>
                  
                  <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 15px; margin: 30px 0;">
                    <p style="color: #856404; margin: 0; font-size: 14px;">
                      <strong>⏰ Note:</strong> This invitation will expire on <strong>${expiryDate}</strong>. Please accept it before then.
                    </p>
                  </div>
                  
                  <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                    If the button doesn't work, copy and paste this link into your browser:
                  </p>
                  <p style="color: #3465A5; font-size: 12px; word-break: break-all; margin: 5px 0 0 0;">
                    ${inviteUrl}
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; text-align: center;">
                  <p style="color: #666666; font-size: 14px; margin: 0 0 10px 0;">
                    CampQ - Your Gateway to Global Education
                  </p>
                  <p style="color: #999999; font-size: 12px; margin: 0;">
                    If you didn't expect this invitation, you can safely ignore this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// Password changed confirmation email HTML template
function getPasswordChangedEmailHtml(data: { email: string; firstName?: string | null }): string {
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
    : (process.env.REPL_URL || 'https://anzglobal.com.au');
  const name = data.firstName || 'there';
  const changedAt = new Date().toLocaleString('en-AU', { 
    dateStyle: 'full', 
    timeStyle: 'short',
    timeZone: 'Australia/Sydney' 
  });
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Changed - CampQ</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
      <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f7fa; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #3465A5 0%, #FF5000 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
                  <img src="${baseUrl}/logo.png" alt="CampQ" style="width: 80px; height: auto; margin-bottom: 16px;" />
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px;">CampQ</h1>
                  <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">Account Security Notification</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <div style="text-align: center; margin-bottom: 30px;">
                    <div style="width: 60px; height: 60px; background-color: #d4edda; border-radius: 50%; display: inline-block; line-height: 60px;">
                      <span style="font-size: 30px;">✓</span>
                    </div>
                  </div>
                  
                  <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px; text-align: center;">Password Successfully Changed</h2>
                  
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Hi ${name},
                  </p>
                  
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Your password for your CampQ account (<strong>${data.email}</strong>) has been successfully changed.
                  </p>
                  
                  <div style="background-color: #f8f9fa; border-left: 4px solid #3465A5; padding: 20px; margin: 30px 0; border-radius: 4px;">
                    <p style="color: #555555; font-size: 14px; margin: 0;">
                      <strong>Changed at:</strong> ${changedAt} (AEST)
                    </p>
                  </div>
                  
                  <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 15px; margin: 30px 0;">
                    <p style="color: #856404; margin: 0; font-size: 14px;">
                      <strong>Didn't make this change?</strong> If you did not change your password, please contact our support team immediately at <a href="mailto:support@anzglobal.com.au" style="color: #3465A5;">support@anzglobal.com.au</a>
                    </p>
                  </div>
                  
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
                    Thank you for keeping your account secure.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; text-align: center;">
                  <p style="color: #666666; font-size: 14px; margin: 0 0 10px 0;">
                    CampQ - Your Gateway to Global Education
                  </p>
                  <p style="color: #999999; font-size: 12px; margin: 0;">
                    This is an automated security notification. Please do not reply to this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// Send password changed confirmation email
export async function sendPasswordChangedEmail(data: { email: string; firstName?: string | null }): Promise<boolean> {
  if (!resend) {
    console.log('Resend not configured - skipping password changed email');
    return false;
  }

  try {
    console.log(`[Email] Attempting to send password changed notification to ${data.email}`);
    
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: 'Password Changed - CampQ',
      html: getPasswordChangedEmailHtml(data),
    });

    if (result.error) {
      console.error(`[Email] Resend error:`, result.error);
      return false;
    }

    console.log(`Password changed email sent to ${data.email}, ID: ${result.data?.id}`);
    return true;
  } catch (error: any) {
    console.error('Error sending password changed email:', error.message);
    return false;
  }
}

// Send team invitation email
export async function sendTeamInvitationEmail(data: TeamInvitationEmailData): Promise<boolean> {
  if (!resend) {
    console.log('Resend not configured - skipping team invitation email');
    return false;
  }

  try {
    console.log(`[Email] Attempting to send team invitation to ${data.email}`);
    console.log(`[Email] From: ${FROM_EMAIL}`);
    
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: `You're Invited to Join CampQ as ${data.roleName}`,
      html: getTeamInvitationEmailHtml(data),
    });

    console.log(`[Email] Full result:`, JSON.stringify(result, null, 2));
    
    if (result.error) {
      console.error(`[Email] Resend error:`, result.error);
      return false;
    }

    console.log(`Team invitation email sent to ${data.email}, ID: ${result.data?.id}`);
    return true;
  } catch (error: any) {
    console.error('Error sending team invitation email:', error.message);
    console.error('Full error:', error);
    return false;
  }
}

// ============================================
// REFERRAL INVITATION EMAIL
// ============================================

interface ReferralInvitationEmailData {
  to: string;
  inviteeName: string;
  referrerName: string;
  referralCode: string;
}

function getReferralInvitationEmailHtml(data: ReferralInvitationEmailData): string {
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
    : (process.env.REPL_URL || 'https://anzglobal.com.au');
  const signupUrl = `${baseUrl}/auth?ref=${data.referralCode}&mode=signup`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Friend Invited You to CampQ</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
      <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f7fa; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #3465A5 0%, #FF5000 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
                  <img src="${baseUrl}/logo.png" alt="CampQ" style="width: 80px; height: auto; margin-bottom: 16px;" />
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px;">CampQ</h1>
                  <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">Your Gateway to Global Education</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Hi ${data.inviteeName}!</h2>
                  
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    <strong>${data.referrerName}</strong> thinks you'd love CampQ and has invited you to join!
                  </p>
                  
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    CampQ helps international students discover and apply to universities in Australia and beyond. 
                    With our AI-powered platform, you can:
                  </p>
                  
                  <ul style="color: #555555; font-size: 16px; line-height: 1.8; margin: 0 0 30px 0; padding-left: 20px;">
                    <li>Browse thousands of courses from top institutions</li>
                    <li>Get personalized course recommendations</li>
                    <li>Apply to multiple universities with one profile</li>
                    <li>Track your application status in real-time</li>
                  </ul>
                  
                  <!-- CTA Button -->
                  <table cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0;">
                    <tr>
                      <td align="center">
                        <a href="${signupUrl}" style="display: inline-block; background-color: #3465A5; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                          Create Your Free Account
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="color: #777777; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                    By signing up through your friend's invitation, you'll both receive special benefits!
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px;">
                  <p style="color: #888888; font-size: 12px; margin: 0; text-align: center;">
                    CampQ | Connecting Students with Global Opportunities
                  </p>
                  <p style="color: #aaaaaa; font-size: 11px; margin: 10px 0 0 0; text-align: center;">
                    This email was sent because ${data.referrerName} invited you to join.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export async function sendReferralInvitationEmail(data: ReferralInvitationEmailData): Promise<boolean> {
  if (!resend) {
    console.log('Resend not configured - skipping referral invitation email');
    return false;
  }

  try {
    console.log(`[Email] Sending referral invitation to ${data.to}`);
    
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: `${data.referrerName} invited you to join CampQ!`,
      html: getReferralInvitationEmailHtml(data),
    });

    if (result.error) {
      console.error(`[Email] Resend error:`, result.error);
      return false;
    }

    console.log(`Referral invitation email sent to ${data.to}, ID: ${result.data?.id}`);
    return true;
  } catch (error: any) {
    console.error('Error sending referral invitation email:', error.message);
    return false;
  }
}

// ============================================
// REFERRAL REGISTRATION CONFIRMATION EMAIL
// ============================================

interface ReferralRegistrationConfirmationData {
  referrerEmail: string;
  referrerName: string;
  inviteeName: string;
  inviteeEmail: string;
}

function getReferralRegistrationConfirmationHtml(data: ReferralRegistrationConfirmationData): string {
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
    : (process.env.REPL_URL || 'https://anzglobal.com.au');
  const affiliateUrl = `${baseUrl}/affiliate`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Friend Just Registered!</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
      <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f7fa; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
                  <img src="${baseUrl}/logo.png" alt="CampQ" style="width: 80px; height: auto; margin-bottom: 16px;" />
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Great News!</h1>
                  <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">Your Referral Just Registered</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Hey ${data.referrerName}!</h2>
                  
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Woohoo! <strong>${data.inviteeName || data.inviteeEmail}</strong> just joined CampQ thanks to you! You're amazing!
                  </p>
                  
                  <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                    <p style="color: #166534; font-size: 16px; margin: 0;">
                      <strong>You're one step closer to earning!</strong> Once they enrol in a course, your referral bonus will be on its way. Cha-ching!
                    </p>
                  </div>
                  
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                    Why stop there? The more friends you invite, the more you earn! Share your referral link with:
                  </p>
                  
                  <ul style="color: #555555; font-size: 16px; line-height: 1.8; margin: 0 0 20px 20px; padding: 0;">
                    <li>Friends who want to study abroad</li>
                    <li>Colleagues looking for new opportunities</li>
                    <li>Family members pursuing education goals</li>
                  </ul>
                  
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Every successful referral puts money in your pocket. There's no limit to how much you can earn!
                  </p>
                  
                  <!-- CTA Button -->
                  <table cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0;">
                    <tr>
                      <td align="center">
                        <a href="${affiliateUrl}" style="display: inline-block; background-color: #3465A5; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                          Invite More Friends Now
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="color: #888888; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
                    Thank you for spreading the word about CampQ!
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px;">
                  <p style="color: #888888; font-size: 12px; margin: 0; text-align: center;">
                    CampQ | Connecting Students with Global Opportunities
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// =====================================================
// STUDENT WELCOME EMAIL
// =====================================================

interface StudentWelcomeEmailData {
  email: string;
  firstName: string;
  lastName?: string;
}

function getStudentWelcomeEmailHtml(data: StudentWelcomeEmailData): string {
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
    : (process.env.REPL_URL || 'https://anzglobal.com.au');
  const profileUrl = `${baseUrl}/student/profile`;
  const coursesUrl = `${baseUrl}/courses`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to CampQ</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
      <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f7fa; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #3465A5 0%, #FF5000 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
                  <img src="${baseUrl}/logo.png" alt="CampQ" style="width: 80px; height: auto; margin-bottom: 16px;" />
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Your Journey Starts Here</h1>
                  <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">Welcome to CampQ</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Hey ${data.firstName}!</h2>
                  
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Welcome to CampQ! We're thrilled to have you join thousands of students pursuing their dream of studying abroad.
                  </p>
                  
                  <div style="background-color: #f0f7ff; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #3465A5; margin: 0 0 15px 0; font-size: 18px;">What's Next?</h3>
                    <ul style="color: #555555; font-size: 16px; line-height: 1.8; margin: 0; padding-left: 20px;">
                      <li>Complete your profile to get personalized course matches</li>
                      <li>Browse 1000+ courses across top Australian universities</li>
                      <li>Get AI-powered recommendations based on your goals</li>
                    </ul>
                  </div>
                  
                  <!-- CTA Button -->
                  <table cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0;">
                    <tr>
                      <td align="center">
                        <a href="${profileUrl}" style="display: inline-block; background-color: #3465A5; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                          Complete Your Profile
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Need help? Our friendly Zan assistant is available 24/7 to guide you!
                  </p>
                  
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0;">
                    Or explore our course catalog:
                    <a href="${coursesUrl}" style="color: #3465A5; text-decoration: none; font-weight: 600;">Browse Courses</a>
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px;">
                  <p style="color: #888888; font-size: 14px; line-height: 1.6; margin: 0 0 10px 0; text-align: center;">
                    © 2026 CampQ
                  </p>
                  <p style="color: #888888; font-size: 12px; line-height: 1.6; margin: 0; text-align: center;">
                    You're receiving this because you signed up at anzglobal.com.au
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export async function sendStudentWelcomeEmail(data: StudentWelcomeEmailData): Promise<boolean> {
  if (!resend) {
    console.log('Resend not configured - skipping student welcome email');
    return false;
  }

  try {
    console.log(`[Email] Sending welcome email to ${data.email}`);
    
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: `Welcome to CampQ, ${data.firstName}!`,
      html: getStudentWelcomeEmailHtml(data),
    });

    if (result.error) {
      console.error(`[Email] Resend error:`, result.error);
      return false;
    }

    console.log(`Welcome email sent to ${data.email}, ID: ${result.data?.id}`);
    return true;
  } catch (error: any) {
    console.error('Error sending welcome email:', error.message);
    return false;
  }
}

// =====================================================
// PROFILE COMPLETION REMINDER EMAIL
// =====================================================

interface ProfileCompletionReminderData {
  email: string;
  firstName: string;
  completionPercentage: number;
  incompleteSections: string[];
  reminderNumber: number; // 1, 2, or 3
}

function getProfileCompletionReminderHtml(data: ProfileCompletionReminderData): string {
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
    : (process.env.REPL_URL || 'https://anzglobal.com.au');
  const profileUrl = `${baseUrl}/student/profile`;
  
  // Different messaging based on reminder number
  let greeting = '';
  let message = '';
  
  switch (data.reminderNumber) {
    case 1:
      greeting = `Hey ${data.firstName}!`;
      message = `You're ${data.completionPercentage}% of the way there! Complete your profile to unlock personalized course recommendations.`;
      break;
    case 2:
      greeting = `Hi ${data.firstName}!`;
      message = `Don't miss out on personalized course matches! Your profile is ${data.completionPercentage}% complete - just a few more details to go.`;
      break;
    case 3:
      greeting = `We miss you, ${data.firstName}!`;
      message = `Your profile is still waiting at ${data.completionPercentage}% complete. Take 5 minutes to finish and unlock all the benefits!`;
      break;
    default:
      greeting = `Hey ${data.firstName}!`;
      message = `Complete your profile to get the most out of CampQ.`;
  }
  
  const sectionsHtml = data.incompleteSections.length > 0 
    ? `
      <div style="background-color: #fef3cd; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="color: #856404; margin: 0 0 15px 0; font-size: 16px;">Sections to Complete:</h3>
        <ul style="color: #856404; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
          ${data.incompleteSections.map(section => `<li>${section}</li>`).join('')}
        </ul>
      </div>
    ` : '';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Complete Your Profile - CampQ</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
      <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f7fa; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #3465A5 0%, #FF5000 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
                  <img src="${baseUrl}/logo.png" alt="CampQ" style="width: 80px; height: auto; margin-bottom: 16px;" />
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Complete Your Profile</h1>
                  <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">You're ${data.completionPercentage}% there!</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">${greeting}</h2>
                  
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    ${message}
                  </p>
                  
                  <!-- Progress Bar -->
                  <div style="background-color: #e9ecef; border-radius: 10px; height: 20px; margin: 20px 0; overflow: hidden;">
                    <div style="background: linear-gradient(90deg, #3465A5 0%, #FF5000 100%); height: 100%; width: ${data.completionPercentage}%; border-radius: 10px;"></div>
                  </div>
                  <p style="color: #888888; font-size: 14px; text-align: center; margin: 0 0 20px 0;">
                    ${data.completionPercentage}% Complete
                  </p>
                  
                  <div style="background-color: #d4edda; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #155724; margin: 0 0 10px 0; font-size: 16px;">What you'll unlock:</h3>
                    <ul style="color: #155724; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                      <li>Personalized course recommendations</li>
                      <li>AI-powered application assistance</li>
                      <li>Faster application processing</li>
                    </ul>
                  </div>
                  
                  ${sectionsHtml}
                  
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    It only takes 5-10 minutes to complete!
                  </p>
                  
                  <!-- CTA Button -->
                  <table cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0;">
                    <tr>
                      <td align="center">
                        <a href="${profileUrl}" style="display: inline-block; background-color: #3465A5; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                          Complete My Profile
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px;">
                  <p style="color: #888888; font-size: 14px; line-height: 1.6; margin: 0 0 10px 0; text-align: center;">
                    © 2026 CampQ
                  </p>
                  <p style="color: #888888; font-size: 12px; line-height: 1.6; margin: 0; text-align: center;">
                    <a href="${baseUrl}/unsubscribe" style="color: #888888; text-decoration: underline;">Unsubscribe</a> from reminder emails
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export async function sendProfileCompletionReminder(data: ProfileCompletionReminderData): Promise<boolean> {
  if (!resend) {
    console.log('Resend not configured - skipping profile completion reminder');
    return false;
  }

  try {
    // Different subjects based on reminder number
    let subject = '';
    switch (data.reminderNumber) {
      case 1:
        subject = `${data.firstName}, you're almost there! Complete your profile`;
        break;
      case 2:
        subject = `${data.firstName}, don't miss out on personalized course matches!`;
        break;
      case 3:
        subject = `${data.firstName}, we miss you! Your profile is waiting`;
        break;
      default:
        subject = `Complete your profile - CampQ`;
    }
    
    console.log(`[Email] Sending profile completion reminder #${data.reminderNumber} to ${data.email}`);
    
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject,
      html: getProfileCompletionReminderHtml(data),
    });

    if (result.error) {
      console.error(`[Email] Resend error:`, result.error);
      return false;
    }

    console.log(`Profile completion reminder #${data.reminderNumber} sent to ${data.email}, ID: ${result.data?.id}`);
    return true;
  } catch (error: any) {
    console.error('Error sending profile completion reminder:', error.message);
    return false;
  }
}

export async function sendReferralRegistrationConfirmation(data: ReferralRegistrationConfirmationData): Promise<boolean> {
  if (!resend) {
    console.log('Resend not configured - skipping referral registration confirmation email');
    return false;
  }

  try {
    console.log(`[Email] Sending referral registration confirmation to ${data.referrerEmail}`);
    
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.referrerEmail,
      subject: `Woohoo! ${data.inviteeName || 'Your friend'} just joined - keep inviting to earn more!`,
      html: getReferralRegistrationConfirmationHtml(data),
    });

    if (result.error) {
      console.error(`[Email] Resend error:`, result.error);
      return false;
    }

    console.log(`Referral registration confirmation email sent to ${data.referrerEmail}, ID: ${result.data?.id}`);
    return true;
  } catch (error: any) {
    console.error('Error sending referral registration confirmation email:', error.message);
    return false;
  }
}