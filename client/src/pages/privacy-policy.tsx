import { Card, CardContent } from "@/components/ui/card";
import { Helmet } from "react-helmet";
import { Shield, Lock, Eye, Database, Globe, Users, Mail, Settings } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy | ANZ Global Education</title>
        <meta name="description" content="Learn how ANZ Global Education collects, uses, and protects your personal information. Read our comprehensive Privacy Policy." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
        {/* Hero Section */}
        <div className="bg-primary text-primary-foreground py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <Shield className="h-16 w-16 mx-auto mb-6 opacity-90" />
              <h1 className="text-4xl font-bold mb-4" data-testid="text-privacy-title">Privacy Policy</h1>
              <p className="text-lg opacity-90">
                Last updated: December 2024
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Introduction */}
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Lock className="h-6 w-6 text-primary" />
                  Our Commitment to Privacy
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  ANZ Global Education Pty Ltd ("we," "us," or "our") is committed to protecting your privacy and personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website, mobile applications, and services (collectively, the "Platform").
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  We comply with the Australian Privacy Act 1988 (Cth), the Australian Privacy Principles (APPs), and applicable New Zealand privacy legislation. By using our Platform, you consent to the practices described in this policy.
                </p>
              </CardContent>
            </Card>

            {/* Information We Collect */}
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Database className="h-6 w-6 text-primary" />
                  Information We Collect
                </h2>
                <div className="space-y-6 text-muted-foreground leading-relaxed">
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Personal Information You Provide</h3>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>Identity Information:</strong> Name, date of birth, gender, nationality, passport details</li>
                      <li><strong>Contact Information:</strong> Email address, phone number, mailing address</li>
                      <li><strong>Educational Background:</strong> Academic history, qualifications, transcripts, certificates</li>
                      <li><strong>Application Materials:</strong> Personal statements, references, supporting documents</li>
                      <li><strong>Account Information:</strong> Username, password, account preferences</li>
                      <li><strong>Communication Records:</strong> Messages, inquiries, and correspondence with us</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Information Collected Automatically</h3>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers</li>
                      <li><strong>Usage Data:</strong> Pages visited, time spent, clicks, search queries, course views</li>
                      <li><strong>Location Data:</strong> General geographic location based on IP address</li>
                      <li><strong>Cookies and Tracking:</strong> Cookies, pixels, and similar technologies for analytics and personalization</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* How We Use Information */}
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Eye className="h-6 w-6 text-primary" />
                  How We Use Your Information
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>We use your personal information for the following purposes:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Service Delivery:</strong> Process course applications, manage your account, and facilitate communication with institutions</li>
                    <li><strong>Personalization:</strong> Recommend courses, institutions, and content based on your preferences and interests</li>
                    <li><strong>Communication:</strong> Send application updates, newsletters, educational resources, and promotional materials (with your consent)</li>
                    <li><strong>Support:</strong> Respond to inquiries, provide customer support, and resolve issues</li>
                    <li><strong>Analytics:</strong> Analyze usage patterns to improve our Platform, services, and user experience</li>
                    <li><strong>Security:</strong> Detect, prevent, and address fraud, security breaches, and technical issues</li>
                    <li><strong>Legal Compliance:</strong> Comply with legal obligations, enforce our terms, and protect our rights</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Information Sharing */}
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Users className="h-6 w-6 text-primary" />
                  Information Sharing and Disclosure
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>We may share your information with:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Educational Institutions:</strong> Partner universities, colleges, and training providers to process your applications</li>
                    <li><strong>Service Providers:</strong> Third-party vendors who assist with hosting, analytics, email delivery, and customer support</li>
                    <li><strong>Education Agents:</strong> Authorized education agents who may assist with your application process</li>
                    <li><strong>Legal Authorities:</strong> Government agencies, law enforcement, or courts when required by law or to protect rights</li>
                    <li><strong>Business Transfers:</strong> In connection with mergers, acquisitions, or asset sales (your information may be transferred)</li>
                  </ul>
                  <p className="mt-4">
                    <strong>We do not sell your personal information</strong> to third parties for marketing purposes.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* International Transfers */}
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Globe className="h-6 w-6 text-primary" />
                  International Data Transfers
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    As an international education platform, your information may be transferred to and processed in countries outside your country of residence, including Australia, New Zealand, and other countries where our partner institutions are located.
                  </p>
                  <p>
                    When we transfer data internationally, we take appropriate measures to ensure your information receives adequate protection in accordance with applicable privacy laws.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Data Security */}
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Lock className="h-6 w-6 text-primary" />
                  Data Security
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>We implement appropriate technical and organizational measures to protect your personal information, including:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Encryption of data in transit (HTTPS/TLS) and at rest</li>
                    <li>Secure server infrastructure with regular security audits</li>
                    <li>Access controls and authentication mechanisms</li>
                    <li>Regular backups and disaster recovery procedures</li>
                    <li>Employee training on data protection and privacy</li>
                  </ul>
                  <p className="mt-4">
                    While we strive to protect your information, no method of transmission or storage is 100% secure. We encourage you to use strong passwords and keep your account credentials confidential.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Your Rights */}
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Settings className="h-6 w-6 text-primary" />
                  Your Privacy Rights
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>Under applicable privacy laws, you have the right to:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                    <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                    <li><strong>Deletion:</strong> Request deletion of your personal information (subject to legal requirements)</li>
                    <li><strong>Opt-out:</strong> Unsubscribe from marketing communications at any time</li>
                    <li><strong>Data Portability:</strong> Request your data in a structured, commonly used format</li>
                    <li><strong>Withdraw Consent:</strong> Withdraw consent where processing is based on consent</li>
                  </ul>
                  <p className="mt-4">
                    To exercise these rights, please contact us using the details provided below. We may need to verify your identity before processing your request.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Cookies */}
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4">Cookies and Tracking Technologies</h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>We use cookies and similar technologies to:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Remember your preferences and settings</li>
                    <li>Authenticate your session and maintain security</li>
                    <li>Analyze traffic and usage patterns</li>
                    <li>Personalize content and recommendations</li>
                    <li>Measure the effectiveness of our marketing</li>
                  </ul>
                  <p className="mt-4">
                    You can manage cookie preferences through your browser settings. Note that disabling cookies may affect some Platform functionality.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Data Retention */}
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4">Data Retention</h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    We retain your personal information for as long as necessary to provide our services, comply with legal obligations, resolve disputes, and enforce our agreements. The retention period depends on:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>The nature of the information and purpose of collection</li>
                    <li>Legal and regulatory requirements</li>
                    <li>Legitimate business needs</li>
                    <li>Your relationship with us</li>
                  </ul>
                  <p className="mt-4">
                    When information is no longer needed, we securely delete or anonymize it.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Children's Privacy */}
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4">Children's Privacy</h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    Our Platform is not intended for children under 16 years of age. We do not knowingly collect personal information from children under 16 without parental consent. If you believe we have collected information from a child under 16, please contact us immediately.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Policy Updates */}
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4">Changes to This Policy</h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. We will notify you of significant changes by posting the updated policy on our Platform and updating the "Last updated" date.
                  </p>
                  <p>
                    We encourage you to review this policy periodically to stay informed about how we protect your information.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Mail className="h-6 w-6 text-primary" />
                  Contact Us
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:</p>
                  <ul className="list-none space-y-2">
                    <li><strong>Privacy Officer Email:</strong> privacy@anzglobaleducation.com</li>
                    <li><strong>General Inquiries:</strong> info@anzglobaleducation.com</li>
                    <li><strong>Address:</strong> Level 5, 123 Pitt Street, Sydney NSW 2000, Australia</li>
                    <li><strong>Phone:</strong> +61 2 9999 8888</li>
                  </ul>
                  <p className="mt-4">
                    If you are not satisfied with our response, you may lodge a complaint with the Office of the Australian Information Commissioner (OAIC) at <a href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.oaic.gov.au</a>.
                  </p>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </>
  );
}
