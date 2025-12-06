import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Users, 
  DollarSign, 
  Link as LinkIcon, 
  Copy, 
  Check, 
  TrendingUp,
  Gift,
  Share2,
  Building2,
  CreditCard,
  ArrowRight,
  Star,
  Zap,
  Shield
} from "lucide-react";
import type { User, StudentProfile, Referral } from "@shared/schema";

interface ReferralWithStudent extends Referral {
  referredStudent: StudentProfile;
}

interface ReferralStats {
  totalReferrals: number;
  pendingReferrals: number;
  completedReferrals: number;
  totalBonus: number;
}

function AffiliateLanding() {
  const [, navigate] = useLocation();

  const benefits = [
    {
      icon: DollarSign,
      title: "Earn Commission",
      description: "Earn competitive bonuses for every student you refer who enrolls"
    },
    {
      icon: LinkIcon,
      title: "Unique Referral Link",
      description: "Get your personal referral link to share with potential students"
    },
    {
      icon: TrendingUp,
      title: "Track Performance",
      description: "Monitor your referrals, conversions, and earnings in real-time"
    },
    {
      icon: Gift,
      title: "Bonus Rewards",
      description: "Earn extra bonuses when students complete their applications"
    }
  ];

  const steps = [
    {
      number: "1",
      title: "Register",
      description: "Create your free affiliate account with ANZ Global Education"
    },
    {
      number: "2",
      title: "Get Your Link",
      description: "Receive your unique referral link to share with students"
    },
    {
      number: "3",
      title: "Share & Earn",
      description: "Share your link and earn commissions on successful referrals"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4">
            <Star className="w-3 h-3 mr-1" />
            Affiliate Program
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Earn Money by Helping Students Study Abroad
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join our affiliate program and earn commissions by referring students to ANZ Global Education. 
            No experience needed - just share your referral link!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate("/login")}
              data-testid="button-affiliate-register"
            >
              Join as Affiliate
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate("/login")}
              data-testid="button-affiliate-login"
            >
              Already Registered? Login
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-16 border-t">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">Why Become an Affiliate?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Turn your network into earning potential by connecting students with world-class education opportunities
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {benefits.map((benefit, index) => (
            <Card key={index} className="text-center hover-elevate">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container mx-auto px-4 py-16 border-t">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">How It Works</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Getting started is simple - follow these three easy steps
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                {step.number}
              </div>
              <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-12">
          <Button 
            size="lg" 
            onClick={() => navigate("/login")}
            data-testid="button-get-started"
          >
            Get Started Now
            <Zap className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Trust Section */}
      <section className="container mx-auto px-4 py-16 border-t">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-8">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center md:text-left">
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Trusted by Education Agents Worldwide
                  </h3>
                  <p className="text-muted-foreground">
                    ANZ Global Education partners with hundreds of institutions across Australia. 
                    Our transparent commission structure and reliable payment system make us the 
                    preferred choice for education affiliates.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function AffiliateDashboard() {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const { data: profile, isLoading: profileLoading } = useQuery<StudentProfile>({
    queryKey: ["/api/student/profile"],
    enabled: !!user,
  });

  const { data: referralData } = useQuery<{ referralCode: string; referralLink: string }>({
    queryKey: ["/api/student/referral/code"],
    enabled: !!profile,
  });

  const { data: referrals = [] } = useQuery<ReferralWithStudent[]>({
    queryKey: ["/api/student/referral/list"],
    enabled: !!profile,
  });

  const { data: stats } = useQuery<ReferralStats>({
    queryKey: ["/api/student/referral/stats"],
    enabled: !!profile,
  });

  const handleCopyLink = () => {
    if (referralData?.referralLink) {
      navigator.clipboard.writeText(referralData.referralLink);
      setCopied(true);
      toast({
        title: "Link Copied!",
        description: "Your referral link has been copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-lg mx-auto">
          <CardHeader>
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-center">Set Up Your Affiliate Account</CardTitle>
            <CardDescription className="text-center">
              To become an affiliate and get your referral link, you need to complete a quick profile setup. 
              This will generate your unique referral code.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">What you'll get:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Unique referral link to share
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Dashboard to track referrals
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Earn bonuses on successful referrals
                </li>
              </ul>
            </div>
            <Button 
              className="w-full" 
              onClick={() => navigate("/student/profile")}
              data-testid="button-setup-affiliate"
            >
              Set Up Affiliate Profile
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Affiliate Dashboard</h1>
          <p className="text-muted-foreground">Manage your referrals and track your earnings</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total-referrals">
                {stats?.totalReferrals || 0}
              </div>
              <p className="text-xs text-muted-foreground">Students referred</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Users className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-pending-referrals">
                {stats?.pendingReferrals || 0}
              </div>
              <p className="text-xs text-muted-foreground">Awaiting completion</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Check className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-completed-referrals">
                {stats?.completedReferrals || 0}
              </div>
              <p className="text-xs text-muted-foreground">Successful referrals</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bonus</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total-bonus">
                ${stats?.totalBonus?.toFixed(2) || "0.00"}
              </div>
              <p className="text-xs text-muted-foreground">Earned to date</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="referral-link" className="space-y-6">
          <TabsList>
            <TabsTrigger value="referral-link" data-testid="tab-referral-link">
              <LinkIcon className="h-4 w-4 mr-2" />
              Referral Link
            </TabsTrigger>
            <TabsTrigger value="referrals" data-testid="tab-referrals">
              <Users className="h-4 w-4 mr-2" />
              My Referrals
            </TabsTrigger>
            <TabsTrigger value="payout" data-testid="tab-payout">
              <CreditCard className="h-4 w-4 mr-2" />
              Payout Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="referral-link">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  Your Referral Link
                </CardTitle>
                <CardDescription>
                  Share this link with students. When they sign up and apply, you earn a bonus!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    value={referralData?.referralLink || "Loading..."} 
                    readOnly 
                    className="font-mono text-sm"
                    data-testid="input-referral-link"
                  />
                  <Button 
                    onClick={handleCopyLink} 
                    variant="outline"
                    data-testid="button-copy-link"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Your Referral Code:</p>
                  <code className="text-lg font-bold text-primary" data-testid="text-referral-code">
                    {referralData?.referralCode || "Loading..."}
                  </code>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referrals">
            <Card>
              <CardHeader>
                <CardTitle>Your Referrals</CardTitle>
                <CardDescription>
                  Track all students you've referred and their application status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {referrals.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No referrals yet</p>
                    <p className="text-sm text-muted-foreground">Share your referral link to start earning!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {referrals.map((referral) => (
                      <div 
                        key={referral.id} 
                        className="flex items-center justify-between p-4 border rounded-lg"
                        data-testid={`referral-item-${referral.id}`}
                      >
                        <div>
                          <p className="font-medium">
                            {referral.referredStudent?.firstName} {referral.referredStudent?.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Referred on {new Date(referral.createdAt!).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={referral.status === 'completed' ? 'default' : 'secondary'}>
                            {referral.status}
                          </Badge>
                          {referral.bonusAmount && (
                            <p className="text-sm text-green-600 mt-1">
                              +${referral.bonusAmount}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payout">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Payout Details
                </CardTitle>
                <CardDescription>
                  Add your bank details to receive your referral bonuses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BankDetailsForm profileId={profile.id} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function BankDetailsForm({ profileId }: { profileId: string }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    bankAccountHolderName: "",
    bankName: "",
    bankAccountNumber: "",
    bankBsbCode: "",
  });

  // Load existing bank details
  const { data: bankDetails, isLoading } = useQuery<{
    bankAccountHolderName: string;
    bankName: string;
    bankBsbCode: string;
    bankAccountNumber: string;
  }>({
    queryKey: ["/api/student/bank-details"],
  });

  // Update form when data loads
  useState(() => {
    if (bankDetails) {
      setFormData({
        bankAccountHolderName: bankDetails.bankAccountHolderName || "",
        bankName: bankDetails.bankName || "",
        bankBsbCode: bankDetails.bankBsbCode || "",
        bankAccountNumber: bankDetails.bankAccountNumber || "",
      });
    }
  });

  // Mutation to save bank details
  const saveBankDetails = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("PUT", "/api/student/bank-details", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/bank-details"] });
      toast({
        title: "Bank Details Saved",
        description: "Your payout details have been saved securely. We'll use these for future payments.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save bank details. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveBankDetails.mutate(formData);
  };

  // Update form when bank details are loaded
  if (bankDetails && formData.bankAccountHolderName === "" && bankDetails.bankAccountHolderName) {
    setFormData({
      bankAccountHolderName: bankDetails.bankAccountHolderName,
      bankName: bankDetails.bankName,
      bankBsbCode: bankDetails.bankBsbCode,
      bankAccountNumber: bankDetails.bankAccountNumber,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="bankAccountHolderName">Account Holder Name</Label>
          <Input
            id="bankAccountHolderName"
            placeholder="John Smith"
            value={formData.bankAccountHolderName}
            onChange={(e) => setFormData({ ...formData, bankAccountHolderName: e.target.value })}
            data-testid="input-account-holder"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bankName">Bank Name</Label>
          <Input
            id="bankName"
            placeholder="Commonwealth Bank"
            value={formData.bankName}
            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
            data-testid="input-bank-name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bankBsbCode">BSB Code</Label>
          <Input
            id="bankBsbCode"
            placeholder="123-456"
            value={formData.bankBsbCode}
            onChange={(e) => setFormData({ ...formData, bankBsbCode: e.target.value })}
            data-testid="input-bsb"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bankAccountNumber">Account Number</Label>
          <Input
            id="bankAccountNumber"
            placeholder="12345678"
            value={formData.bankAccountNumber}
            onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
            data-testid="input-account-number"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-lg">
        <Shield className="h-4 w-4 flex-shrink-0" />
        <p>Your bank details are encrypted and stored securely. We'll only use them for payout processing.</p>
      </div>
      <Button type="submit" disabled={saveBankDetails.isPending} data-testid="button-save-bank-details">
        {saveBankDetails.isPending ? "Saving..." : "Save Bank Details"}
      </Button>
    </form>
  );
}

export default function AffiliatePage() {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If logged in, show dashboard. Otherwise, show landing page
  return user ? <AffiliateDashboard /> : <AffiliateLanding />;
}
