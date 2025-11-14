import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Sparkles, Globe, CheckCircle2, XCircle, Edit3 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ExtractedData {
  name: string | null;
  description: string | null;
  overview: string | null;
  country: string | null;
  establishedYear: number | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  providerType: string | null;
  topDisciplines: string[] | null;
  topCourses: string[] | null;
  numberOfCampuses: number | null;
  campusAddresses: Array<{
    address: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  }> | null;
  scholarshipPercentageMin: number | null;
  scholarshipPercentageMax: number | null;
}

interface EditableField {
  approved: boolean;
  edited: boolean;
  value: any;
}

interface AIInstitutionExtractorProps {
  onDataApproved?: (data: any) => void;
}

export function AIInstitutionExtractor({ onDataApproved }: AIInstitutionExtractorProps) {
  const [url, setUrl] = useState("");
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [editableFields, setEditableFields] = useState<Record<string, EditableField>>({});
  const { toast } = useToast();

  const extractMutation = useMutation({
    mutationFn: async (websiteUrl: string) => {
      return await apiRequest("POST", "/api/admin/extract-institution-data", { url: websiteUrl });
    },
    onSuccess: (response: any) => {
      const data = response.data;
      setExtractedData(data);
      
      // Initialize editable fields with extracted data
      const fields: Record<string, EditableField> = {};
      Object.keys(data).forEach((key) => {
        if (data[key] !== null) {
          fields[key] = {
            approved: false,
            edited: false,
            value: data[key],
          };
        }
      });
      setEditableFields(fields);
      
      toast({
        title: "Data extracted successfully",
        description: "Review and approve the extracted information below.",
      });
    },
    onError: (error: any) => {
      let title = "Extraction failed";
      let description = error.message || "Failed to extract data from website. Please check the URL and try again.";
      
      // Handle rate limiting with better messaging
      if (error.rateLimit) {
        const resetDate = new Date(error.rateLimit.resetDate);
        const minutesUntilReset = Math.ceil((resetDate.getTime() - Date.now()) / 60000);
        
        title = "Rate Limit Exceeded";
        description = `${error.message}\n\nYou've used all ${error.rateLimit.limit} requests for this hour. You can try again in ${minutesUntilReset} minute${minutesUntilReset !== 1 ? 's' : ''} (at ${resetDate.toLocaleTimeString()}).`;
      }
      
      toast({
        title,
        description,
        variant: "destructive",
        duration: 8000, // Show rate limit errors longer
      });
    },
  });

  const handleExtract = () => {
    if (!url) {
      toast({
        title: "URL required",
        description: "Please enter a website URL to extract data from.",
        variant: "destructive",
      });
      return;
    }
    extractMutation.mutate(url);
  };

  const handleFieldApprove = (fieldName: string) => {
    setEditableFields((prev) => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], approved: true },
    }));
  };

  const handleFieldReject = (fieldName: string) => {
    setEditableFields((prev) => {
      const newFields = { ...prev };
      delete newFields[fieldName];
      return newFields;
    });
  };

  const handleFieldEdit = (fieldName: string, newValue: any) => {
    setEditableFields((prev) => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], value: newValue, edited: true },
    }));
  };

  const handleApproveAll = () => {
    const newFields = { ...editableFields };
    Object.keys(newFields).forEach((key) => {
      newFields[key].approved = true;
    });
    setEditableFields(newFields);
    
    toast({
      title: "All fields approved",
      description: "You can now submit this data to create an institution.",
    });
  };

  const handleSubmit = () => {
    const approvedData: any = {};
    Object.entries(editableFields).forEach(([key, field]) => {
      if (field.approved) {
        approvedData[key] = field.value;
      }
    });

    if (Object.keys(approvedData).length === 0) {
      toast({
        title: "No data approved",
        description: "Please approve at least one field before submitting.",
        variant: "destructive",
      });
      return;
    }

    onDataApproved?.(approvedData);
    
    // Reset state
    setUrl("");
    setExtractedData(null);
    setEditableFields({});
  };

  const renderField = (label: string, fieldName: string, value: any, type: "text" | "textarea" | "number" | "array" = "text") => {
    if (!editableFields[fieldName]) return null;

    const field = editableFields[fieldName];
    const isApproved = field.approved;
    const isEdited = field.edited;

    return (
      <div className="space-y-2 p-4 bg-muted/30 rounded-lg border border-border" data-testid={`field-${fieldName}`}>
        <div className="flex items-center justify-between">
          <Label className="font-semibold">{label}</Label>
          <div className="flex items-center gap-2">
            {isEdited && <Badge variant="secondary" className="text-xs">Edited</Badge>}
            {isApproved ? (
              <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Approved
              </Badge>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleFieldReject(fieldName)}
                  data-testid={`button-reject-${fieldName}`}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleFieldApprove(fieldName)}
                  data-testid={`button-approve-${fieldName}`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        
        {type === "textarea" ? (
          <Textarea
            value={field.value || ""}
            onChange={(e) => handleFieldEdit(fieldName, e.target.value)}
            disabled={isApproved}
            className="min-h-[100px]"
            data-testid={`input-${fieldName}`}
          />
        ) : type === "array" ? (
          <Textarea
            value={Array.isArray(field.value) ? field.value.join(", ") : ""}
            onChange={(e) => handleFieldEdit(fieldName, e.target.value.split(",").map((v: string) => v.trim()).filter(Boolean))}
            disabled={isApproved}
            placeholder="Comma-separated values"
            data-testid={`input-${fieldName}`}
          />
        ) : (
          <Input
            type={type}
            value={field.value || ""}
            onChange={(e) => handleFieldEdit(fieldName, type === "number" ? parseInt(e.target.value) : e.target.value)}
            disabled={isApproved}
            data-testid={`input-${fieldName}`}
          />
        )}
      </div>
    );
  };

  const approvedCount = Object.values(editableFields).filter((f) => f.approved).length;
  const totalFields = Object.keys(editableFields).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>AI Institution Data Extractor</CardTitle>
        </div>
        <CardDescription>
          Enter an institution's website URL and let AI automatically extract profile information for your review.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* URL Input */}
        <div className="space-y-2">
          <Label htmlFor="website-url">Institution Website URL</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="website-url"
                placeholder="https://university.edu.au"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={extractMutation.isPending}
                className="pl-10"
                data-testid="input-website-url"
              />
            </div>
            <Button
              onClick={handleExtract}
              disabled={extractMutation.isPending || !url}
              data-testid="button-extract"
            >
              {extractMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Extract Data
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Extracted Data Review */}
        {extractedData && Object.keys(editableFields).length > 0 && (
          <>
            <Separator />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Review Extracted Data</h3>
                  <p className="text-sm text-muted-foreground">
                    {approvedCount} of {totalFields} fields approved
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleApproveAll}
                  disabled={approvedCount === totalFields}
                  data-testid="button-approve-all"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve All
                </Button>
              </div>

              {/* Basic Information */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">Basic Information</h4>
                {renderField("Institution Name", "name", extractedData.name)}
                {renderField("Provider Type", "providerType", extractedData.providerType)}
                {renderField("Country", "country", extractedData.country)}
                {renderField("Website", "website", extractedData.website)}
                {renderField("Established Year", "establishedYear", extractedData.establishedYear, "number")}
              </div>

              {/* Contact Information */}
              {(editableFields.contactEmail || editableFields.contactPhone) && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground">Contact Information</h4>
                  {renderField("Contact Email", "contactEmail", extractedData.contactEmail)}
                  {renderField("Contact Phone", "contactPhone", extractedData.contactPhone)}
                </div>
              )}

              {/* Descriptions */}
              {(editableFields.overview || editableFields.description) && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground">Descriptions</h4>
                  {renderField("Overview", "overview", extractedData.overview, "textarea")}
                  {renderField("Full Description", "description", extractedData.description, "textarea")}
                </div>
              )}

              {/* Academic Information */}
              {(editableFields.topDisciplines || editableFields.topCourses) && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground">Academic Information</h4>
                  {renderField("Top Disciplines", "topDisciplines", extractedData.topDisciplines, "array")}
                  {renderField("Top Courses", "topCourses", extractedData.topCourses, "array")}
                </div>
              )}

              {/* Campus & Scholarships */}
              {(editableFields.numberOfCampuses || editableFields.scholarshipPercentageMin || editableFields.scholarshipPercentageMax) && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground">Campus & Scholarships</h4>
                  {renderField("Number of Campuses", "numberOfCampuses", extractedData.numberOfCampuses, "number")}
                  {renderField("Scholarship Min %", "scholarshipPercentageMin", extractedData.scholarshipPercentageMin, "number")}
                  {renderField("Scholarship Max %", "scholarshipPercentageMax", extractedData.scholarshipPercentageMax, "number")}
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  onClick={handleSubmit}
                  disabled={approvedCount === 0}
                  className="w-full"
                  size="lg"
                  data-testid="button-submit-approved"
                >
                  <Edit3 className="mr-2 h-4 w-4" />
                  Use Approved Data ({approvedCount} fields)
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
