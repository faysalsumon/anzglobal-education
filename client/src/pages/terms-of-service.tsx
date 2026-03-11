import { Card, CardContent } from "@/components/ui/card";
import { Helmet } from "react-helmet";
import { FileText, Shield, Users, AlertTriangle, Scale, Mail } from "lucide-react";

export default function TermsOfService() {
  return (
    <>
      <Helmet>
        <title>Terms of Service | ANZ Global Education</title>
        <meta name="description" content="Read our Terms of Service to understand the rules and guidelines for using ANZ Global Education platform." />
        <link rel="canonical" href={`${window.location.origin}/terms`} />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
        {/* Hero Section */}
        <div className="bg-primary text-primary-foreground py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <FileText className="h-16 w-16 mx-auto mb-6 opacity-90" />
              <h1 className="text-4xl font-bold mb-4" data-testid="text-terms-title">Terms of Service</h1>
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
                  <Scale className="h-6 w-6 text-primary" />
                  Agreement to Terms
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Welcome to ANZ Global Education. By accessing or using our website, mobile applications, and services (collectively, the "Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our Platform.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  ANZ Global Education Pty Ltd ("we," "us," or "our") provides an online platform connecting international students with educational institutions in Australia and New Zealand. These Terms govern your use of our services, including course search, application submission, and related features.
                </p>
              </CardContent>
            </Card>

            {/* Eligibility */}
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Users className="h-6 w-6 text-primary" />
                  Eligibility and Account Registration
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>To use our Platform, you must:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Be at least 16 years of age, or have parental/guardian consent if younger</li>
                    <li>Provide accurate, current, and complete information during registration</li>
                    <li>Maintain the security and confidentiality of your account credentials</li>
                    <li>Notify us immediately of any unauthorized use of your account</li>
                    <li>Accept responsibility for all activities that occur under your account</li>
                  </ul>
                  <p>
                    We reserve the right to suspend or terminate accounts that violate these Terms or engage in fraudulent, misleading, or harmful activities.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Services */}
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <FileText className="h-6 w-6 text-primary" />
                  Our Services
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>ANZ Global Education provides the following services:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Course Discovery:</strong> Search and compare courses from partner institutions across Australia and New Zealand</li>
                    <li><strong>Application Assistance:</strong> Submit applications to educational institutions through our platform</li>
                    <li><strong>Document Management:</strong> Securely upload and manage application documents</li>
                    <li><strong>Guidance & Support:</strong> Access educational resources, visa information, and student support</li>
                    <li><strong>Institution Connections:</strong> Connect with universities, colleges, and training providers</li>
                  </ul>
                  <p>
                    We act as an intermediary between students and educational institutions. While we strive to provide accurate information, final admission decisions are made solely by the institutions themselves.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* User Responsibilities */}
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Shield className="h-6 w-6 text-primary" />
                  User Responsibilities
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>When using our Platform, you agree to:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Provide truthful and accurate information in all applications and communications</li>
                    <li>Submit genuine documents and not engage in document fraud or misrepresentation</li>
                    <li>Respect the intellectual property rights of ANZ Global Education and partner institutions</li>
                    <li>Not use automated systems, bots, or scrapers without our written permission</li>
                    <li>Not attempt to gain unauthorized access to our systems or other users' accounts</li>
                    <li>Not use the Platform for any unlawful purpose or to violate any applicable laws</li>
                    <li>Treat all communications with respect and refrain from harassment or abusive behavior</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Fees and Payments */}
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4">Fees and Payments</h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    ANZ Global Education's course search and basic application services are provided free of charge to students. We receive commissions from partner institutions for successful enrollments.
                  </p>
                  <p>
                    Some premium services may incur fees, which will be clearly disclosed before you commit. Any fees paid to educational institutions (such as application fees, tuition, or deposits) are subject to the institution's own refund policies.
                  </p>
                  <p>
                    We are not responsible for fees charged by third parties, including institutions, visa processing authorities, or other service providers.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Disclaimers */}
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-6 w-6 text-primary" />
                  Disclaimers and Limitations
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    <strong>Information Accuracy:</strong> While we strive to maintain accurate course and institution information, we cannot guarantee that all details are current or error-free. Always verify important information directly with institutions.
                  </p>
                  <p>
                    <strong>No Guarantee of Admission:</strong> Using our Platform does not guarantee admission to any course or institution. Admission decisions are made solely by educational institutions based on their criteria.
                  </p>
                  <p>
                    <strong>Visa Matters:</strong> We provide general visa information for educational purposes only. This is not legal advice. Consult a registered migration agent for specific visa guidance.
                  </p>
                  <p>
                    <strong>Service Availability:</strong> We aim to maintain continuous service but cannot guarantee uninterrupted access. We may modify, suspend, or discontinue features with or without notice.
                  </p>
                  <p>
                    <strong>Limitation of Liability:</strong> To the maximum extent permitted by law, ANZ Global Education shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Intellectual Property */}
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4">Intellectual Property</h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    All content on the Platform, including text, graphics, logos, images, and software, is the property of ANZ Global Education or our licensors and is protected by copyright, trademark, and other intellectual property laws.
                  </p>
                  <p>
                    You may not reproduce, distribute, modify, or create derivative works from our content without our prior written consent. Personal, non-commercial use of the Platform for educational purposes is permitted.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Changes to Terms */}
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4">Changes to These Terms</h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    We may update these Terms from time to time. We will notify you of significant changes by posting the updated Terms on our Platform and updating the "Last updated" date. Your continued use of the Platform after changes constitutes acceptance of the revised Terms.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Governing Law */}
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4">Governing Law</h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    These Terms are governed by the laws of New South Wales, Australia. Any disputes arising from these Terms or your use of the Platform shall be subject to the exclusive jurisdiction of the courts of New South Wales.
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
                  <p>If you have any questions about these Terms, please contact us:</p>
                  <ul className="list-none space-y-2">
                    <li><strong>Email:</strong> info@anzglobaleducation.com.au</li>
                    <li><strong>Address:</strong> Level 2, 3/94 Eucumbene Drive, Ravenhall, VIC 3023, Australia</li>
                    <li><strong>Phone:</strong> +61 401 125 380</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </>
  );
}
