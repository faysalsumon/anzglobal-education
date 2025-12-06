import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Users, 
  Search, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Eye,
  Banknote,
  RefreshCw,
  Copy,
} from "lucide-react";
import { format } from "date-fns";

interface AffiliateStats {
  totalReferrals: number;
  pendingReferrals: number;
  completedReferrals: number;
  totalBonus: number;
}

interface Affiliate {
  id: string;
  userId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  referralCode: string;
  bankAccountHolderName: string | null;
  bankName: string | null;
  bankBsbCode: string | null;
  bankAccountNumber: string | null;
  createdAt: string | null;
  stats: AffiliateStats;
}

interface ReferredStudent {
  id: string;
  firstName: string | null;
  lastName: string | null;
}

interface Referral {
  id: string;
  referrerId: string;
  referredId: string;
  referralCode: string;
  status: string;
  bonusAmount: string | null;
  bonusCurrency: string | null;
  bonusPaidAt: string | null;
  createdAt: string | null;
  referredStudent: ReferredStudent;
}

interface AffiliateDetails extends Affiliate {
  referrals: Referral[];
}

export function AdminAffiliatesPanel() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAffiliateId, setSelectedAffiliateId] = useState<string | null>(null);
  const [selectedReferrals, setSelectedReferrals] = useState<string[]>([]);
  const [paymentAmount, setPaymentAmount] = useState("50.00");
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [payingReferralId, setPayingReferralId] = useState<string | null>(null);

  const { data: affiliates, isLoading: affiliatesLoading } = useQuery<Affiliate[]>({
    queryKey: ["/api/admin/affiliates"],
  });

  const { data: affiliateDetails, isLoading: detailsLoading } = useQuery<AffiliateDetails>({
    queryKey: ["/api/admin/affiliates", selectedAffiliateId],
    enabled: !!selectedAffiliateId,
  });

  const markPaidMutation = useMutation({
    mutationFn: async ({ referralId, bonusAmount }: { referralId: string; bonusAmount: string }) => {
      return apiRequest("PATCH", `/api/admin/affiliates/referrals/${referralId}/pay`, { bonusAmount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliates"] });
      if (selectedAffiliateId) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliates", selectedAffiliateId] });
      }
      toast({
        title: "Payment Marked",
        description: "Referral bonus has been marked as paid.",
      });
      setIsPayDialogOpen(false);
      setPayingReferralId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const batchPayMutation = useMutation({
    mutationFn: async ({ referralIds, bonusAmount }: { referralIds: string[]; bonusAmount: string }) => {
      return apiRequest("POST", "/api/admin/affiliates/referrals/batch-pay", { referralIds, bonusAmount });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliates"] });
      if (selectedAffiliateId) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliates", selectedAffiliateId] });
      }
      toast({
        title: "Batch Payment Complete",
        description: `${variables.referralIds.length} referrals marked as paid.`,
      });
      setSelectedReferrals([]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process batch payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredAffiliates = affiliates?.filter((affiliate) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      affiliate.email?.toLowerCase().includes(searchLower) ||
      affiliate.firstName?.toLowerCase().includes(searchLower) ||
      affiliate.lastName?.toLowerCase().includes(searchLower) ||
      affiliate.referralCode.toLowerCase().includes(searchLower)
    );
  }) ?? [];

  const pendingReferrals = affiliateDetails?.referrals.filter(r => r.status === "pending") ?? [];

  const handleSelectAllPending = (checked: boolean) => {
    if (checked) {
      setSelectedReferrals(pendingReferrals.map(r => r.id));
    } else {
      setSelectedReferrals([]);
    }
  };

  const handleSelectReferral = (referralId: string, checked: boolean) => {
    if (checked) {
      setSelectedReferrals([...selectedReferrals, referralId]);
    } else {
      setSelectedReferrals(selectedReferrals.filter(id => id !== referralId));
    }
  };

  const handlePaySingle = (referralId: string) => {
    setPayingReferralId(referralId);
    setIsPayDialogOpen(true);
  };

  const handleConfirmPayment = () => {
    if (payingReferralId) {
      markPaidMutation.mutate({ referralId: payingReferralId, bonusAmount: paymentAmount });
    }
  };

  const handleBatchPay = () => {
    if (selectedReferrals.length > 0) {
      batchPayMutation.mutate({ referralIds: selectedReferrals, bonusAmount: paymentAmount });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Referral code copied to clipboard.",
    });
  };

  const formatCurrency = (amount: string | null) => {
    if (!amount) return "$0.00";
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  if (affiliatesLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const totalAffiliates = affiliates?.length ?? 0;
  const totalPending = affiliates?.reduce((sum, a) => sum + (a.stats?.pendingReferrals || 0), 0) ?? 0;
  const totalEarnings = affiliates?.reduce((sum, a) => sum + (a.stats?.totalBonus || 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total Affiliates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-affiliates">{totalAffiliates}</div>
            <p className="text-xs text-muted-foreground">Active referral partners</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-payouts">{totalPending}</div>
            <p className="text-xs text-muted-foreground">Referrals awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total Paid Out</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-paid">
              ${totalEarnings.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Lifetime commission payments</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Affiliates</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search affiliates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-affiliates"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Affiliate</TableHead>
                    <TableHead>Referral Code</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Pending</TableHead>
                    <TableHead className="text-right">Earnings</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAffiliates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No affiliates found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAffiliates.map((affiliate) => (
                      <TableRow 
                        key={affiliate.id}
                        className={selectedAffiliateId === affiliate.id ? "bg-muted" : ""}
                        data-testid={`row-affiliate-${affiliate.id}`}
                      >
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {affiliate.firstName} {affiliate.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {affiliate.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-sm bg-muted px-2 py-1 rounded">
                              {affiliate.referralCode}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(affiliate.referralCode)}
                              data-testid={`button-copy-code-${affiliate.id}`}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{affiliate.stats?.totalReferrals || 0}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {(affiliate.stats?.pendingReferrals || 0) > 0 ? (
                            <Badge variant="default" className="bg-orange-500">
                              {affiliate.stats?.pendingReferrals}
                            </Badge>
                          ) : (
                            <Badge variant="outline">0</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${(affiliate.stats?.totalBonus || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedAffiliateId(affiliate.id)}
                            data-testid={`button-view-affiliate-${affiliate.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {selectedAffiliateId && (
          <Card className="lg:w-[480px]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Affiliate Details</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedAffiliateId(null);
                    setSelectedReferrals([]);
                  }}
                  data-testid="button-close-details"
                >
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {detailsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-40" />
                </div>
              ) : affiliateDetails ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h4 className="font-medium">Contact</h4>
                    <div className="text-sm text-muted-foreground">
                      <p>{affiliateDetails.firstName} {affiliateDetails.lastName}</p>
                      <p>{affiliateDetails.email}</p>
                    </div>
                  </div>

                  {(affiliateDetails.bankAccountHolderName || affiliateDetails.bankName) && (
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <Banknote className="h-4 w-4" />
                        Bank Details
                      </h4>
                      <div className="text-sm bg-muted p-3 rounded-md space-y-1">
                        {affiliateDetails.bankAccountHolderName && (
                          <p><span className="text-muted-foreground">Account Holder:</span> {affiliateDetails.bankAccountHolderName}</p>
                        )}
                        {affiliateDetails.bankName && (
                          <p><span className="text-muted-foreground">Bank:</span> {affiliateDetails.bankName}</p>
                        )}
                        {affiliateDetails.bankBsbCode && (
                          <p><span className="text-muted-foreground">BSB:</span> {affiliateDetails.bankBsbCode}</p>
                        )}
                        {affiliateDetails.bankAccountNumber && (
                          <p><span className="text-muted-foreground">Account:</span> ****{affiliateDetails.bankAccountNumber.slice(-4)}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Referrals</h4>
                      {pendingReferrals.length > 0 && selectedReferrals.length > 0 && (
                        <Button
                          size="sm"
                          onClick={handleBatchPay}
                          disabled={batchPayMutation.isPending}
                          data-testid="button-batch-pay"
                        >
                          {batchPayMutation.isPending ? (
                            <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <DollarSign className="h-4 w-4 mr-1" />
                          )}
                          Pay Selected ({selectedReferrals.length})
                        </Button>
                      )}
                    </div>

                    {pendingReferrals.length > 0 && (
                      <div className="flex items-center gap-2 mb-2">
                        <Checkbox
                          checked={selectedReferrals.length === pendingReferrals.length && pendingReferrals.length > 0}
                          onCheckedChange={handleSelectAllPending}
                          data-testid="checkbox-select-all-pending"
                        />
                        <span className="text-sm text-muted-foreground">Select all pending</span>
                      </div>
                    )}

                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                      {affiliateDetails.referrals.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No referrals yet
                        </p>
                      ) : (
                        affiliateDetails.referrals.map((referral) => (
                          <div
                            key={referral.id}
                            className="flex items-center gap-3 p-3 border rounded-md"
                            data-testid={`referral-item-${referral.id}`}
                          >
                            {referral.status === "pending" && (
                              <Checkbox
                                checked={selectedReferrals.includes(referral.id)}
                                onCheckedChange={(checked) => handleSelectReferral(referral.id, !!checked)}
                                data-testid={`checkbox-referral-${referral.id}`}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {referral.referredStudent 
                                  ? `${referral.referredStudent.firstName || ''} ${referral.referredStudent.lastName || ''}`.trim() || 'Unknown'
                                  : 'Unknown'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {referral.createdAt && format(new Date(referral.createdAt), "MMM d, yyyy")}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {referral.status === "completed" ? (
                                <Badge variant="default" className="bg-green-500">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Paid {formatCurrency(referral.bonusAmount)}
                                </Badge>
                              ) : (
                                <>
                                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Pending
                                  </Badge>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePaySingle(referral.id)}
                                    data-testid={`button-pay-referral-${referral.id}`}
                                  >
                                    <DollarSign className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Paid</span>
                      <span className="font-medium">${(affiliateDetails.stats?.totalBonus || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-muted-foreground">Pending Referrals</span>
                      <span className="font-medium">{affiliateDetails.stats?.pendingReferrals || 0}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Unable to load affiliate details
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
            <DialogDescription>
              Mark this referral bonus as paid. Make sure you have transferred the funds to the affiliate's bank account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Amount</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="pl-10"
                  step="0.01"
                  min="0"
                  data-testid="input-payment-amount"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPayDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPayment}
              disabled={markPaidMutation.isPending}
              data-testid="button-confirm-payment"
            >
              {markPaidMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
