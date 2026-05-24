import { Resend } from 'resend';
import { db } from './db';
import { globalNotificationDefaults, userNotificationOverrides, emailTemplates } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

// Initialize Resend with API key
const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error('WARNING: RESEND_API_KEY is not set. Email notifications will not be sent.');
}

const resend = apiKey ? new Resend(apiKey) : null;

// Email configuration
const FROM_EMAIL = 'ANZ Global Education <noreply@anzglobal.com.au>';
const ADMIN_EMAIL_AU = 'info@anzglobal.com.au';
const ADMIN_EMAIL_BD = 'info@anzglobal.com.bd';

/**
 * Get the region-aware admin notification email address.
 * Routes to info@anzglobal.com.bd for Bangladesh region,
 * defaults to info@anzglobal.com.au for Australia and all other regions.
 */
export function getRegionAdminEmail(regionCode?: string | null): string {
  if (regionCode?.toUpperCase() === 'BD') {
    return ADMIN_EMAIL_BD;
  }
  return ADMIN_EMAIL_AU;
}

/**
 * Check if an email notification should be sent based on global defaults and user overrides.
 * Returns true if the notification should be sent via email.
 */
export async function shouldSendEmailNotification(
  notificationType: string,
  role?: string,
  userId?: string
): Promise<boolean> {
  try {
    if (userId) {
      const overrides = await db.select().from(userNotificationOverrides)
        .where(and(
          eq(userNotificationOverrides.userId, userId),
          eq(userNotificationOverrides.notificationType, notificationType),
        ));
      if (overrides.length > 0 && overrides[0].emailEnabled !== null) {
        return overrides[0].emailEnabled;
      }
    }

    if (role) {
      const defaults = await db.select().from(globalNotificationDefaults)
        .where(and(
          eq(globalNotificationDefaults.notificationType, notificationType),
          eq(globalNotificationDefaults.role, role),
        ));
      if (defaults.length > 0) {
        return defaults[0].emailEnabled;
      }
    }

    return true;
  } catch (error) {
    console.error('Error checking email notification preference:', error);
    return true;
  }
}

/**
 * Get a custom email template for a notification type, if one exists.
 * Returns the template with variables substituted, or null if no custom template.
 */
export async function getCustomEmailTemplate(
  notificationType: string,
  variables: Record<string, string>
): Promise<{ subject: string; body: string } | null> {
  try {
    const templates = await db.select().from(emailTemplates)
      .where(eq(emailTemplates.notificationType, notificationType));

    if (templates.length === 0) return null;

    const tmpl = templates[0];
    let subject = tmpl.subjectTemplate;
    let body = tmpl.bodyTemplate;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    }

    return { subject, body };
  } catch (error) {
    console.error('Error fetching custom email template:', error);
    return null;
  }
}

function getEmailBaseUrl(): string {
  if (process.env.SITE_URL) {
    return process.env.SITE_URL.replace(/\/$/, '');
  }
  if (process.env.REPLIT_DOMAINS) {
    const primaryDomain = process.env.REPLIT_DOMAINS.split(',')[0];
    if (primaryDomain) return `https://${primaryDomain}`;
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  return 'https://anzglobal.com.au';
}

const REGION_DOMAINS: Record<string, string> = {
  BD: 'anzglobal.com.bd',
  AU: 'anzglobal.com.au',
};

function getRegionDomain(regionCode?: string): string {
  if (regionCode && REGION_DOMAINS[regionCode.toUpperCase()]) {
    return REGION_DOMAINS[regionCode.toUpperCase()];
  }
  return 'anzglobal.com.au';
}

function getRegionWebsiteUrl(regionCode?: string): string {
  return `https://www.${getRegionDomain(regionCode)}`;
}

const EMAIL_COLORS = {
  primary: '#3465A5',
  primaryDark: '#2a5084',
  accent: '#FF5000',
  textDark: '#333333',
  textBody: '#555555',
  textSecondary: '#888888',
  textLight: '#999999',
  background: '#f5f7fa',
  card: '#ffffff',
  border: '#e5e7eb',
  infoBox: '#eef4fb',
  warningBox: '#fff5eb',
  warningText: '#c2410c',
  success: '#16a34a',
  successBg: '#f0fdf4',
  footerBg: '#f9fafb',
};

const EMAIL_FONT = "'Nunito', 'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

function emailHeader(baseUrl: string, title: string, subtitle?: string): string {
  return `
    <tr>
      <td style="background-color: #ffffff; padding: 40px; border-radius: 12px 12px 0 0; text-align: center; border-bottom: 3px solid ${EMAIL_COLORS.primary};">
        <img src="${baseUrl}/logo.png" alt="ANZ Global Education" style="width: 80px; height: auto; margin-bottom: 16px;" />
        <h1 style="color: ${EMAIL_COLORS.textDark}; margin: 0; font-size: 24px; font-weight: 700; font-family: ${EMAIL_FONT};">${title}</h1>
        ${subtitle ? `<p style="color: ${EMAIL_COLORS.primary}; margin: 8px 0 0 0; font-size: 14px; font-weight: 600; font-family: ${EMAIL_FONT};">${subtitle}</p>` : ''}
      </td>
    </tr>`;
}

function emailFooter(baseUrl: string, regionCode?: string): string {
  const domain = getRegionDomain(regionCode);
  const websiteUrl = `https://www.${domain}`;
  return `
    <tr>
      <td style="background-color: ${EMAIL_COLORS.footerBg}; padding: 30px 40px; border-radius: 0 0 12px 12px; text-align: center;">
        <p style="color: ${EMAIL_COLORS.textSecondary}; font-size: 13px; margin: 0 0 8px 0; font-family: ${EMAIL_FONT};">
          ANZ Global Education | Your Gateway to Global Education
        </p>
        <p style="color: ${EMAIL_COLORS.textLight}; font-size: 12px; margin: 0;">
          <a href="${websiteUrl}" style="color: ${EMAIL_COLORS.primary}; text-decoration: none;">www.${domain}</a>
        </p>
      </td>
    </tr>`;
}

function emailButton(href: string, label: string, variant: 'primary' | 'accent' = 'primary'): string {
  const bg = variant === 'accent' ? EMAIL_COLORS.accent : EMAIL_COLORS.primary;
  return `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${href}" style="display: inline-block; background-color: ${bg}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; font-family: ${EMAIL_FONT};">${label}</a>
    </div>`;
}

function emailInfoBox(title: string, content: string): string {
  return `
    <div style="background-color: ${EMAIL_COLORS.infoBox}; border-left: 4px solid ${EMAIL_COLORS.primary}; padding: 20px; margin: 24px 0; border-radius: 0 6px 6px 0;">
      <h3 style="color: ${EMAIL_COLORS.primary}; margin: 0 0 12px 0; font-size: 16px; font-family: ${EMAIL_FONT};">${title}</h3>
      <div style="color: ${EMAIL_COLORS.textBody}; font-size: 14px; line-height: 1.6;">${content}</div>
    </div>`;
}

function emailWarningBox(content: string): string {
  return `
    <div style="background-color: ${EMAIL_COLORS.warningBox}; border-left: 4px solid ${EMAIL_COLORS.accent}; padding: 16px 20px; margin: 24px 0; border-radius: 0 6px 6px 0;">
      <p style="color: ${EMAIL_COLORS.warningText}; margin: 0; font-size: 14px; line-height: 1.5; font-family: ${EMAIL_FONT};">${content}</p>
    </div>`;
}

function emailShell(baseUrl: string, title: string, subtitle: string | undefined, bodyContent: string, regionCode?: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: ${EMAIL_FONT}; background-color: ${EMAIL_COLORS.background};">
  <table cellpadding="0" cellspacing="0" width="100%" style="background-color: ${EMAIL_COLORS.background}; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" width="600" style="background-color: ${EMAIL_COLORS.card}; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          ${emailHeader(baseUrl, title, subtitle)}
          <tr>
            <td style="padding: 40px;">
              ${bodyContent}
            </td>
          </tr>
          ${emailFooter(baseUrl, regionCode)}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

interface ContactInquiryEmailData {
  inquiryType: 'student' | 'institution';
  studentName?: string;
  institutionName?: string;
  contactPerson?: string;
  email: string;
  phone?: string;
  message: string;
  country?: string;
  courseInterest?: string;
  studyLevel?: string;
  visaStatus?: string;
  website?: string;
  partnershipType?: string;
  regionCode?: string;
}

function getUserConfirmationEmailHtml(data: ContactInquiryEmailData): string {
  const name = data.inquiryType === 'student' ? data.studentName : data.contactPerson;
  const isStudent = data.inquiryType === 'student';
  const baseUrl = getEmailBaseUrl();

  const bodyContent = `
    <h2 style="color: ${EMAIL_COLORS.textDark}; margin: 0 0 20px 0; font-size: 24px; font-family: ${EMAIL_FONT};">Thank You for Contacting Us!</h2>
    
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">
      Dear ${name || 'Valued Contact'},
    </p>
    
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">
      We have successfully received your ${isStudent ? 'study inquiry' : 'partnership inquiry'} and appreciate your interest in ANZ Global Education.
    </p>
    
    ${emailInfoBox('Your Inquiry Details:', `
      <table cellpadding="5" cellspacing="0" style="width: 100%;">
        ${isStudent ? `
          <tr>
            <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; padding: 5px 0;"><strong>Name:</strong></td>
            <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; padding: 5px 0;">${data.studentName}</td>
          </tr>
          ${data.country ? `
          <tr>
            <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; padding: 5px 0;"><strong>Country:</strong></td>
            <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; padding: 5px 0;">${data.country}</td>
          </tr>
          ` : ''}
          ${data.courseInterest ? `
          <tr>
            <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; padding: 5px 0;"><strong>Course Interest:</strong></td>
            <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; padding: 5px 0;">${data.courseInterest}</td>
          </tr>
          ` : ''}
          ${data.studyLevel ? `
          <tr>
            <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; padding: 5px 0;"><strong>Study Level:</strong></td>
            <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; padding: 5px 0;">${data.studyLevel}</td>
          </tr>
          ` : ''}
        ` : `
          <tr>
            <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; padding: 5px 0;"><strong>Institution:</strong></td>
            <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; padding: 5px 0;">${data.institutionName}</td>
          </tr>
          <tr>
            <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; padding: 5px 0;"><strong>Contact Person:</strong></td>
            <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; padding: 5px 0;">${data.contactPerson}</td>
          </tr>
          ${data.partnershipType ? `
          <tr>
            <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; padding: 5px 0;"><strong>Partnership Type:</strong></td>
            <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; padding: 5px 0;">${data.partnershipType}</td>
          </tr>
          ` : ''}
        `}
        <tr>
          <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; padding: 5px 0;"><strong>Email:</strong></td>
          <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; padding: 5px 0;">${data.email}</td>
        </tr>
        ${data.phone ? `
        <tr>
          <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; padding: 5px 0;"><strong>Phone:</strong></td>
          <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; padding: 5px 0;">${data.phone}</td>
        </tr>
        ` : ''}
      </table>
    `)}
    
    <h3 style="color: ${EMAIL_COLORS.textDark}; margin: 30px 0 15px 0; font-size: 18px; font-family: ${EMAIL_FONT};">What Happens Next?</h3>
    
    <ul style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px; font-family: ${EMAIL_FONT};">
      <li>Our team will review your inquiry within 24-48 hours</li>
      <li>A dedicated counselor will be assigned to assist you</li>
      <li>You will receive a personalized response via email</li>
      ${isStudent ? 
        '<li>We may suggest suitable courses and institutions based on your profile</li>' :
        '<li>We will schedule a meeting to discuss partnership opportunities</li>'
      }
    </ul>
    
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; margin: 20px 0; font-family: ${EMAIL_FONT};">
      If you have any urgent questions, please don't hesitate to contact us directly.
    </p>
    
    ${emailButton(baseUrl, 'Visit Our Website')}
  `;

  return emailShell(baseUrl, 'ANZ Global Education', 'Your Gateway to Global Education', bodyContent, data.regionCode);
}

function getAdminNotificationEmailHtml(data: ContactInquiryEmailData & { id: string }): string {
  const isStudent = data.inquiryType === 'student';
  const baseUrl = getEmailBaseUrl();

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Contact Inquiry - ANZ Global Education</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: ${EMAIL_FONT}; background-color: ${EMAIL_COLORS.background};">
      <table cellpadding="0" cellspacing="0" width="100%" style="background-color: ${EMAIL_COLORS.background}; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" width="600" style="background-color: ${EMAIL_COLORS.card}; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
              <tr>
                <td style="background-color: #ffffff; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; border-bottom: 3px solid ${EMAIL_COLORS.primary};">
                  <img src="${baseUrl}/logo.png" alt="ANZ Global Education" style="width: 80px; height: auto; margin-bottom: 16px;" />
                  <h1 style="color: ${EMAIL_COLORS.textDark}; margin: 0; font-size: 24px; font-weight: 700; font-family: ${EMAIL_FONT};">New ${isStudent ? 'Student' : 'Institution'} Inquiry</h1>
                  <p style="color: ${EMAIL_COLORS.primary}; margin: 8px 0 0 0; font-size: 14px; font-weight: 600;">Inquiry ID: ${data.id}</p>
                </td>
              </tr>
              
              <tr>
                <td style="padding: 30px;">
                  ${emailWarningBox('<strong>Action Required:</strong> Please review and respond to this inquiry within 24-48 hours.')}
                  
                  <h2 style="color: ${EMAIL_COLORS.textDark}; margin: 0 0 20px 0; font-size: 20px; font-family: ${EMAIL_FONT};">Contact Details</h2>
                  
                  <table cellpadding="8" cellspacing="0" style="width: 100%; border: 1px solid ${EMAIL_COLORS.border}; border-radius: 6px;">
                    ${isStudent ? `
                      <tr style="background-color: ${EMAIL_COLORS.footerBg};">
                        <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};"><strong>Name:</strong></td>
                        <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${data.studentName}</td>
                      </tr>
                      <tr>
                        <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};"><strong>Email:</strong></td>
                        <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">
                          <a href="mailto:${data.email}" style="color: ${EMAIL_COLORS.primary}; text-decoration: none;">${data.email}</a>
                        </td>
                      </tr>
                      ${data.phone ? `
                      <tr style="background-color: ${EMAIL_COLORS.footerBg};">
                        <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};"><strong>Phone:</strong></td>
                        <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${data.phone}</td>
                      </tr>
                      ` : ''}
                      ${data.country ? `
                      <tr ${data.phone ? '' : `style="background-color: ${EMAIL_COLORS.footerBg};"`}>
                        <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};"><strong>Country:</strong></td>
                        <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${data.country}</td>
                      </tr>
                      ` : ''}
                      ${data.courseInterest ? `
                      <tr style="background-color: ${EMAIL_COLORS.footerBg};">
                        <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};"><strong>Course Interest:</strong></td>
                        <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${data.courseInterest}</td>
                      </tr>
                      ` : ''}
                      ${data.studyLevel ? `
                      <tr>
                        <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};"><strong>Study Level:</strong></td>
                        <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${data.studyLevel}</td>
                      </tr>
                      ` : ''}
                      ${data.visaStatus ? `
                      <tr style="background-color: ${EMAIL_COLORS.footerBg};">
                        <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; padding: 10px;"><strong>Visa Status:</strong></td>
                        <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; padding: 10px;">${data.visaStatus}</td>
                      </tr>
                      ` : ''}
                    ` : `
                      <tr style="background-color: ${EMAIL_COLORS.footerBg};">
                        <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};"><strong>Institution:</strong></td>
                        <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${data.institutionName}</td>
                      </tr>
                      <tr>
                        <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};"><strong>Contact Person:</strong></td>
                        <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${data.contactPerson}</td>
                      </tr>
                      <tr style="background-color: ${EMAIL_COLORS.footerBg};">
                        <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};"><strong>Email:</strong></td>
                        <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">
                          <a href="mailto:${data.email}" style="color: ${EMAIL_COLORS.primary}; text-decoration: none;">${data.email}</a>
                        </td>
                      </tr>
                      ${data.phone ? `
                      <tr>
                        <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};"><strong>Phone:</strong></td>
                        <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${data.phone}</td>
                      </tr>
                      ` : ''}
                      ${data.website ? `
                      <tr style="background-color: ${EMAIL_COLORS.footerBg};">
                        <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};"><strong>Website:</strong></td>
                        <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">
                          <a href="${data.website}" style="color: ${EMAIL_COLORS.primary}; text-decoration: none;">${data.website}</a>
                        </td>
                      </tr>
                      ` : ''}
                      ${data.partnershipType ? `
                      <tr>
                        <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; padding: 10px;"><strong>Partnership Type:</strong></td>
                        <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; padding: 10px;">${data.partnershipType}</td>
                      </tr>
                      ` : ''}
                    `}
                  </table>
                  
                  <h3 style="color: ${EMAIL_COLORS.textDark}; margin: 30px 0 15px 0; font-size: 18px; font-family: ${EMAIL_FONT};">Message</h3>
                  <div style="background-color: ${EMAIL_COLORS.infoBox}; border-left: 4px solid ${EMAIL_COLORS.primary}; padding: 15px; border-radius: 0 6px 6px 0;">
                    <p style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${data.message}</p>
                  </div>
                  
                  <div style="text-align: center; margin: 40px 0;">
                    <a href="${baseUrl}/admin/dashboard" style="display: inline-block; background-color: ${EMAIL_COLORS.primary}; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 6px; font-size: 14px; font-weight: 600; margin: 0 10px; font-family: ${EMAIL_FONT};">View in Dashboard</a>
                    <a href="mailto:${data.email}" style="display: inline-block; background-color: ${EMAIL_COLORS.primary}; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 6px; font-size: 14px; font-weight: 600; margin: 0 10px; font-family: ${EMAIL_FONT};">Reply to Inquiry</a>
                  </div>
                </td>
              </tr>
              
              <tr>
                <td style="background-color: ${EMAIL_COLORS.footerBg}; padding: 20px; border-radius: 0 0 12px 12px; text-align: center;">
                  <p style="color: ${EMAIL_COLORS.textSecondary}; font-size: 13px; margin: 0 0 8px 0; font-family: ${EMAIL_FONT};">
                    ANZ Global Education | Your Gateway to Global Education
                  </p>
                  <p style="color: ${EMAIL_COLORS.textLight}; font-size: 12px; margin: 0; font-family: ${EMAIL_FONT};">
                    <a href="https://www.${getRegionDomain(data.regionCode)}" style="color: ${EMAIL_COLORS.primary}; text-decoration: none;">www.${getRegionDomain(data.regionCode)}</a>
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
  }
}

// Send notification email to admin
export async function sendAdminNotification(data: ContactInquiryEmailData & { id: string; regionCode?: string }): Promise<void> {
  if (!resend) {
    console.log('Resend not configured - skipping admin notification email');
    return;
  }
  
  try {
    const shouldSend = await shouldSendEmailNotification('contact_inquiry', 'all_admins');
    if (!shouldSend) {
      console.log('Contact inquiry admin notification suppressed by preferences');
      return;
    }
    const adminEmail = getRegionAdminEmail(data.regionCode);
    const defaultSubject = data.inquiryType === 'student'
      ? `New Student Inquiry - ${data.studentName} (${data.country || 'Unknown Country'})`
      : `New Institution Inquiry - ${data.institutionName}`;

    const customTemplate = await getCustomEmailTemplate('contact_inquiry', {
      contactName: data.studentName || data.institutionName || '',
      contactEmail: data.email,
      subject: defaultSubject,
      message: '',
      regionCode: data.regionCode || 'AU',
    });
    
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: adminEmail,
      subject: customTemplate?.subject || defaultSubject,
      html: getAdminNotificationEmailHtml(data),
    });
    
    console.log(`Admin notification email sent for inquiry ${data.id}, ID: ${result.data?.id}`);
  } catch (error: any) {
    console.error('Error sending admin notification email:', error);
    console.error('Error details:', error.message);
  }
}

// Combined function to send both emails
export async function sendContactInquiryEmails(data: ContactInquiryEmailData & { id: string; regionCode?: string }): Promise<void> {
  await Promise.all([
    sendContactInquiryConfirmation(data),
    sendAdminNotification(data),
  ]);
}

// ============================================
// ADMIN NOTIFICATION: NEW USER SIGN-UP
// ============================================

interface NewSignupAdminNotificationData {
  firstName: string;
  lastName: string;
  email: string;
  userType: string;
  regionCode?: string;
  entrySource?: string;
}

function getNewSignupAdminEmailHtml(data: NewSignupAdminNotificationData): string {
  const baseUrl = getEmailBaseUrl();
  const userTypeLabel = data.userType === 'platform_admin' ? 'Platform Admin' : 'Student';

  const bodyContent = `
    <h2 style="color: ${EMAIL_COLORS.textDark}; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">New ${userTypeLabel} Registration</h2>
    
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; font-family: ${EMAIL_FONT};">
      A new ${userTypeLabel.toLowerCase()} has registered on ANZ Global Education.
    </p>
    
    ${emailInfoBox('Registration Details', `
      <table cellpadding="5" cellspacing="0" style="width: 100%;">
        <tr>
          <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; padding: 5px 0;"><strong>Name:</strong></td>
          <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; padding: 5px 0;">${data.firstName} ${data.lastName}</td>
        </tr>
        <tr>
          <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; padding: 5px 0;"><strong>Email:</strong></td>
          <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; padding: 5px 0;">
            <a href="mailto:${data.email}" style="color: ${EMAIL_COLORS.primary}; text-decoration: none;">${data.email}</a>
          </td>
        </tr>
        <tr>
          <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; padding: 5px 0;"><strong>Account Type:</strong></td>
          <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; padding: 5px 0;">${userTypeLabel}</td>
        </tr>
        ${data.entrySource ? `
        <tr>
          <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; padding: 5px 0;"><strong>Source:</strong></td>
          <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; padding: 5px 0;">${data.entrySource}</td>
        </tr>
        ` : ''}
      </table>
    `)}
    
    ${emailButton(`${baseUrl}/admin/dashboard`, 'View in Dashboard')}
  `;

  return emailShell(baseUrl, 'New Registration', `A new ${userTypeLabel.toLowerCase()} has joined`, bodyContent, data.regionCode);
}

export async function sendNewSignupAdminNotification(data: NewSignupAdminNotificationData): Promise<void> {
  if (!resend) {
    console.log('Resend not configured - skipping new signup admin notification');
    return;
  }

  try {
    const shouldSend = await shouldSendEmailNotification('new_signup', 'all_admins');
    if (!shouldSend) {
      console.log('New signup admin notification suppressed by preferences');
      return;
    }

    const adminEmail = getRegionAdminEmail(data.regionCode);
    const userTypeLabel = data.userType === 'platform_admin' ? 'Admin' : 'Student';

    const customTemplate = await getCustomEmailTemplate('new_signup', {
      userName: `${data.firstName} ${data.lastName}`,
      userEmail: data.email,
      regionCode: data.regionCode || 'AU',
      signupDate: new Date().toLocaleDateString(),
    });

    await resend.emails.send({
      from: FROM_EMAIL,
      to: adminEmail,
      subject: customTemplate?.subject || `New ${userTypeLabel} Registration: ${data.firstName} ${data.lastName}`,
      html: getNewSignupAdminEmailHtml(data),
    });

    console.log(`New signup admin notification sent to ${adminEmail} for ${data.email}`);
  } catch (error: any) {
    console.error('Error sending new signup admin notification:', error.message);
  }
}

// ============================================
// ADMIN NOTIFICATION: NEW STUDENT LEAD
// ============================================

interface NewLeadAdminNotificationData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  courseTitle: string;
  universityName: string;
  country?: string;
  regionCode?: string;
  entrySource?: string;
  contactId?: string;
}

function getNewLeadAdminEmailHtml(data: NewLeadAdminNotificationData): string {
  const baseUrl = getEmailBaseUrl();

  const bodyContent = `
    <h2 style="color: ${EMAIL_COLORS.textDark}; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">New Student Inquiry</h2>
    
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; font-family: ${EMAIL_FONT};">
      A new student has expressed interest in a course on ANZ Global Education.
    </p>
    
    ${emailInfoBox('Lead Details', `
      <table cellpadding="5" cellspacing="0" style="width: 100%;">
        <tr>
          <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; padding: 5px 0;"><strong>Name:</strong></td>
          <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; padding: 5px 0;">${data.firstName} ${data.lastName}</td>
        </tr>
        <tr>
          <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; padding: 5px 0;"><strong>Email:</strong></td>
          <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; padding: 5px 0;">
            <a href="mailto:${data.email}" style="color: ${EMAIL_COLORS.primary}; text-decoration: none;">${data.email}</a>
          </td>
        </tr>
        ${data.phone ? `
        <tr>
          <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; padding: 5px 0;"><strong>Phone:</strong></td>
          <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; padding: 5px 0;">${data.phone}</td>
        </tr>
        ` : ''}
        ${data.country ? `
        <tr>
          <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; padding: 5px 0;"><strong>Country:</strong></td>
          <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; padding: 5px 0;">${data.country}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; padding: 5px 0;"><strong>Course:</strong></td>
          <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; padding: 5px 0;">${data.courseTitle}</td>
        </tr>
        <tr>
          <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; padding: 5px 0;"><strong>Institution:</strong></td>
          <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; padding: 5px 0;">${data.universityName}</td>
        </tr>
        ${data.entrySource ? `
        <tr>
          <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; padding: 5px 0;"><strong>Source:</strong></td>
          <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; padding: 5px 0;">${data.entrySource}</td>
        </tr>
        ` : ''}
      </table>
    `)}
    
    ${emailWarningBox('<strong>Action Required:</strong> Please follow up with this lead within 24-48 hours.')}
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${baseUrl}/admin#crm-contacts" style="display: inline-block; background-color: ${EMAIL_COLORS.primary}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; font-family: ${EMAIL_FONT};">View in CRM</a>
      <a href="mailto:${data.email}" style="display: inline-block; background-color: ${EMAIL_COLORS.accent}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; margin-left: 12px; font-family: ${EMAIL_FONT};">Reply to Lead</a>
    </div>
  `;

  return emailShell(baseUrl, 'New Student Inquiry', 'Action Required', bodyContent, data.regionCode);
}

export async function sendNewLeadAdminNotification(data: NewLeadAdminNotificationData): Promise<void> {
  if (!resend) {
    console.log('Resend not configured - skipping new lead admin notification');
    return;
  }

  try {
    const shouldSend = await shouldSendEmailNotification('new_lead', 'all_admins');
    if (!shouldSend) {
      console.log('New lead admin notification suppressed by preferences');
      return;
    }

    const adminEmail = getRegionAdminEmail(data.regionCode);

    const customTemplate = await getCustomEmailTemplate('new_lead', {
      leadName: `${data.firstName} ${data.lastName}`,
      leadEmail: data.email,
      leadPhone: data.phone || '',
      source: data.entrySource || '',
      regionCode: data.regionCode || 'AU',
    });

    await resend.emails.send({
      from: FROM_EMAIL,
      to: adminEmail,
      subject: customTemplate?.subject || `New Student Inquiry: ${data.firstName} ${data.lastName} - ${data.courseTitle}`,
      html: getNewLeadAdminEmailHtml(data),
    });

    console.log(`New lead admin notification sent to ${adminEmail} for ${data.email}`);
  } catch (error: any) {
    console.error('Error sending new lead admin notification:', error.message);
  }
}

// ============================================
// TEAM MEMBER EMAIL NOTIFICATIONS
// ============================================

interface TeamMemberEmailNotificationData {
  recipientEmail: string;
  recipientName: string;
  subject: string;
  title: string;
  subtitle?: string;
  bodyHtml: string;
}

export async function sendTeamMemberNotificationEmail(data: TeamMemberEmailNotificationData): Promise<void> {
  if (!resend) {
    console.log('Resend not configured - skipping team member notification email');
    return;
  }

  try {
    const baseUrl = getEmailBaseUrl();
    const html = emailShell(baseUrl, data.title, data.subtitle, data.bodyHtml);

    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.recipientEmail,
      subject: data.subject,
      html,
    });

    console.log(`Team member notification email sent to ${data.recipientEmail}: ${data.subject}`);
  } catch (error: any) {
    console.error(`Error sending team member notification email to ${data.recipientEmail}:`, error.message);
  }
}

export async function sendTaskAssignedEmail(params: {
  recipientEmail: string;
  recipientName: string;
  taskTitle: string;
  assignedByName: string;
  dueDate?: string;
  recipientUserId?: string;
}): Promise<void> {
  const shouldSend = await shouldSendEmailNotification('task_assigned', undefined, params.recipientUserId);
  if (!shouldSend) {
    console.log('Task assigned notification suppressed by preferences');
    return;
  }
  const baseUrl = getEmailBaseUrl();
  const dueMessage = params.dueDate ? `<p style="color: ${EMAIL_COLORS.textBody}; font-size: 14px; margin: 5px 0;"><strong>Due Date:</strong> ${params.dueDate}</p>` : '';
  
  const bodyHtml = `
    <h2 style="color: ${EMAIL_COLORS.textDark}; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">New Task Assigned</h2>
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; font-family: ${EMAIL_FONT};">
      Hi ${params.recipientName}, <strong>${params.assignedByName}</strong> has assigned you a new task.
    </p>
    ${emailInfoBox('Task Details', `
      <p style="color: ${EMAIL_COLORS.textDark}; font-size: 16px; font-weight: bold; margin: 0 0 5px 0;">${params.taskTitle}</p>
      ${dueMessage}
    `)}
    ${emailButton(`${baseUrl}/admin#tasks`, 'View Task')}
  `;

  const customTemplate = await getCustomEmailTemplate('task_assigned', {
    taskTitle: params.taskTitle,
    priority: '',
    dueDate: params.dueDate || '',
    assignedBy: params.assignedByName,
    taskDescription: '',
  });

  await sendTeamMemberNotificationEmail({
    recipientEmail: params.recipientEmail,
    recipientName: params.recipientName,
    subject: customTemplate?.subject || `Task Assigned: ${params.taskTitle}`,
    title: 'Task Assignment',
    subtitle: 'You have a new task',
    bodyHtml,
  });
}

export async function sendTaskDueReminderEmail(params: {
  recipientEmail: string;
  recipientName: string;
  taskTitle: string;
  dueDate: string;
}): Promise<void> {
  const baseUrl = getEmailBaseUrl();
  
  const bodyHtml = `
    <h2 style="color: ${EMAIL_COLORS.textDark}; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">Task Due Soon</h2>
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; font-family: ${EMAIL_FONT};">
      Hi ${params.recipientName}, your task is due soon.
    </p>
    ${emailWarningBox(`<strong>${params.taskTitle}</strong> is due on <strong>${params.dueDate}</strong>. Please complete it before the deadline.`)}
    ${emailButton(`${baseUrl}/admin#tasks`, 'View Task')}
  `;

  await sendTeamMemberNotificationEmail({
    recipientEmail: params.recipientEmail,
    recipientName: params.recipientName,
    subject: `Task Due Soon: ${params.taskTitle}`,
    title: 'Task Reminder',
    subtitle: 'Upcoming deadline',
    bodyHtml,
  });
}

export async function sendTaskCompletedEmail(params: {
  recipientEmail: string;
  recipientName: string;
  taskTitle: string;
  completedByName: string;
}): Promise<void> {
  const baseUrl = getEmailBaseUrl();
  
  const bodyHtml = `
    <h2 style="color: ${EMAIL_COLORS.textDark}; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">Task Completed</h2>
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; font-family: ${EMAIL_FONT};">
      Hi ${params.recipientName}, <strong>${params.completedByName}</strong> has completed a task.
    </p>
    <div style="background-color: ${EMAIL_COLORS.successBg}; border-left: 4px solid ${EMAIL_COLORS.success}; padding: 20px; margin: 24px 0; border-radius: 0 6px 6px 0;">
      <p style="color: ${EMAIL_COLORS.success}; font-size: 16px; margin: 0; font-family: ${EMAIL_FONT};">
        <strong>${params.taskTitle}</strong> has been marked as completed.
      </p>
    </div>
    ${emailButton(`${baseUrl}/admin#tasks`, 'View Tasks')}
  `;

  await sendTeamMemberNotificationEmail({
    recipientEmail: params.recipientEmail,
    recipientName: params.recipientName,
    subject: `Task Completed: ${params.taskTitle}`,
    title: 'Task Update',
    subtitle: 'A task has been completed',
    bodyHtml,
  });
}

export async function sendLeadAssignedEmail(params: {
  recipientEmail: string;
  recipientName: string;
  leadName: string;
  assignedByName: string;
  courseName?: string;
}): Promise<void> {
  const baseUrl = getEmailBaseUrl();
  
  const bodyHtml = `
    <h2 style="color: ${EMAIL_COLORS.textDark}; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">Lead Assigned to You</h2>
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; font-family: ${EMAIL_FONT};">
      Hi ${params.recipientName}, <strong>${params.assignedByName}</strong> has assigned you a new lead.
    </p>
    ${emailInfoBox('Lead Details', `
      <p style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; margin: 0 0 5px 0;"><strong>Contact:</strong> ${params.leadName}</p>
      ${params.courseName ? `<p style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; margin: 0;"><strong>Interested In:</strong> ${params.courseName}</p>` : ''}
    `)}
    ${emailWarningBox('<strong>Action Required:</strong> Please follow up with this lead as soon as possible.')}
    ${emailButton(`${baseUrl}/admin#crm-contacts`, 'View in CRM')}
  `;

  await sendTeamMemberNotificationEmail({
    recipientEmail: params.recipientEmail,
    recipientName: params.recipientName,
    subject: `Lead Assigned: ${params.leadName}`,
    title: 'Lead Assignment',
    subtitle: 'New lead assigned to you',
    bodyHtml,
  });
}

export async function sendApplicationAssignedEmail(params: {
  recipientEmail: string;
  recipientName: string;
  studentName: string;
  courseName: string;
  assignedByName: string;
  applicationId: string;
}): Promise<void> {
  const baseUrl = getEmailBaseUrl();
  
  const bodyHtml = `
    <h2 style="color: ${EMAIL_COLORS.textDark}; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">Application Assigned to You</h2>
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; font-family: ${EMAIL_FONT};">
      Hi ${params.recipientName}, <strong>${params.assignedByName}</strong> has assigned you a student application.
    </p>
    ${emailInfoBox('Application Details', `
      <p style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; margin: 0 0 5px 0;"><strong>Student:</strong> ${params.studentName}</p>
      <p style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; margin: 0;"><strong>Course:</strong> ${params.courseName}</p>
    `)}
    ${emailButton(`${baseUrl}/admin/applications/${params.applicationId}`, 'View Application')}
  `;

  await sendTeamMemberNotificationEmail({
    recipientEmail: params.recipientEmail,
    recipientName: params.recipientName,
    subject: `Application Assigned: ${params.studentName} - ${params.courseName}`,
    title: 'Application Assignment',
    subtitle: 'New application assigned to you',
    bodyHtml,
  });
}

export async function sendDocumentUploadedAdminEmail(params: {
  recipientEmail: string;
  recipientName: string;
  studentName: string;
  documentName: string;
  applicationId: string;
}): Promise<void> {
  const baseUrl = getEmailBaseUrl();
  
  const bodyHtml = `
    <h2 style="color: ${EMAIL_COLORS.textDark}; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">Document Uploaded</h2>
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; font-family: ${EMAIL_FONT};">
      Hi ${params.recipientName}, <strong>${params.studentName}</strong> has uploaded a new document.
    </p>
    ${emailInfoBox('Document Details', `
      <p style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; margin: 0;"><strong>Document:</strong> ${params.documentName}</p>
    `)}
    ${emailButton(`${baseUrl}/admin/applications/${params.applicationId}`, 'Review Document')}
  `;

  await sendTeamMemberNotificationEmail({
    recipientEmail: params.recipientEmail,
    recipientName: params.recipientName,
    subject: `Document Uploaded: ${params.documentName} by ${params.studentName}`,
    title: 'Document Upload',
    subtitle: 'A student uploaded a document',
    bodyHtml,
  });
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

function getStageTransitionEmailHtml(data: ApplicationEmailData): string {
  const baseUrl = getEmailBaseUrl();

  const bodyContent = `
    <h2 style="color: ${EMAIL_COLORS.textDark}; margin: 0 0 20px 0; font-size: 24px; font-family: ${EMAIL_FONT};">Hello ${data.studentName}!</h2>
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">
      Great news! Your application for <strong>${data.courseTitle}</strong> at <strong>${data.universityName}</strong> has progressed to the next stage.
    </p>
    ${emailInfoBox('Current Stage:', `
      <p style="color: ${EMAIL_COLORS.textDark}; font-size: 20px; font-weight: bold; margin: 0;">${data.currentStage}</p>
      ${data.previousStage ? `<p style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; margin: 10px 0 0 0;">Previously: ${data.previousStage}</p>` : ''}
    `)}
    ${emailButton(`${baseUrl}/student/applications`, 'View Application')}
  `;

  return emailShell(baseUrl, 'Application Update', 'Your application has been updated', bodyContent);
}

function getDocumentRequestEmailHtml(data: ApplicationEmailData): string {
  const baseUrl = getEmailBaseUrl();

  const bodyContent = `
    <h2 style="color: ${EMAIL_COLORS.textDark}; margin: 0 0 20px 0; font-size: 24px; font-family: ${EMAIL_FONT};">Hello ${data.studentName}!</h2>
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">
      The university has requested additional documents for your application to <strong>${data.courseTitle}</strong>.
    </p>
    ${emailWarningBox('<strong>Important:</strong> Please upload the requested documents as soon as possible to avoid delays in processing your application.')}
    <h3 style="color: ${EMAIL_COLORS.textDark}; margin: 30px 0 15px 0; font-size: 18px; font-family: ${EMAIL_FONT};">Requested Documents:</h3>
    <ul style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">
      ${data.documentTypes?.map(doc => `<li>${doc}</li>`).join('')}
    </ul>
    ${data.requestNote ? emailInfoBox('Note:', `<p style="color: ${EMAIL_COLORS.textDark}; font-size: 14px; margin: 0;">${data.requestNote}</p>`) : ''}
    ${emailButton(`${baseUrl}/student/applications`, 'Upload Documents', 'accent')}
  `;

  return emailShell(baseUrl, 'Document Request', 'Action Required', bodyContent);
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

function getWelcomeEmailHtml(data: WelcomeEmailData): string {
  const baseUrl = getEmailBaseUrl();
  const userTypeMessages = {
    student: {
      title: 'Welcome to Your Study Journey!',
      description: 'Your account has been verified and you\'re ready to explore thousands of courses from top universities worldwide.',
      cta: 'Start Exploring Courses',
      ctaUrl: `${baseUrl}/courses`
    },
    institution: {
      title: 'Welcome to ANZ Global Education!',
      description: 'Your institution account is now active. Start connecting with international students and showcase your programs.',
      cta: 'Access Your Dashboard',
      ctaUrl: `${baseUrl}/university/dashboard`
    },
    admin: {
      title: 'Welcome to ANZ Global Education!',
      description: 'Your admin account has been activated.',
      cta: 'Go to Admin Dashboard',
      ctaUrl: `${baseUrl}/admin/dashboard`
    }
  };

  const msg = userTypeMessages[data.userType] || userTypeMessages.student;

  const bodyContent = `
    <h2 style="color: ${EMAIL_COLORS.textDark}; margin: 0 0 20px 0; font-size: 24px; font-family: ${EMAIL_FONT};">${msg.title}</h2>
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">
      Hi ${data.firstName},
    </p>
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">
      ${msg.description}
    </p>
    ${data.userType === 'student' ? emailInfoBox("What's Next?", `
      <ul style="color: ${EMAIL_COLORS.textBody}; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
        <li>Complete your profile to get personalized recommendations</li>
        <li>Browse courses from top Australian universities</li>
        <li>Save your favorite courses to compare later</li>
        <li>Start your application when you're ready</li>
      </ul>
    `) : ''}
    ${emailButton(msg.ctaUrl, msg.cta)}
    <p style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; font-family: ${EMAIL_FONT};">
      Need help? Our support team is here for you at support@anzglobal.com.au
    </p>
  `;

  return emailShell(baseUrl, 'ANZ Global Education', 'Your Gateway to Global Education', bodyContent);
}

function getProfileReminderEmailHtml(data: ProfileReminderEmailData): string {
  const baseUrl = getEmailBaseUrl();
  const missingFieldsList = data.missingFields.map(field => `<li>${field}</li>`).join('');

  const bodyContent = `
    <h2 style="color: ${EMAIL_COLORS.textDark}; margin: 0 0 20px 0; font-size: 24px; font-family: ${EMAIL_FONT};">Your Profile is ${data.profileCompletion}% Complete</h2>
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">
      Hi ${data.firstName},
    </p>
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">
      A complete profile helps universities understand your background better and increases your chances of a successful application.
    </p>
    ${emailWarningBox(`<h3 style="color: ${EMAIL_COLORS.warningText}; margin: 0 0 15px 0; font-size: 18px; font-family: ${EMAIL_FONT};">Missing Information:</h3>
      <ul style="color: ${EMAIL_COLORS.textBody}; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
        ${missingFieldsList}
      </ul>`)}
    ${emailButton(`${baseUrl}/student/profile`, 'Complete Your Profile', 'accent')}
    <p style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; font-family: ${EMAIL_FONT};">
      Having a complete profile makes your applications stand out and helps us match you with the right courses.
    </p>
  `;

  return emailShell(baseUrl, 'ANZ Global Education', 'Complete Your Profile', bodyContent);
}

function getApplicationSubmittedEmailHtml(data: ApplicationSubmittedEmailData): string {
  const baseUrl = getEmailBaseUrl();

  const bodyContent = `
    <h2 style="color: ${EMAIL_COLORS.textDark}; margin: 0 0 20px 0; font-size: 24px; font-family: ${EMAIL_FONT};">Great News, ${data.studentName}!</h2>
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">
      Your application has been successfully submitted and is now being reviewed.
    </p>
    ${emailInfoBox('Application Details:', `
      <table cellpadding="8" cellspacing="0" style="width: 100%;">
        <tr>
          <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px;"><strong>Application ID:</strong></td>
          <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px;">${data.applicationId}</td>
        </tr>
        <tr>
          <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px;"><strong>Course:</strong></td>
          <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px;">${data.courseTitle}</td>
        </tr>
        <tr>
          <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px;"><strong>Institution:</strong></td>
          <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px;">${data.institutionName}</td>
        </tr>
        <tr>
          <td style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px;"><strong>Submitted:</strong></td>
          <td style="color: ${EMAIL_COLORS.textDark}; font-size: 14px;">${data.submittedDate}</td>
        </tr>
      </table>
    `)}
    <div style="background-color: ${EMAIL_COLORS.successBg}; border-left: 4px solid ${EMAIL_COLORS.success}; padding: 20px; margin: 24px 0; border-radius: 0 6px 6px 0;">
      <h3 style="color: ${EMAIL_COLORS.success}; margin: 0 0 15px 0; font-size: 18px; font-family: ${EMAIL_FONT};">What Happens Next?</h3>
      <ol style="color: ${EMAIL_COLORS.textBody}; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
        <li>Our team will review your application</li>
        <li>You may receive requests for additional documents</li>
        <li>The institution will assess your application</li>
        <li>You'll receive updates at each stage via email</li>
      </ol>
    </div>
    ${emailButton(`${baseUrl}/student/applications`, 'Track Your Application')}
  `;

  return emailShell(baseUrl, 'Application Submitted!', 'Congratulations on taking this step', bodyContent);
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
  const baseUrl = getEmailBaseUrl();
  const loginUrl = `${baseUrl}/admin/login`;

  const bodyContent = `
    <h2 style="color: ${EMAIL_COLORS.textDark}; margin: 0 0 20px 0; font-size: 24px; font-family: ${EMAIL_FONT};">Welcome, ${data.firstName}!</h2>
    
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">
      <strong>${data.createdByName}</strong> has created an account for you on the ANZ Global Education platform.
    </p>
    
    ${emailInfoBox('Your Login Credentials', `
      <p style="color: ${EMAIL_COLORS.textBody}; font-size: 14px; margin: 5px 0;">
        <strong>Email:</strong> ${data.email}
      </p>
      <p style="color: ${EMAIL_COLORS.textBody}; font-size: 14px; margin: 5px 0;">
        <strong>Temporary Password:</strong> <code style="background-color: #e9ecef; padding: 2px 8px; border-radius: 4px; font-family: monospace;">${data.tempPassword}</code>
      </p>
    `)}
    
    ${emailWarningBox('<strong>Important:</strong> You will be required to change your password when you first log in.')}
    
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; margin: 20px 0; font-family: ${EMAIL_FONT};">
      Click the button below to sign in to your account:
    </p>
    
    ${emailButton(loginUrl, 'Sign In to Your Account')}
    
    <p style="color: ${EMAIL_COLORS.textSecondary}; font-size: 12px; margin-top: 30px; font-family: ${EMAIL_FONT};">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${loginUrl}" style="color: ${EMAIL_COLORS.primary};">${loginUrl}</a>
    </p>
  `;

  return emailShell(baseUrl, 'ANZ Global Education', 'Your Account Has Been Created', bodyContent);
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
      subject: `Your ANZ Global Education Account Has Been Created`,
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
    branch_manager: 'Branch Manager',
    support_staff: 'Support Staff',
    operations_staff: 'Operations Staff',
  };
  return roleLabels[role] || role;
}

// Send notification to existing admins when new admin signup needs approval
export async function sendNewAdminPendingNotification(data: AdminApprovalNotificationData & { regionCode?: string }): Promise<void> {
  if (!resend) {
    console.log('Resend not configured - skipping new admin pending notification');
    return;
  }

  try {
    const shouldSend = await shouldSendEmailNotification('admin_pending', 'all_admins');
    if (!shouldSend) {
      console.log('Admin pending notification suppressed by preferences');
      return;
    }
    const baseUrl = getEmailBaseUrl();
    const adminEmail = getRegionAdminEmail(data.regionCode);

    const bodyContent = `
      <h2 style="color: ${EMAIL_COLORS.textDark}; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">Action Required: Review New Admin</h2>
      
      <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; font-family: ${EMAIL_FONT};">
        A new user has signed up as a platform administrator and is awaiting your approval.
      </p>
      
      ${emailInfoBox('Applicant Details', `
        <p style="margin: 0 0 10px 0;"><strong>Name:</strong> ${data.firstName} ${data.lastName}</p>
        <p style="margin: 0;"><strong>Email:</strong> ${data.email}</p>
      `)}
      
      <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; font-family: ${EMAIL_FONT};">
        Please log in to the admin dashboard to review and approve this request.
      </p>
      
      ${emailButton(`${baseUrl}/admin/dashboard#users`, 'Review in Dashboard')}
    `;

    const html = emailShell(baseUrl, 'New Admin Signup', 'Pending Approval', bodyContent, data.regionCode);

    await resend.emails.send({
      from: FROM_EMAIL,
      to: adminEmail,
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
    const baseUrl = getEmailBaseUrl();

    const bodyContent = `
      <h2 style="color: ${EMAIL_COLORS.textDark}; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">Welcome to the Team, ${data.firstName}!</h2>
      
      <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; font-family: ${EMAIL_FONT};">
        Great news! Your administrator account has been approved by ${data.approvedByName}.
      </p>
      
      <div style="background-color: ${EMAIL_COLORS.successBg}; border-left: 4px solid ${EMAIL_COLORS.success}; padding: 20px; margin: 24px 0; border-radius: 0 6px 6px 0;">
        <p style="margin: 0 0 10px 0; font-family: ${EMAIL_FONT};"><strong>Assigned Role:</strong> ${formatRole(data.assignedRole)}</p>
        <p style="margin: 0; font-family: ${EMAIL_FONT};"><strong>Status:</strong> Active</p>
      </div>
      
      <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; font-family: ${EMAIL_FONT};">
        You now have access to the admin dashboard. Log in to get started!
      </p>
      
      ${emailButton(`${baseUrl}/admin/dashboard`, 'Go to Dashboard')}
    `;

    const html = emailShell(baseUrl, 'Account Approved!', 'Your admin access is ready', bodyContent);

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
    const baseUrl = getEmailBaseUrl();

    const bodyContent = `
      <h2 style="color: ${EMAIL_COLORS.textDark}; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">Hello ${data.firstName},</h2>
      
      <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; font-family: ${EMAIL_FONT};">
        We regret to inform you that your administrator account request was not approved at this time.
      </p>
      
      ${data.reason ? `
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 24px 0; border-radius: 0 6px 6px 0;">
        <p style="margin: 0; font-family: ${EMAIL_FONT};"><strong>Reason:</strong> ${data.reason}</p>
      </div>
      ` : ''}
      
      <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; font-family: ${EMAIL_FONT};">
        If you believe this was in error or have questions, please contact our team at <a href="mailto:support@anzglobal.com.au" style="color: ${EMAIL_COLORS.primary};">support@anzglobal.com.au</a>.
      </p>
    `;

    const html = emailShell(baseUrl, 'Account Request Update', undefined, bodyContent);

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

function getTeamInvitationEmailHtml(data: TeamInvitationEmailData): string {
  const baseUrl = getEmailBaseUrl();
  const inviteUrl = `${baseUrl}/auth/accept-invite?token=${data.inviteToken}`;
  const expiryDate = new Date(data.expiresAt).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const bodyContent = `
    <h2 style="color: ${EMAIL_COLORS.textDark}; margin: 0 0 20px 0; font-size: 24px; font-family: ${EMAIL_FONT};">Welcome to the Team!</h2>
    
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">
      <strong>${data.inviterName}</strong> has invited you to join the ANZ Global Education platform as a <strong>${data.roleName}</strong>.
    </p>
    
    ${data.note ? emailInfoBox('Personal Note', `<p style="color: ${EMAIL_COLORS.textBody}; font-size: 14px; font-style: italic; margin: 0;">"${data.note}"</p>`) : ''}
    
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; margin: 20px 0; font-family: ${EMAIL_FONT};">
      Click the button below to set up your account and get started:
    </p>
    
    ${emailButton(inviteUrl, 'Accept Invitation')}
    
    ${emailWarningBox(`<strong>Note:</strong> This invitation will expire on <strong>${expiryDate}</strong>. Please accept it before then.`)}
    
    <p style="color: ${EMAIL_COLORS.textLight}; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0; font-family: ${EMAIL_FONT};">
      If the button doesn't work, copy and paste this link into your browser:
    </p>
    <p style="color: ${EMAIL_COLORS.primary}; font-size: 12px; word-break: break-all; margin: 5px 0 0 0;">
      ${inviteUrl}
    </p>
  `;

  return emailShell(baseUrl, 'ANZ Global Education', "You're Invited to Join Our Team!", bodyContent);
}

// Password changed confirmation email HTML template
function getPasswordChangedEmailHtml(data: { email: string; firstName?: string | null }): string {
  const baseUrl = getEmailBaseUrl();
  const name = data.firstName || 'there';
  const changedAt = new Date().toLocaleString('en-AU', { 
    dateStyle: 'full', 
    timeStyle: 'short',
    timeZone: 'Australia/Sydney' 
  });

  const bodyContent = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="width: 60px; height: 60px; background-color: ${EMAIL_COLORS.successBg}; border-radius: 50%; display: inline-block; line-height: 60px;">
        <span style="font-size: 30px; color: ${EMAIL_COLORS.success};">&#10003;</span>
      </div>
    </div>
    
    <h2 style="color: ${EMAIL_COLORS.textDark}; margin: 0 0 20px 0; font-size: 24px; text-align: center; font-family: ${EMAIL_FONT};">Password Successfully Changed</h2>
    
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">
      Hi ${name},
    </p>
    
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">
      Your password for your ANZ Global Education account (<strong>${data.email}</strong>) has been successfully changed.
    </p>
    
    ${emailInfoBox('Change Details', `
      <p style="color: ${EMAIL_COLORS.textBody}; font-size: 14px; margin: 0;">
        <strong>Changed at:</strong> ${changedAt} (AEST)
      </p>
    `)}
    
    ${emailWarningBox('<strong>Didn\'t make this change?</strong> If you did not change your password, please contact our support team immediately at <a href="mailto:support@anzglobal.com.au" style="color: ${EMAIL_COLORS.primary};">support@anzglobal.com.au</a>')}
    
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0; font-family: ${EMAIL_FONT};">
      Thank you for keeping your account secure.
    </p>
  `;

  return emailShell(baseUrl, 'ANZ Global Education', 'Account Security Notification', bodyContent);
}

// Send password changed confirmation email
export async function sendPasswordChangedEmail(data: { email: string; firstName?: string | null }): Promise<boolean> {
  if (!resend) {
    console.log('Resend not configured - skipping password changed email');
    return false;
  }

  try {
    console.log(`[Email] Attempting to send password changed notification`);
    
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: 'Password Changed - ANZ Global Education',
      html: getPasswordChangedEmailHtml(data),
    });

    if (result.error) {
      console.error(`[Email] Resend error:`, result.error);
      return false;
    }

    console.log(`[Email] Password changed email sent, ID: ${result.data?.id}`);
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
  const baseUrl = getEmailBaseUrl();
  const signupUrl = `${baseUrl}/auth?ref=${data.referralCode}&mode=signup`;

  const bodyContent = `
    <h2 style="color: ${EMAIL_COLORS.textDark}; margin: 0 0 20px 0; font-size: 24px; font-family: ${EMAIL_FONT};">Hi ${data.inviteeName}!</h2>
    
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">
      <strong>${data.referrerName}</strong> thinks you'd love ANZ Global Education and has invited you to join!
    </p>
    
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">
      ANZ Global Education helps international students discover and apply to universities in Australia and beyond. 
      With our AI-powered platform, you can:
    </p>
    
    <ul style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.8; margin: 0 0 30px 0; padding-left: 20px; font-family: ${EMAIL_FONT};">
      <li>Browse thousands of courses from top institutions</li>
      <li>Get personalized course recommendations</li>
      <li>Apply to multiple universities with one profile</li>
      <li>Track your application status in real-time</li>
    </ul>
    
    ${emailButton(signupUrl, 'Create Your Free Account')}
    
    <p style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0; font-family: ${EMAIL_FONT};">
      By signing up through your friend's invitation, you'll both receive special benefits!
    </p>
  `;

  return emailShell(baseUrl, 'ANZ Global Education', 'Your Gateway to Global Education', bodyContent);
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
      subject: `${data.referrerName} invited you to join ANZ Global Education!`,
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
  const baseUrl = getEmailBaseUrl();
  const affiliateUrl = `${baseUrl}/affiliate`;

  const bodyContent = `
    <h2 style="color: ${EMAIL_COLORS.textDark}; margin: 0 0 20px 0; font-size: 24px; font-family: ${EMAIL_FONT};">Hey ${data.referrerName}!</h2>
    
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">
      Woohoo! <strong>${data.inviteeName || data.inviteeEmail}</strong> just joined ANZ Global Education thanks to you! You're amazing!
    </p>
    
    <div style="background-color: ${EMAIL_COLORS.successBg}; border-left: 4px solid ${EMAIL_COLORS.success}; padding: 20px; margin: 24px 0; border-radius: 0 6px 6px 0;">
      <p style="color: ${EMAIL_COLORS.success}; font-size: 16px; margin: 0; font-family: ${EMAIL_FONT};">
        <strong>You're one step closer to earning!</strong> Once they enrol in a course, your referral bonus will be on its way. Cha-ching!
      </p>
    </div>
    
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0; font-family: ${EMAIL_FONT};">
      Why stop there? The more friends you invite, the more you earn! Share your referral link with:
    </p>
    
    <ul style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.8; margin: 0 0 20px 20px; padding: 0; font-family: ${EMAIL_FONT};">
      <li>Friends who want to study abroad</li>
      <li>Colleagues looking for new opportunities</li>
      <li>Family members pursuing education goals</li>
    </ul>
    
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">
      Every successful referral puts money in your pocket. There's no limit to how much you can earn!
    </p>
    
    ${emailButton(affiliateUrl, 'Invite More Friends Now')}
    
    <p style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; line-height: 1.6; margin: 0; text-align: center; font-family: ${EMAIL_FONT};">
      Thank you for spreading the word about ANZ Global Education!
    </p>
  `;

  return emailShell(baseUrl, 'Great News!', 'Your Referral Just Registered', bodyContent);
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
  const baseUrl = getEmailBaseUrl();
  const profileUrl = `${baseUrl}/student/profile`;
  const coursesUrl = `${baseUrl}/courses`;

  const bodyContent = `
    <h2 style="color: ${EMAIL_COLORS.textDark}; margin: 0 0 20px 0; font-size: 24px; font-family: ${EMAIL_FONT};">Hey ${data.firstName}!</h2>
    
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">
      Welcome to ANZ Global Education! We're thrilled to have you join thousands of students pursuing their dream of studying abroad.
    </p>
    
    ${emailInfoBox("What's Next?", `
      <ul style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.8; margin: 0; padding-left: 20px;">
        <li>Complete your profile to get personalized course matches</li>
        <li>Browse 1000+ courses across top Australian universities</li>
        <li>Get AI-powered recommendations based on your goals</li>
      </ul>
    `)}
    
    ${emailButton(profileUrl, 'Complete Your Profile')}
    
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">
      Need help? Our friendly Zan assistant is available 24/7 to guide you!
    </p>
    
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; margin: 0; font-family: ${EMAIL_FONT};">
      Or explore our course catalog:
      <a href="${coursesUrl}" style="color: ${EMAIL_COLORS.primary}; text-decoration: none; font-weight: 600;">Browse Courses</a>
    </p>
  `;

  return emailShell(baseUrl, 'Your Journey Starts Here', 'Welcome to ANZ Global Education', bodyContent);
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
      subject: `Welcome to ANZ Global Education, ${data.firstName}!`,
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
  reminderNumber: number;
}

function getProfileCompletionReminderHtml(data: ProfileCompletionReminderData): string {
  const baseUrl = getEmailBaseUrl();
  const profileUrl = `${baseUrl}/student/profile`;
  
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
      message = `Complete your profile to get the most out of ANZ Global Education.`;
  }
  
  const sectionsHtml = data.incompleteSections.length > 0 
    ? emailWarningBox(`<h3 style="color: ${EMAIL_COLORS.warningText}; margin: 0 0 15px 0; font-size: 16px; font-family: ${EMAIL_FONT};">Sections to Complete:</h3>
        <ul style="color: ${EMAIL_COLORS.warningText}; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
          ${data.incompleteSections.map(section => `<li>${section}</li>`).join('')}
        </ul>`)
    : '';

  const bodyContent = `
    <h2 style="color: ${EMAIL_COLORS.textDark}; margin: 0 0 20px 0; font-size: 24px; font-family: ${EMAIL_FONT};">${greeting}</h2>
    
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">
      ${message}
    </p>
    
    <div style="background-color: ${EMAIL_COLORS.border}; border-radius: 10px; height: 20px; margin: 20px 0; overflow: hidden;">
      <div style="background: linear-gradient(90deg, ${EMAIL_COLORS.primary} 0%, ${EMAIL_COLORS.primaryDark} 100%); height: 100%; width: ${data.completionPercentage}%; border-radius: 10px;"></div>
    </div>
    <p style="color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; text-align: center; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">
      ${data.completionPercentage}% Complete
    </p>
    
    <div style="background-color: ${EMAIL_COLORS.successBg}; border-left: 4px solid ${EMAIL_COLORS.success}; padding: 20px; margin: 24px 0; border-radius: 0 6px 6px 0;">
      <h3 style="color: ${EMAIL_COLORS.success}; margin: 0 0 10px 0; font-size: 16px; font-family: ${EMAIL_FONT};">What you'll unlock:</h3>
      <ul style="color: ${EMAIL_COLORS.success}; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
        <li>Personalized course recommendations</li>
        <li>AI-powered application assistance</li>
        <li>Faster application processing</li>
      </ul>
    </div>
    
    ${sectionsHtml}
    
    <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; font-family: ${EMAIL_FONT};">
      It only takes 5-10 minutes to complete!
    </p>
    
    ${emailButton(profileUrl, 'Complete My Profile')}
  `;

  return emailShell(baseUrl, 'Complete Your Profile', `You're ${data.completionPercentage}% there!`, bodyContent);
}

export async function sendProfileCompletionReminder(data: ProfileCompletionReminderData): Promise<boolean> {
  if (!resend) {
    console.log('Resend not configured - skipping profile completion reminder');
    return false;
  }

  try {
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
        subject = `Complete your profile - ANZ Global Education`;
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

// ─── Accounting Email Functions ───────────────────────────────────────────

interface InvoiceEmailData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotal: string;
  gstAmount: string;
  gstEnabled: boolean | null;
  total: string;
  amountPaid: string | null;
  notes: string | null;
  terms: string | null;
}

interface LineItemEmailData {
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
}

export async function sendInvoiceEmail(
  recipientEmail: string,
  customerName: string,
  invoice: InvoiceEmailData,
  lineItems: LineItemEmailData[],
  regionCode?: string
): Promise<boolean> {
  if (!resend) { console.warn('[Email] Resend not configured, skipping invoice email'); return false; }
  try {
    const custom = await getCustomEmailTemplate('invoice_sent', {
      customerName,
      invoiceNumber: invoice.invoiceNumber,
      total: invoice.total,
      currency: invoice.currency,
      dueDate: invoice.dueDate,
    });

    const baseUrl = getEmailBaseUrl();
    let subject = custom?.subject || `Invoice ${invoice.invoiceNumber} from ANZ Global Education`;
    let html: string;

    if (custom?.body) {
      html = emailShell(baseUrl, 'Invoice', undefined, custom.body, regionCode);
    } else {
      const lineItemRows = lineItems.map(item => `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-family: ${EMAIL_FONT}; font-size: 14px; color: ${EMAIL_COLORS.textBody};">${item.description}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-family: ${EMAIL_FONT}; font-size: 14px; color: ${EMAIL_COLORS.textBody}; text-align: right;">${item.quantity}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-family: ${EMAIL_FONT}; font-size: 14px; color: ${EMAIL_COLORS.textBody}; text-align: right;">${invoice.currency} ${parseFloat(item.unitPrice).toFixed(2)}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-family: ${EMAIL_FONT}; font-size: 14px; color: ${EMAIL_COLORS.textBody}; text-align: right;">${invoice.currency} ${parseFloat(item.amount).toFixed(2)}</td>
        </tr>
      `).join('');

      const bodyContent = `
        <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; font-family: ${EMAIL_FONT};">Dear ${customerName},</p>
        <p style="color: ${EMAIL_COLORS.textBody}; font-size: 15px; line-height: 1.6; font-family: ${EMAIL_FONT};">
          Please find below the details for invoice <strong>${invoice.invoiceNumber}</strong>.
        </p>
        ${emailInfoBox('Invoice Details', `
          <p><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
          <p><strong>Issue Date:</strong> ${invoice.issueDate}</p>
          <p><strong>Due Date:</strong> ${invoice.dueDate}</p>
          <p><strong>Currency:</strong> ${invoice.currency}</p>
        `)}
        <table cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0; border: 1px solid ${EMAIL_COLORS.border}; border-radius: 6px; overflow: hidden;">
          <thead>
            <tr style="background-color: ${EMAIL_COLORS.background};">
              <th style="padding: 10px 12px; text-align: left; font-family: ${EMAIL_FONT}; font-size: 13px; color: ${EMAIL_COLORS.textSecondary}; font-weight: 600;">Description</th>
              <th style="padding: 10px 12px; text-align: right; font-family: ${EMAIL_FONT}; font-size: 13px; color: ${EMAIL_COLORS.textSecondary}; font-weight: 600;">Qty</th>
              <th style="padding: 10px 12px; text-align: right; font-family: ${EMAIL_FONT}; font-size: 13px; color: ${EMAIL_COLORS.textSecondary}; font-weight: 600;">Unit Price</th>
              <th style="padding: 10px 12px; text-align: right; font-family: ${EMAIL_FONT}; font-size: 13px; color: ${EMAIL_COLORS.textSecondary}; font-weight: 600;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${lineItemRows}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding: 10px 12px; text-align: right; font-family: ${EMAIL_FONT}; font-size: 14px; font-weight: 600; color: ${EMAIL_COLORS.textDark};">Subtotal</td>
              <td style="padding: 10px 12px; text-align: right; font-family: ${EMAIL_FONT}; font-size: 14px; color: ${EMAIL_COLORS.textDark};">${invoice.currency} ${parseFloat(invoice.subtotal).toFixed(2)}</td>
            </tr>
            ${invoice.gstEnabled ? `
            <tr>
              <td colspan="3" style="padding: 10px 12px; text-align: right; font-family: ${EMAIL_FONT}; font-size: 14px; color: ${EMAIL_COLORS.textBody};">GST (10%)</td>
              <td style="padding: 10px 12px; text-align: right; font-family: ${EMAIL_FONT}; font-size: 14px; color: ${EMAIL_COLORS.textBody};">${invoice.currency} ${parseFloat(invoice.gstAmount).toFixed(2)}</td>
            </tr>` : ''}
            <tr style="background-color: ${EMAIL_COLORS.infoBox};">
              <td colspan="3" style="padding: 12px; text-align: right; font-family: ${EMAIL_FONT}; font-size: 16px; font-weight: 700; color: ${EMAIL_COLORS.primary};">Total Due</td>
              <td style="padding: 12px; text-align: right; font-family: ${EMAIL_FONT}; font-size: 16px; font-weight: 700; color: ${EMAIL_COLORS.primary};">${invoice.currency} ${parseFloat(invoice.total).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        ${invoice.notes ? `<p style="color: ${EMAIL_COLORS.textSecondary}; font-size: 13px; font-family: ${EMAIL_FONT};"><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
        ${invoice.terms ? `<p style="color: ${EMAIL_COLORS.textSecondary}; font-size: 13px; font-family: ${EMAIL_FONT};"><strong>Terms:</strong> ${invoice.terms}</p>` : ''}
        <p style="color: ${EMAIL_COLORS.textBody}; font-size: 14px; line-height: 1.6; font-family: ${EMAIL_FONT}; margin-top: 24px;">
          If you have any questions regarding this invoice, please don't hesitate to contact us.
        </p>
      `;
      html = emailShell(baseUrl, 'Invoice', `Invoice ${invoice.invoiceNumber}`, bodyContent, regionCode);
    }

    const result = await resend.emails.send({ from: FROM_EMAIL, to: recipientEmail, subject, html });
    if (result.error) { console.error('[Email] Resend error:', result.error); return false; }
    console.log(`Invoice email sent to ${recipientEmail}, ID: ${result.data?.id}`);
    return true;
  } catch (error) {
    console.error('Error sending invoice email:', error instanceof Error ? error.message : error);
    return false;
  }
}

export async function sendPaymentReceiptEmail(
  recipientEmail: string,
  customerName: string,
  invoiceNumber: string,
  amount: string,
  method: string,
  regionCode?: string
): Promise<boolean> {
  if (!resend) { console.warn('[Email] Resend not configured, skipping payment receipt email'); return false; }
  try {
    const custom = await getCustomEmailTemplate('payment_receipt', {
      customerName,
      invoiceNumber,
      amount,
      method,
    });

    const baseUrl = getEmailBaseUrl();
    let subject = custom?.subject || `Payment Receipt — Invoice ${invoiceNumber}`;
    let html: string;

    if (custom?.body) {
      html = emailShell(baseUrl, 'Payment Receipt', undefined, custom.body, regionCode);
    } else {
      const bodyContent = `
        <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; font-family: ${EMAIL_FONT};">Dear ${customerName},</p>
        <p style="color: ${EMAIL_COLORS.textBody}; font-size: 15px; line-height: 1.6; font-family: ${EMAIL_FONT};">
          We have received your payment. Thank you!
        </p>
        ${emailInfoBox('Payment Details', `
          <p><strong>Invoice #:</strong> ${invoiceNumber}</p>
          <p><strong>Amount Received:</strong> ${amount}</p>
          <p><strong>Payment Method:</strong> ${method.charAt(0).toUpperCase() + method.slice(1)}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-AU')}</p>
        `)}
        <p style="color: ${EMAIL_COLORS.textBody}; font-size: 14px; line-height: 1.6; font-family: ${EMAIL_FONT}; margin-top: 24px;">
          If you have any questions, please contact us.
        </p>
      `;
      html = emailShell(baseUrl, 'Payment Receipt', `Invoice ${invoiceNumber}`, bodyContent, regionCode);
    }

    const result = await resend.emails.send({ from: FROM_EMAIL, to: recipientEmail, subject, html });
    if (result.error) { console.error('[Email] Resend error:', result.error); return false; }
    console.log(`Payment receipt email sent to ${recipientEmail}, ID: ${result.data?.id}`);
    return true;
  } catch (error) {
    console.error('Error sending payment receipt email:', error instanceof Error ? error.message : error);
    return false;
  }
}

export async function sendInvoiceReminderEmail(
  recipientEmail: string,
  customerName: string,
  invoice: InvoiceEmailData,
  regionCode?: string
): Promise<boolean> {
  if (!resend) { console.warn('[Email] Resend not configured, skipping invoice reminder email'); return false; }
  try {
    const outstanding = (parseFloat(invoice.total) - parseFloat(invoice.amountPaid || '0')).toFixed(2);
    const custom = await getCustomEmailTemplate('invoice_overdue_reminder', {
      customerName,
      invoiceNumber: invoice.invoiceNumber,
      total: invoice.total,
      outstanding,
      currency: invoice.currency,
      dueDate: invoice.dueDate,
    });

    const baseUrl = getEmailBaseUrl();
    let subject = custom?.subject || `Reminder: Invoice ${invoice.invoiceNumber} — Payment Overdue`;
    let html: string;

    if (custom?.body) {
      html = emailShell(baseUrl, 'Payment Reminder', undefined, custom.body, regionCode);
    } else {
      const bodyContent = `
        <p style="color: ${EMAIL_COLORS.textBody}; font-size: 16px; line-height: 1.6; font-family: ${EMAIL_FONT};">Dear ${customerName},</p>
        <p style="color: ${EMAIL_COLORS.textBody}; font-size: 15px; line-height: 1.6; font-family: ${EMAIL_FONT};">
          This is a friendly reminder that invoice <strong>${invoice.invoiceNumber}</strong> is overdue.
        </p>
        ${emailWarningBox(`
          <strong>Invoice #:</strong> ${invoice.invoiceNumber}<br/>
          <strong>Due Date:</strong> ${invoice.dueDate}<br/>
          <strong>Outstanding Amount:</strong> ${invoice.currency} ${outstanding}
        `)}
        <p style="color: ${EMAIL_COLORS.textBody}; font-size: 14px; line-height: 1.6; font-family: ${EMAIL_FONT}; margin-top: 24px;">
          Please arrange payment at your earliest convenience. If you have already made the payment, please disregard this reminder.
        </p>
        <p style="color: ${EMAIL_COLORS.textBody}; font-size: 14px; line-height: 1.6; font-family: ${EMAIL_FONT};">
          For any questions, please contact us.
        </p>
      `;
      html = emailShell(baseUrl, 'Payment Reminder', `Invoice ${invoice.invoiceNumber}`, bodyContent, regionCode);
    }

    const result = await resend.emails.send({ from: FROM_EMAIL, to: recipientEmail, subject, html });
    if (result.error) { console.error('[Email] Resend error:', result.error); return false; }
    console.log(`Invoice reminder email sent to ${recipientEmail}, ID: ${result.data?.id}`);
    return true;
  } catch (error) {
    console.error('Error sending invoice reminder email:', error instanceof Error ? error.message : error);
    return false;
  }
}
