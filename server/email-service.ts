import { Resend } from 'resend';

// Initialize Resend with API key
const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error('WARNING: RESEND_API_KEY is not set. Email notifications will not be sent.');
}

const resend = apiKey ? new Resend(apiKey) : null;

// Email configuration
const FROM_EMAIL = 'onboarding@resend.dev'; // Use Resend's default sender for testing
const ADMIN_EMAIL = 'admin@anzglobaleducation.com'; // Change this to your actual admin email

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
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Thank you for contacting ANZ Global Education</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
      <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f7fa; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #3465A5 0%, #FF5000 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px;">ANZ Global Education</h1>
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
                    We have successfully received your ${isStudent ? 'study inquiry' : 'partnership inquiry'} and appreciate your interest in ANZ Global Education.
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
                    ANZ Global Education - Connecting Students with Global Opportunities
                  </p>
                  <p style="color: #999999; font-size: 12px; margin: 0;">
                    © 2024 ANZ Global Education. All rights reserved.
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
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Contact Inquiry - ANZ Global Education</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
      <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f7fa; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background-color: ${isStudent ? '#3465A5' : '#FF5000'}; padding: 30px; border-radius: 12px 12px 0 0;">
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
                    This is an automated notification from ANZ Global Education Contact System
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