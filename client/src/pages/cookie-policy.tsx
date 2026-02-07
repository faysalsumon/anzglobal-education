import { Card, CardContent } from "@/components/ui/card";
import { Helmet } from "react-helmet";
import { Cookie, Shield, Settings, Eye, Globe, Mail } from "lucide-react";

export default function CookiePolicy() {
  return (
    <>
      <Helmet>
        <title>Cookie Policy | CampQ</title>
        <meta name="description" content="Learn how CampQ uses cookies and similar technologies to improve your experience on our platform." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
        <div className="bg-primary text-primary-foreground py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <Cookie className="h-16 w-16 mx-auto mb-6 opacity-90" />
              <h1 className="text-4xl font-bold mb-4" data-testid="text-cookie-policy-title">Cookie Policy</h1>
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
                  <Cookie className="h-6 w-6 text-primary" />
                  What Are Cookies?
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    Cookies are small text files that are stored on your device (computer, tablet, or mobile phone) when you visit a website. They are widely used to make websites work more efficiently and to provide information to website owners.
                  </p>
                  <p>
                    CampQ Pty Ltd ("we," "us," or "our") uses cookies and similar tracking technologies on the CampQ platform (the "Platform") to enhance your browsing experience, analyse site traffic, and personalise content.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Shield className="h-6 w-6 text-primary" />
                  Essential Cookies
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    These cookies are strictly necessary for the Platform to function and cannot be switched off. They are usually set in response to actions you take, such as logging in, filling in forms, or setting your privacy preferences.
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Authentication cookies:</strong> Keep you signed in as you navigate between pages so you do not have to re-enter your credentials.</li>
                    <li><strong>Session cookies:</strong> Maintain your session state, including form progress and application data, while you use the Platform.</li>
                    <li><strong>Security cookies:</strong> Help protect your account by detecting irregular login activity and preventing cross-site request forgery (CSRF).</li>
                    <li><strong>Cookie consent cookie:</strong> Remembers your cookie preferences so you are not asked again on each visit.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Eye className="h-6 w-6 text-primary" />
                  Analytics Cookies
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    These cookies help us understand how visitors interact with the Platform by collecting and reporting information anonymously. This data allows us to improve how the Platform works.
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Page views and navigation:</strong> Track which pages are visited most often and how users move through the site.</li>
                    <li><strong>Performance monitoring:</strong> Measure page load times and identify areas where we can improve speed and reliability.</li>
                    <li><strong>Error tracking:</strong> Detect and diagnose technical issues so we can fix them quickly.</li>
                    <li><strong>Usage patterns:</strong> Understand which features are most popular, helping us prioritise development efforts.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Settings className="h-6 w-6 text-primary" />
                  Functionality Cookies
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    These cookies enable enhanced functionality and personalisation. They may be set by us or by third-party providers whose services we have integrated into our pages.
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Language and region preferences:</strong> Remember your preferred language and location settings.</li>
                    <li><strong>Theme preferences:</strong> Store your light or dark mode selection so the Platform displays consistently.</li>
                    <li><strong>Search preferences:</strong> Remember your recent course searches and filter settings to streamline your experience.</li>
                    <li><strong>Chat history:</strong> Maintain your conversation history with our AI assistant Zan for continuity across sessions.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Globe className="h-6 w-6 text-primary" />
                  Third-Party Cookies
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    Some cookies are placed by third-party services that appear on our pages. We do not control these cookies. The third parties we work with include:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Google Analytics:</strong> Provides aggregated website traffic and usage data. <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#2DBDB6] underline">Google Privacy Policy</a></li>
                    <li><strong>Google Maps:</strong> Powers our campus location maps and location-based search features. <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#2DBDB6] underline">Google Privacy Policy</a></li>
                    <li><strong>Supabase:</strong> Handles authentication and stores session tokens securely. <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#2DBDB6] underline">Supabase Privacy Policy</a></li>
                  </ul>
                  <p>
                    We encourage you to review the privacy policies of these third parties to understand how they process your data.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Settings className="h-6 w-6 text-primary" />
                  Managing Your Cookie Preferences
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    You can control and manage cookies in several ways. Please note that removing or blocking certain cookies may impact your experience on the Platform and some features may not function as intended.
                  </p>
                  <p>
                    <strong>Browser settings:</strong> Most web browsers allow you to manage cookies through their settings. You can typically find these in the "Options," "Preferences," or "Privacy" menu of your browser. You can set your browser to block or delete cookies, or to alert you when a cookie is being set.
                  </p>
                  <p>
                    <strong>Opt-out links:</strong> Some third-party services offer direct opt-out mechanisms:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Google Analytics: <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-[#2DBDB6] underline">Google Analytics Opt-out Browser Add-on</a></li>
                  </ul>
                  <p>
                    <strong>Do Not Track:</strong> Some browsers offer a "Do Not Track" feature. While there is no universal standard for how websites should respond to this signal, we respect your privacy choices and strive to limit tracking where possible.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4">Changes to This Cookie Policy</h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    We may update this Cookie Policy from time to time to reflect changes in technology, legislation, or our business practices. We will post any changes on this page and update the "Last updated" date at the top. We encourage you to review this policy periodically.
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
                  <p>If you have any questions about our use of cookies, please contact us:</p>
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
