import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  Code, 
  Key, 
  Shield, 
  Zap, 
  FileCode, 
  Server, 
  CheckCircle2,
  ArrowRight,
  Copy,
  ExternalLink,
  Upload
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Developers() {
  const { toast } = useToast();
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);

  const copyToClipboard = (text: string, endpoint: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(endpoint);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  const endpoints = [
    {
      method: "GET",
      path: "/api/partner/institutions",
      description: "List existing institutions for duplicate checking",
      permission: "institutions:read"
    },
    {
      method: "POST",
      path: "/api/partner/institutions",
      description: "Create a new institution as draft",
      permission: "institutions:create"
    },
    {
      method: "POST",
      path: "/api/partner/institutions/:id/logo",
      description: "Upload institution logo (multipart/form-data)",
      permission: "institutions:create"
    },
    {
      method: "POST",
      path: "/api/partner/courses",
      description: "Create a new course as draft",
      permission: "courses:create"
    }
  ];

  const courseLevels = [
    "VCE (11-12)", "Certificate II", "Certificate III", "Certificate IV",
    "Diploma", "Advanced Diploma", "Graduate Certificate", "Graduate Diploma",
    "Bachelor Degree", "Professional Year", "Masters Degree", "Doctoral Degree",
    "Higher Doctoral Degree", "ELICOS"
  ];

  const disciplines = [
    "Accounting", "Arts & Design", "Business & Management", "Computer Science & IT",
    "Education & Teaching", "Engineering", "Healthcare & Medicine", "Hospitality & Tourism",
    "Law & Legal Studies", "Marketing & Communications", "Science & Mathematics",
    "Social Sciences", "Trades & Vocational", "Other"
  ];

  return (
    <>
      <Helmet>
        <title>Partner API Documentation | CampQ</title>
        <meta name="description" content="Integrate with CampQ using our Partner API. Upload institutions and courses programmatically with AI bot support." />
        <meta property="og:title" content="Partner API Documentation | CampQ" />
        <meta property="og:description" content="Integrate with CampQ using our Partner API. Upload institutions and courses programmatically with AI bot support." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${window.location.origin}/developers`} />
        <meta property="og:image" content="https://anzglobal.com.au/wp-content/uploads/2021/05/logo.png" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-br from-primary/10 via-background to-accent/10 py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <Badge variant="secondary" className="mb-4" data-testid="badge-api-version">
                <Code className="h-3 w-3 mr-1" />
                Partner API v1.0
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6" data-testid="text-page-title">
                Partner API Documentation
              </h1>
              <p className="text-xl text-muted-foreground mb-8" data-testid="text-page-description">
                Integrate with CampQ to programmatically upload institutions and courses. 
                Perfect for AI bots, data aggregators, and education partners.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild>
                  <Link href="/contact?topic=api" data-testid="button-request-access">
                    <Key className="h-4 w-4 mr-2" />
                    Request API Access
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <a href="#endpoints" data-testid="button-view-endpoints">
                    <FileCode className="h-4 w-4 mr-2" />
                    View Endpoints
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-16">
          <div className="max-w-5xl mx-auto space-y-16">

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-6" data-testid="text-section-features">Key Features</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <Card data-testid="card-feature-authentication">
                  <CardHeader>
                    <Key className="h-8 w-8 text-foreground mb-2" />
                    <CardTitle className="text-lg">API Key Authentication</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">
                      Secure API key authentication with configurable permissions and rate limits per API key.
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-feature-drafts">
                  <CardHeader>
                    <Shield className="h-8 w-8 text-foreground mb-2" />
                    <CardTitle className="text-lg">Draft-First Workflow</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">
                      All submissions are created as drafts. Admin approval required before publishing ensures data quality.
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-feature-rate-limits">
                  <CardHeader>
                    <Zap className="h-8 w-8 text-foreground mb-2" />
                    <CardTitle className="text-lg">Flexible Rate Limits</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">
                      Default 100 requests/min and 1,000/hour. Custom limits available for high-volume partners.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-6" data-testid="text-section-auth">Authentication</h2>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground mb-4">
                    All Partner API requests require an API key passed in the <code className="bg-muted px-2 py-1 rounded text-sm font-mono">X-API-Key</code> header.
                  </p>
                  <div className="bg-muted rounded-lg p-4 font-mono text-sm">
                    <div className="flex items-center justify-between">
                      <span data-testid="code-auth-header">X-API-Key: your-api-key-here</span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyToClipboard("X-API-Key: your-api-key-here", "auth")}
                        data-testid="button-copy-auth"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    API keys are generated by Platform Admins. <Link href="/contact?topic=api" className="underline hover:no-underline" data-testid="link-contact-api">Contact us</Link> to request access.
                  </p>
                </CardContent>
              </Card>
            </section>

            <section id="endpoints">
              <h2 className="text-2xl font-bold text-foreground mb-6" data-testid="text-section-endpoints">API Endpoints</h2>
              <div className="space-y-4">
                {endpoints.map((endpoint, index) => (
                  <Card key={index} data-testid={`card-endpoint-${index}`}>
                    <CardContent className="pt-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant={endpoint.method === "GET" ? "secondary" : "default"}
                            data-testid={`badge-method-${index}`}
                          >
                            {endpoint.method}
                          </Badge>
                          <code className="font-mono text-sm" data-testid={`code-path-${index}`}>{endpoint.path}</code>
                        </div>
                        <Badge variant="outline" className="w-fit" data-testid={`badge-permission-${index}`}>
                          <Shield className="h-3 w-3 mr-1" />
                          {endpoint.permission}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-3" data-testid={`text-description-${index}`}>{endpoint.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-6" data-testid="text-section-institution">Create Institution</h2>
              <Card>
                <CardContent className="pt-6 space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">Required Fields</h3>
                    <div className="grid sm:grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        <code className="bg-muted px-2 py-0.5 rounded">name</code>
                        <span className="text-muted-foreground">- Institution name (unique)</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        <code className="bg-muted px-2 py-0.5 rounded">country</code>
                        <span className="text-muted-foreground">- Country location</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Example Request</h3>
                    <div className="bg-muted rounded-lg p-4 font-mono text-xs overflow-x-auto">
                      <pre data-testid="code-institution-example">{`POST /api/partner/institutions
Content-Type: application/json
X-API-Key: your-api-key

{
  "name": "Melbourne Business School",
  "country": "Australia",
  "website": "https://mbs.edu",
  "providerType": "University",
  "cricosProviderCode": "00116K",
  "topDisciplines": ["Business", "Management", "Finance"]
}`}</pre>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Response</h3>
                    <div className="bg-muted rounded-lg p-4 font-mono text-xs overflow-x-auto">
                      <pre data-testid="code-institution-response">{`{
  "success": true,
  "message": "Institution created as draft. Pending admin approval.",
  "data": {
    "id": "generated-uuid",
    "name": "Melbourne Business School",
    "approvalStatus": "pending",
    "publishStatus": "draft"
  }
}`}</pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-6" data-testid="text-section-logo-upload">Upload Institution Logo</h2>
              <Card>
                <CardContent className="pt-6 space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold">Direct File Upload</h3>
                    </div>
                    <p className="text-muted-foreground text-sm mb-4">
                      Upload a logo image directly for an institution. The image is automatically resized to 160x160 pixels and converted to PNG format.
                      Use the institution ID returned from the Create Institution endpoint.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Accepted formats: JPEG, PNG, GIF, WebP</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Max file size: 5MB</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Auto-resized to 160x160px</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Field name: <code className="bg-muted px-1 py-0.5 rounded">logo</code></span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Example Request (cURL)</h3>
                    <div className="bg-muted rounded-lg p-4 font-mono text-xs overflow-x-auto">
                      <pre data-testid="code-logo-upload-example">{`curl -X POST /api/partner/institutions/{id}/logo \\
  -H "X-API-Key: your-api-key" \\
  -F "logo=@/path/to/logo.png"`}</pre>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Response</h3>
                    <div className="bg-muted rounded-lg p-4 font-mono text-xs overflow-x-auto">
                      <pre data-testid="code-logo-upload-response">{`{
  "success": true,
  "message": "Institution logo uploaded and processed successfully",
  "data": {
    "institutionId": "institution-uuid",
    "logoUrl": "/institutions/college-logo-uuid-1706234567890.png",
    "dimensions": "160x160",
    "format": "png"
  }
}`}</pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-6" data-testid="text-section-course">Create Course</h2>
              <Card>
                <CardContent className="pt-6 space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">Required Fields</h3>
                    <div className="grid sm:grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        <code className="bg-muted px-2 py-0.5 rounded">universityId</code>
                        <span className="text-muted-foreground">- Parent institution UUID</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        <code className="bg-muted px-2 py-0.5 rounded">title</code>
                        <span className="text-muted-foreground">- Course title</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        <code className="bg-muted px-2 py-0.5 rounded">subject</code>
                        <span className="text-muted-foreground">- Subject area</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        <code className="bg-muted px-2 py-0.5 rounded">level</code>
                        <span className="text-muted-foreground">- Course level</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Valid Course Levels</h3>
                    <div className="flex flex-wrap gap-2">
                      {courseLevels.map((level) => (
                        <Badge key={level} variant="outline" className="text-xs" data-testid={`badge-level-${level.toLowerCase().replace(/\s+/g, "-")}`}>
                          {level}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Valid Disciplines</h3>
                    <div className="flex flex-wrap gap-2">
                      {disciplines.map((discipline) => (
                        <Badge key={discipline} variant="secondary" className="text-xs" data-testid={`badge-discipline-${discipline.toLowerCase().replace(/\s+/g, "-")}`}>
                          {discipline}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Example Request</h3>
                    <div className="bg-muted rounded-lg p-4 font-mono text-xs overflow-x-auto">
                      <pre data-testid="code-course-example">{`POST /api/partner/courses
Content-Type: application/json
X-API-Key: your-api-key

{
  "universityId": "institution-uuid",
  "title": "Master of Business Administration",
  "subject": "Business Administration",
  "level": "Masters Degree",
  "discipline": "Business & Management",
  "fees": 75000,
  "currency": "AUD",
  "duration": "2 years",
  "deliveryMode": "hybrid",
  "intakes": ["February", "July"]
}`}</pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-6" data-testid="text-section-errors">Error Codes</h2>
              <Card>
                <CardContent className="pt-6">
                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-start gap-3">
                      <Badge variant="secondary">200</Badge>
                      <span className="text-muted-foreground">Success</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge variant="secondary">201</Badge>
                      <span className="text-muted-foreground">Created</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge variant="destructive">400</Badge>
                      <span className="text-muted-foreground">Bad Request - Validation error</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge variant="destructive">401</Badge>
                      <span className="text-muted-foreground">Unauthorized - Invalid API key</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge variant="destructive">403</Badge>
                      <span className="text-muted-foreground">Forbidden - Lacks permission</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge variant="destructive">409</Badge>
                      <span className="text-muted-foreground">Conflict - Duplicate resource</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge variant="destructive">429</Badge>
                      <span className="text-muted-foreground">Too Many Requests - Rate limit</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge variant="destructive">500</Badge>
                      <span className="text-muted-foreground">Internal Server Error</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-6" data-testid="text-section-workflow">Approval Workflow</h2>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground font-semibold">1</div>
                      <span>Bot submits</span>
                    </div>
                    <ArrowRight className="hidden md:block h-4 w-4 text-muted-foreground" />
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground font-semibold">2</div>
                      <span>Created as draft</span>
                    </div>
                    <ArrowRight className="hidden md:block h-4 w-4 text-muted-foreground" />
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground font-semibold">3</div>
                      <span>Admin reviews</span>
                    </div>
                    <ArrowRight className="hidden md:block h-4 w-4 text-muted-foreground" />
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground font-semibold">4</div>
                      <span>Published</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="bg-primary/5 rounded-2xl p-8 text-center">
              <Server className="h-12 w-12 text-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-4" data-testid="text-cta-title">Ready to Integrate?</h2>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto" data-testid="text-cta-description">
                Contact our team to get your API key and start uploading institutions and courses programmatically.
              </p>
              <Button size="lg" asChild>
                <Link href="/contact?topic=api" data-testid="button-contact-api">
                  Request API Access
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </section>

          </div>
        </div>
      </div>
    </>
  );
}
