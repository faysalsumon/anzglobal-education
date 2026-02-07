import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Palette,
  Type,
  Layout,
  Image,
  CheckCircle2,
  XCircle,
  Copy,
  ArrowRight,
  GraduationCap,
  Search,
  BookOpen,
  Globe,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import primaryLogoUrl from "@assets/Primary_Logo_400x120_1770431203112.png";
import whiteLogoUrl from "@assets/White_Logo_Primary-Dark_Background_400x120_1770431203113.png";
import logoWithTaglineUrl from "@assets/Logo_with_tagline_1770431203110.png";
import logoIconUrl from "@assets/Logo_Icon_(Qmark)512x512_1770431203109.png";

interface ColorSwatchProps {
  name: string;
  hex: string;
  usage: string;
  textColor?: string;
}

function ColorSwatch({ name, hex, usage, textColor = "white" }: ColorSwatchProps) {
  const { toast } = useToast();

  const copyHex = () => {
    navigator.clipboard.writeText(hex);
    toast({ title: "Copied", description: `${hex} copied to clipboard` });
  };

  return (
    <div className="flex flex-col gap-1.5" data-testid={`swatch-${name.toLowerCase().replace(/\s/g, "-")}`}>
      <button
        onClick={copyHex}
        aria-label={`Copy ${name} color ${hex}`}
        className="relative group rounded-md h-24 flex items-end p-3 transition-transform active:scale-[0.98]"
        style={{ backgroundColor: hex, color: textColor }}
      >
        <Copy className="absolute top-2 right-2 w-4 h-4 opacity-0 group-hover:opacity-60 transition-opacity" />
        <span className="font-mono text-sm font-semibold">{hex}</span>
      </button>
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{usage}</p>
      </div>
    </div>
  );
}

interface TypographySampleProps {
  label: string;
  font: string;
  weight: string;
  sampleText: string;
  className: string;
}

function TypographySample({ label, font, weight, sampleText, className }: TypographySampleProps) {
  return (
    <div className="flex flex-col gap-1" data-testid={`typo-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="secondary">{label}</Badge>
        <span className="text-xs text-muted-foreground">{font} &middot; {weight}</span>
      </div>
      <p className={className}>{sampleText}</p>
    </div>
  );
}

interface ContrastRowProps {
  bg: string;
  bgLabel: string;
  fg: string;
  fgLabel: string;
  ratio: string;
  pass: boolean;
}

function ContrastRow({ bg, bgLabel, fg, fgLabel, ratio, pass }: ContrastRowProps) {
  return (
    <div className="flex items-center gap-3 py-2 flex-wrap" data-testid={`contrast-${bgLabel.toLowerCase().replace(/\s/g, "-")}-${fgLabel.toLowerCase().replace(/\s/g, "-")}`}>
      <div className="flex items-center gap-1.5">
        <div className="w-6 h-6 rounded-md border border-border" style={{ backgroundColor: bg }} />
        <span className="text-xs font-mono">{bgLabel}</span>
      </div>
      <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
      <div className="flex items-center gap-1.5">
        <div className="w-6 h-6 rounded-md border border-border" style={{ backgroundColor: fg }} />
        <span className="text-xs font-mono">{fgLabel}</span>
      </div>
      <span className="text-xs font-semibold ml-auto">{ratio}</span>
      {pass ? (
        <Badge variant="default" className="bg-green-600 border-green-700 text-white text-xs">
          <CheckCircle2 className="w-3 h-3 mr-1" /> AA Pass
        </Badge>
      ) : (
        <Badge variant="destructive" className="text-xs">
          <XCircle className="w-3 h-3 mr-1" /> Fail
        </Badge>
      )}
    </div>
  );
}

export function AdminBrandGuidelines() {
  return (
    <div className="space-y-6" data-testid="brand-guidelines-container">

      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight" data-testid="text-brand-title">CampQ Brand Guidelines</h2>
        <p className="text-muted-foreground">
          Internal reference for maintaining consistent brand identity across all CampQ materials.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <Card data-testid="card-logo-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Image className="w-5 h-5" /> Primary Logo</CardTitle>
            <CardDescription>For use on light backgrounds and standard layouts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-border bg-white p-6 flex items-center justify-center">
              <img src={primaryLogoUrl} alt="CampQ primary logo" className="max-h-16 object-contain" data-testid="img-logo-primary" />
            </div>
            <div className="rounded-md border border-border p-6 flex items-center justify-center" style={{ backgroundColor: "#f8f9fa" }}>
              <img src={logoWithTaglineUrl} alt="CampQ logo with tagline" className="max-h-20 object-contain" data-testid="img-logo-tagline" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-logo-dark">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Image className="w-5 h-5" /> Dark Background Logo</CardTitle>
            <CardDescription>For use on dark or navy backgrounds</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md p-6 flex items-center justify-center" style={{ backgroundColor: "#1E2A5E" }}>
              <img src={whiteLogoUrl} alt="CampQ white logo" className="max-h-16 object-contain" data-testid="img-logo-white" />
            </div>
            <div className="flex items-center gap-4 justify-center">
              <div className="rounded-md border border-border bg-white p-4 flex items-center justify-center">
                <img src={logoIconUrl} alt="CampQ Q icon" className="w-16 h-16 object-contain" data-testid="img-logo-icon" />
              </div>
              <div className="rounded-md p-4 flex items-center justify-center" style={{ backgroundColor: "#1E2A5E" }}>
                <img src={logoIconUrl} alt="CampQ Q icon on dark" className="w-16 h-16 object-contain" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              The "Q" icon mark can be used independently as an app icon, favicon, or avatar.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-logo-rules">
        <CardHeader>
          <CardTitle>Logo Usage Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-1.5 text-green-700 dark:text-green-400">
                <CheckCircle2 className="w-4 h-4" /> Do
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Maintain minimum clear space equal to the height of the "Q" icon</li>
                <li>Use the white version on dark backgrounds</li>
                <li>Use the primary version on light backgrounds</li>
                <li>Keep the logo horizontally aligned and legible</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-1.5 text-red-700 dark:text-red-400">
                <XCircle className="w-4 h-4" /> Don't
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Stretch, rotate, or distort the logo</li>
                <li>Change the logo colors</li>
                <li>Add drop shadows or effects</li>
                <li>Place on busy or low-contrast backgrounds</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card data-testid="card-colors">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Palette className="w-5 h-5" /> Color Palette</CardTitle>
          <CardDescription>Click any swatch to copy its hex value</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold mb-3">Primary Colors</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <ColorSwatch name="Navy Blue" hex="#1E2A5E" usage="Primary brand, headers, text" />
              <ColorSwatch name="Teal" hex="#2DBDB6" usage="Accent, the 'Q', CTAs" />
              <ColorSwatch name="Deep Navy" hex="#141D45" usage="Dark mode surfaces" />
              <ColorSwatch name="Light Teal" hex="#E6F7F6" usage="Teal tint backgrounds" textColor="#1E2A5E" />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3">Supporting Colors</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <ColorSwatch name="White" hex="#FFFFFF" usage="Backgrounds, cards" textColor="#333333" />
              <ColorSwatch name="Light Gray" hex="#F5F7FA" usage="Section backgrounds" textColor="#333333" />
              <ColorSwatch name="Medium Gray" hex="#6B7280" usage="Secondary text" textColor="white" />
              <ColorSwatch name="Dark Gray" hex="#333333" usage="Body text" textColor="white" />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3">Semantic Colors</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <ColorSwatch name="Success" hex="#10B981" usage="Confirmations, approved" />
              <ColorSwatch name="Warning" hex="#F59E0B" usage="Cautions, pending" textColor="#333333" />
              <ColorSwatch name="Error" hex="#EF4444" usage="Errors, destructive" />
              <ColorSwatch name="Info" hex="#3B82F6" usage="Informational messages" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card data-testid="card-typography">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Type className="w-5 h-5" /> Typography</CardTitle>
          <CardDescription>Font families, sizes, and weight hierarchy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <TypographySample
            label="H1 / Page Title"
            font="Nunito"
            weight="800 (Extra Bold)"
            sampleText="Intelligent Course Matching"
            className="text-3xl font-extrabold tracking-tight"
          />
          <Separator />
          <TypographySample
            label="H2 / Section Title"
            font="Nunito"
            weight="700 (Bold)"
            sampleText="Discover Your Perfect University"
            className="text-2xl font-bold tracking-tight"
          />
          <Separator />
          <TypographySample
            label="H3 / Card Title"
            font="Nunito"
            weight="600 (Semibold)"
            sampleText="Browse Courses by Discipline"
            className="text-xl font-semibold"
          />
          <Separator />
          <TypographySample
            label="Body"
            font="Open Sans"
            weight="400 (Regular)"
            sampleText="CampQ connects ambitious international students with world-class universities through AI-powered intelligent course matching. Our platform simplifies the entire journey from course discovery to application submission."
            className="text-base leading-relaxed"
          />
          <Separator />
          <TypographySample
            label="Caption / Helper"
            font="Open Sans"
            weight="400 (Regular)"
            sampleText="Last updated 3 hours ago  ·  12 results found"
            className="text-sm text-muted-foreground"
          />
        </CardContent>
      </Card>

      <Separator />

      <Card data-testid="card-buttons">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Layout className="w-5 h-5" /> Buttons & Badges</CardTitle>
          <CardDescription>Interactive component styles used across the platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold mb-3">Button Variants</h4>
            <div className="flex flex-wrap gap-3 items-center">
              <Button data-testid="button-demo-default">
                <Search className="w-4 h-4 mr-1.5" /> Search Courses
              </Button>
              <Button variant="secondary" data-testid="button-demo-secondary">
                <BookOpen className="w-4 h-4 mr-1.5" /> View Details
              </Button>
              <Button variant="outline" data-testid="button-demo-outline">
                <Globe className="w-4 h-4 mr-1.5" /> Explore
              </Button>
              <Button variant="ghost" data-testid="button-demo-ghost">
                Learn More
              </Button>
              <Button variant="destructive" data-testid="button-demo-destructive">
                Remove
              </Button>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-semibold mb-3">Button Sizes</h4>
            <div className="flex flex-wrap gap-3 items-center">
              <Button size="lg" data-testid="button-demo-lg">Large CTA</Button>
              <Button size="default" data-testid="button-demo-md">Default</Button>
              <Button size="sm" data-testid="button-demo-sm">Small</Button>
              <Button size="icon" data-testid="button-demo-icon"><Sparkles className="w-4 h-4" /></Button>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-semibold mb-3">Badge Variants</h4>
            <div className="flex flex-wrap gap-2 items-center">
              <Badge data-testid="badge-demo-default">Active</Badge>
              <Badge variant="secondary" data-testid="badge-demo-secondary">Draft</Badge>
              <Badge variant="outline" data-testid="badge-demo-outline">Pending</Badge>
              <Badge variant="destructive" data-testid="badge-demo-destructive">Rejected</Badge>
              <Badge className="bg-green-600 border-green-700 text-white" data-testid="badge-demo-success">Approved</Badge>
              <Badge className="bg-yellow-500 border-yellow-600 text-white" data-testid="badge-demo-warning">Under Review</Badge>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-semibold mb-3">Branded CTA Example</h4>
            <div className="rounded-md p-6 flex flex-col sm:flex-row items-center gap-4" style={{ backgroundColor: "#1E2A5E" }}>
              <div className="text-white text-center sm:text-left">
                <p className="font-bold text-lg">Ready to find your perfect course?</p>
                <p className="text-sm text-white/70">Let our AI match you with the best options.</p>
              </div>
              <Button
                className="shrink-0 text-white font-semibold"
                style={{ backgroundColor: "#2DBDB6", borderColor: "#25a8a2" }}
                data-testid="button-demo-branded-cta"
              >
                <GraduationCap className="w-4 h-4 mr-1.5" /> Match Me Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card data-testid="card-cards-demo">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Layout className="w-5 h-5" /> Card Layouts</CardTitle>
          <CardDescription>Standard card patterns used for content across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card data-testid="card-demo-stat">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-3xl font-bold mt-1">2,481</p>
                <p className="text-xs text-green-600 mt-1 font-medium">+12% from last month</p>
              </CardContent>
            </Card>
            <Card data-testid="card-demo-stat-2">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Active Applications</p>
                <p className="text-3xl font-bold mt-1">347</p>
                <p className="text-xs text-muted-foreground mt-1">Across 24 institutions</p>
              </CardContent>
            </Card>
            <Card data-testid="card-demo-stat-3">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">AI Matches Today</p>
                <p className="text-3xl font-bold mt-1">89</p>
                <p className="text-xs font-medium mt-1" style={{ color: "#2DBDB6" }}>Powered by CampQ AI</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card data-testid="card-spacing">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Layout className="w-5 h-5" /> Spacing & Layout</CardTitle>
          <CardDescription>Consistent spacing units used throughout the platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {[
              { label: "XS", px: "4px", tailwind: "p-1 / gap-1", desc: "Icon padding, inline spacing" },
              { label: "SM", px: "8px", tailwind: "p-2 / gap-2", desc: "Badge padding, tight groups" },
              { label: "MD", px: "16px", tailwind: "p-4 / gap-4", desc: "Card padding, section gaps" },
              { label: "LG", px: "24px", tailwind: "p-6 / gap-6", desc: "Panel padding, major sections" },
              { label: "XL", px: "32px", tailwind: "p-8 / gap-8", desc: "Page margins, hero spacing" },
            ].map((sp) => (
              <div key={sp.label} className="flex items-center gap-3 flex-wrap" data-testid={`spacing-${sp.label.toLowerCase()}`}>
                <Badge variant="outline" className="w-10 justify-center font-mono">{sp.label}</Badge>
                <div
                  className="rounded-md"
                  style={{
                    width: sp.px,
                    height: "24px",
                    backgroundColor: "#2DBDB6",
                    minWidth: sp.px,
                  }}
                />
                <span className="text-sm font-mono">{sp.px}</span>
                <span className="text-xs text-muted-foreground">({sp.tailwind})</span>
                <span className="text-xs text-muted-foreground hidden sm:inline">&mdash; {sp.desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card data-testid="card-contrast">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Palette className="w-5 h-5" /> Contrast & Accessibility</CardTitle>
          <CardDescription>WCAG AA compliance requires a minimum contrast ratio of 4.5:1 for normal text</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <ContrastRow bg="#1E2A5E" bgLabel="Navy" fg="#FFFFFF" fgLabel="White" ratio="12.4:1" pass={true} />
          <Separator />
          <ContrastRow bg="#FFFFFF" bgLabel="White" fg="#1E2A5E" fgLabel="Navy" ratio="12.4:1" pass={true} />
          <Separator />
          <ContrastRow bg="#1E2A5E" bgLabel="Navy" fg="#2DBDB6" fgLabel="Teal" ratio="5.8:1" pass={true} />
          <Separator />
          <ContrastRow bg="#FFFFFF" bgLabel="White" fg="#2DBDB6" fgLabel="Teal" ratio="2.1:1" pass={false} />
          <Separator />
          <ContrastRow bg="#FFFFFF" bgLabel="White" fg="#333333" fgLabel="Dark Gray" ratio="12.6:1" pass={true} />
          <Separator />
          <ContrastRow bg="#F5F7FA" bgLabel="Light Gray" fg="#333333" fgLabel="Dark Gray" ratio="11.3:1" pass={true} />
          <Separator />
          <ContrastRow bg="#FFFFFF" bgLabel="White" fg="#6B7280" fgLabel="Medium Gray" ratio="5.0:1" pass={true} />
          <p className="text-xs text-muted-foreground pt-2">
            Teal (#2DBDB6) on white fails AA for body text. Use it only for large headings, icons, or decorative elements.
            For interactive elements on white, pair teal with Navy text or use teal as a background with white text.
          </p>
        </CardContent>
      </Card>

      <Separator />

      <Card data-testid="card-voice-tone">
        <CardHeader>
          <CardTitle>Voice & Tone</CardTitle>
          <CardDescription>How CampQ communicates with its audience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Brand Personality</h4>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li className="flex items-start gap-2"><Sparkles className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#2DBDB6" }} /> <span><strong>Intelligent</strong> &mdash; Data-driven, precise, trustworthy</span></li>
                <li className="flex items-start gap-2"><Globe className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#2DBDB6" }} /> <span><strong>Global</strong> &mdash; Inclusive, culturally aware, welcoming</span></li>
                <li className="flex items-start gap-2"><GraduationCap className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#2DBDB6" }} /> <span><strong>Empowering</strong> &mdash; Student-first, supportive, enabling</span></li>
                <li className="flex items-start gap-2"><Search className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#2DBDB6" }} /> <span><strong>Clear</strong> &mdash; Simple language, no jargon, accessible</span></li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Tagline</h4>
              <p className="text-lg font-bold" style={{ color: "#1E2A5E" }} data-testid="text-tagline">
                intelligent course matching
              </p>
              <p className="text-sm text-muted-foreground">
                Always lowercase. Used beneath the logo or as a standalone descriptor.
              </p>
              <h4 className="text-sm font-semibold mt-3">AI Assistant Name</h4>
              <p className="text-sm text-muted-foreground">
                <strong>Zan</strong> from CampQ &mdash; the friendly, knowledgeable AI guide that helps students discover and apply to courses.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card data-testid="card-assets">
        <CardHeader>
          <CardTitle>Asset Downloads</CardTitle>
          <CardDescription>Quick reference for all brand assets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Primary Logo", desc: "400 x 120px, PNG", img: primaryLogoUrl, bg: "#FFFFFF" },
              { label: "White Logo", desc: "400 x 120px, PNG", img: whiteLogoUrl, bg: "#1E2A5E" },
              { label: "Logo + Tagline", desc: "Full lockup, PNG", img: logoWithTaglineUrl, bg: "#F5F7FA" },
              { label: "Q Icon Mark", desc: "512 x 512px, PNG", img: logoIconUrl, bg: "#FFFFFF" },
            ].map((asset) => (
              <div key={asset.label} className="rounded-md border border-border overflow-hidden" data-testid={`asset-${asset.label.toLowerCase().replace(/\s/g, "-")}`}>
                <div className="p-4 flex items-center justify-center h-20" style={{ backgroundColor: asset.bg }}>
                  <img src={asset.img} alt={asset.label} className="max-h-12 object-contain" />
                </div>
                <div className="p-3 border-t border-border">
                  <p className="text-sm font-medium">{asset.label}</p>
                  <p className="text-xs text-muted-foreground">{asset.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
