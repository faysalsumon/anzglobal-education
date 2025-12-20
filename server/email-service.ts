import { Resend } from 'resend';

// Initialize Resend with API key
const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error('WARNING: RESEND_API_KEY is not set. Email notifications will not be sent.');
}

const resend = apiKey ? new Resend(apiKey) : null;

// Email configuration
const FROM_EMAIL = 'ANZ Global Education <noreply@anzglobal.com.au>';
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
                  <p style="color: #666666; font-size: 14px; margin: 0 0 10px 0;">ANZ Global Education</p>
                  <p style="color: #999999; font-size: 12px; margin: 0;">© 2024 ANZ Global Education. All rights reserved.</p>
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
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px;">📄 Document Request</h1>
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
                  <p style="color: #666666; font-size: 14px; margin: 0 0 10px 0;">ANZ Global Education</p>
                  <p style="color: #999999; font-size: 12px; margin: 0;">© 2024 ANZ Global Education. All rights reserved.</p>
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
  const userTypeMessages = {
    student: {
      title: 'Welcome to Your Study Journey!',
      description: 'Your account has been verified and you\'re ready to explore thousands of courses from top universities worldwide.',
      cta: 'Start Exploring Courses',
      ctaUrl: 'https://anzglobal.com.au/courses'
    },
    institution: {
      title: 'Welcome to ANZ Global Education!',
      description: 'Your institution account is now active. Start connecting with international students and showcase your programs.',
      cta: 'Access Your Dashboard',
      ctaUrl: 'https://anzglobal.com.au/university/dashboard'
    },
    admin: {
      title: 'Welcome to ANZ Global Education!',
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
      <title>Welcome to ANZ Global Education</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
      <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f7fa; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <tr>
                <td style="background: linear-gradient(135deg, #3465A5 0%, #FF5000 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px;">ANZ Global Education</h1>
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
                    ANZ Global Education | Your Gateway to Global Education<br>
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
  const missingFieldsList = data.missingFields.map(field => `<li>${field}</li>`).join('');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Complete Your Profile - ANZ Global Education</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
      <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f7fa; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <tr>
                <td style="background: linear-gradient(135deg, #3465A5 0%, #FF5000 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px;">ANZ Global Education</h1>
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
                    ANZ Global Education | Your Gateway to Global Education<br>
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
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Application Submitted - ANZ Global Education</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
      <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f7fa; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <tr>
                <td style="background: linear-gradient(135deg, #3465A5 0%, #FF5000 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
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
                    ANZ Global Education | Your Gateway to Global Education<br>
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
      subject: `Welcome to ANZ Global Education, ${data.firstName}!`,
      html: getWelcomeEmailHtml(data),
    });

    console.log(`Welcome email sent to ${data.email}`);
  } catch (error: any) {
    console.error('Error sending welcome email:', error.message);
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
    super_admin: 'Super Admin',
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
      subject: 'Your Admin Account Has Been Approved - ANZ Global Education',
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
      subject: 'Admin Account Request Update - ANZ Global Education',
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
  const inviteUrl = `${process.env.REPL_URL || 'https://anzglobal.com.au'}/auth/accept-invite?token=${data.inviteToken}`;
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
      <title>You're Invited to Join ANZ Global Education</title>
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
                  <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">You're Invited to Join Our Team!</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Welcome to the Team!</h2>
                  
                  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    <strong>${data.inviterName}</strong> has invited you to join the ANZ Global Education platform as a <strong>${data.roleName}</strong>.
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
                    ANZ Global Education - Your Gateway to Global Education
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
      subject: `You're Invited to Join ANZ Global Education as ${data.roleName}`,
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