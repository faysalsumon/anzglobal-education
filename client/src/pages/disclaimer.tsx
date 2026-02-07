import { Card, CardContent } from "@/components/ui/card";
import { Helmet } from "react-helmet";
import { AlertTriangle, Info, Brain, ExternalLink, Shield, Scale, Mail } from "lucide-react";

export default function Disclaimer() {
  return (
    <>
      <Helmet>
        <title>Disclaimer | CampQ</title>
        <meta name="description" content="Read the CampQ disclaimer regarding the use of our platform, educational information accuracy, AI features, and limitation of liability." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
        <div className="bg-primary text-primary-foreground py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <AlertTriangle className="h-16 w-16 mx-auto mb-6 opacity-90" />
              <h1 className="text-4xl font-bold mb-4" data-testid="text-disclaimer-title">Disclaimer</h1>
              <p className="text-lg opacity-90">
                Last updated: February 2026
              </p>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto space-y-8">

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Info className="h-6 w-6 text-primary" />
                  General Disclaimer
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    The information provided on the CampQ platform (the "Platform"), operated by CampQ Pty Ltd ("we," "us," or "our"), is for general informational purposes only. While we endeavour to keep the information accurate and up to date, we make no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, suitability, or availability of the Platform or the information, products, services, or related graphics contained on the Platform for any purpose.
                  </p>
                  <p>
                    Any reliance you place on such information is strictly at your own risk. We recommend that you independently verify all information before making any decisions based on content found on our Platform.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Info className="h-6 w-6 text-primary" />
                  Educational Information
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    CampQ aggregates course and institution information from a variety of sources, including educational institutions, government databases, and publicly available data. While we strive to present accurate and current details, the following limitations apply:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Course availability:</strong> Courses listed on our Platform may be subject to change, cancellation, or enrolment caps without notice. Always confirm availability directly with the institution.</li>
                    <li><strong>Tuition fees and costs:</strong> Fees displayed are indicative and may not include all associated costs such as materials, student services, health cover, or living expenses. Institutions may adjust fees at any time.</li>
                    <li><strong>Entry requirements:</strong> Admission criteria shown are general guidelines. Institutions may have additional requirements, prerequisites, or quotas that are not reflected on our Platform.</li>
                    <li><strong>Accreditation and registration:</strong> We display accreditation information as provided by institutions. Students should verify the current registration status of courses and providers with the relevant regulatory authority, such as CRICOS (Commonwealth Register of Institutions and Courses for Overseas Students).</li>
                    <li><strong>Scholarships and financial aid:</strong> Scholarship information is provided as a guide and is subject to the terms and conditions of the offering institution or body.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Brain className="h-6 w-6 text-primary" />
                  AI-Powered Features
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    CampQ uses artificial intelligence (AI) technologies to enhance the user experience. These features include but are not limited to intelligent course matching, AI-assisted profile creation, content generation, and our AI chat assistant ("Zan"). Please be aware of the following:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>AI-generated content:</strong> Content produced by AI, including course descriptions, career pathway suggestions, and student biographies, is generated algorithmically and may not always be perfectly accurate. All AI-generated content is subject to human review.</li>
                    <li><strong>Course matching:</strong> Our intelligent course matching uses algorithms to suggest courses based on your profile and preferences. These suggestions are recommendations only and do not guarantee admission, suitability, or outcomes.</li>
                    <li><strong>Chat assistant:</strong> Zan, our AI assistant, provides general guidance and information. Zan's responses should not be considered professional advice, whether educational, legal, financial, or otherwise.</li>
                    <li><strong>Data processing:</strong> AI features may process personal data you provide. Please refer to our <a href="/privacy" className="text-[#2DBDB6] underline">Privacy Policy</a> for details on how we handle your information.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-6 w-6 text-primary" />
                  No Professional Advice
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    Nothing on this Platform constitutes professional advice of any kind. In particular:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Immigration and visa advice:</strong> Information about student visas, work rights, and immigration matters is provided for general awareness only. This is not migration advice under the Migration Act 1958 (Cth). For specific visa guidance, consult a registered migration agent (MARA-registered) or immigration lawyer.</li>
                    <li><strong>Financial advice:</strong> Information about tuition fees, living costs, and financial planning is general in nature and does not constitute financial advice. Seek independent financial advice for your specific circumstances.</li>
                    <li><strong>Legal advice:</strong> Any legal information on the Platform is general in nature and should not be relied upon as legal advice. Consult a qualified legal professional for specific legal matters.</li>
                    <li><strong>Career advice:</strong> Career pathway information and graduate outcome data are indicative and based on historical trends. Individual outcomes may vary significantly.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <ExternalLink className="h-6 w-6 text-primary" />
                  External Links
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    The Platform may contain links to external websites and resources operated by third parties, including educational institutions, government agencies, and service providers. These links are provided for your convenience and reference only.
                  </p>
                  <p>
                    We have no control over the content, privacy practices, or availability of these external sites. The inclusion of any link does not imply endorsement, sponsorship, or recommendation by CampQ. We are not responsible for any loss or damage that may arise from your use of external websites.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Shield className="h-6 w-6 text-primary" />
                  No Guarantee of Outcomes
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    CampQ acts as an intermediary platform connecting students with educational institutions. We do not guarantee:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Admission to any course, programme, or institution</li>
                    <li>The granting of any visa or permit</li>
                    <li>Employment outcomes following the completion of any course</li>
                    <li>The quality, suitability, or accreditation status of any course or institution</li>
                    <li>The accuracy of any information provided by third-party institutions</li>
                  </ul>
                  <p>
                    All decisions regarding admissions, visa grants, and employment are made by the respective institutions, government agencies, and employers independently of CampQ.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Scale className="h-6 w-6 text-primary" />
                  Limitation of Liability
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    To the fullest extent permitted by applicable law, including the Australian Consumer Law (Schedule 2 of the Competition and Consumer Act 2010), CampQ Pty Ltd, its directors, employees, partners, and affiliates shall not be liable for:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Any indirect, incidental, special, consequential, or punitive damages</li>
                    <li>Any loss of profits, data, goodwill, or other intangible losses</li>
                    <li>Any damages resulting from your access to, use of, or inability to use the Platform</li>
                    <li>Any unauthorised access to or alteration of your transmissions or data</li>
                    <li>Any errors, inaccuracies, or omissions in the content on the Platform</li>
                  </ul>
                  <p>
                    Nothing in this disclaimer excludes or limits liability that cannot be excluded or limited under applicable law, including liability for fraud or for death or personal injury caused by negligence.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4">Governing Law</h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    This Disclaimer is governed by the laws of the State of New South Wales, Australia. Any disputes arising from this Disclaimer or your use of the Platform shall be subject to the exclusive jurisdiction of the courts of New South Wales.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Mail className="h-6 w-6 text-primary" />
                  Contact Us
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>If you have any questions or concerns about this Disclaimer, please contact us:</p>
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
