/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { Switch } from "@/components/ui/switch";

interface ExtractedData {
  // Basic Information
  name: string | null;
  description: string | null;
  overview: string | null;
  smallDescription: string | null;
  fullDescription: string | null;
  location: string | null;
  country: string | null;
  establishedYear: number | null;
  logo: string | null;
  website: string | null;
  providerType: string | null;
  
  // Contact Information
  contactEmail: string | null;
  contactPhone: string | null;
  
  // Academic Information
  topDisciplines: string[] | null;
  topCourses: string[] | null;
  
  // Campus Information
  numberOfCampuses: number | null;
  campusAddresses: Array<{
    address: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  }> | null;
  
  // Financial Information
  scholarshipPercentageMin: number | null;
  scholarshipPercentageMax: number | null;
  tuitionFeesMin: number | null;
  tuitionFeesMax: number | null;
  tuitionCurrency: string | null;
  
  // Delivery & Intake
  deliveryModes: string[] | null;
  intakePeriods: string[] | null;
  
  // Additional Information
  accreditationStatus: string | null;
  rankingBand: string | null;
  facilities: string[] | null;
  internationalStudentSupport: boolean | null;
  tags: string[] | null;
  institutionGallery: string[] | null;
}

interface EditableField {
  approved: boolean;
  edited: boolean;
  value: any;
  rejected?: boolean; // Track rejected state instead of deleting
  wasApprovedBeforeReject?: boolean; // Store approval state before rejection
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
      const response = await apiRequest("POST", "/api/admin/extract-institution-data", { url: websiteUrl });
      return await response.json();
    },
    onSuccess: (response: any) => {
      // Response is now parsed JSON: { success: true, data: extractedData }
      if (!response.success || !response.data) {
        throw new Error("Invalid response from server");
      }
      
      const data = response.data;
      setExtractedData(data);
      
      // Initialize editable fields with extracted data
      // Include ALL fields, even those with null values, so reviewers can view and edit them
      const fields: Record<string, EditableField> = {};
      Object.keys(data).forEach((key) => {
        fields[key] = {
          approved: false,
          edited: false,
          value: data[key],
        };
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
    setEditableFields((prev) => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        wasApprovedBeforeReject: prev[fieldName].approved,
        rejected: true,
        approved: false
      },
    }));
  };
  
  const handleFieldUnreject = (fieldName: string) => {
    setEditableFields((prev) => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        rejected: false,
        // Restore previous approval state
        approved: prev[fieldName].wasApprovedBeforeReject || false,
      },
    }));
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
    const validationErrors: string[] = [];

    Object.entries(editableFields).forEach(([key, field]) => {
      if (field.approved && !field.rejected) {
        let value = field.value;

        // Normalize string values - trim whitespace
        if (typeof value === "string") {
          value = value.trim();
          // Convert empty strings to null
          if (value === "") {
            value = null;
          }
        }

        // Normalize array values - remove empty items and trim
        if (Array.isArray(value)) {
          value = value
            .map((item: any) => typeof item === "string" ? item.trim() : item)
            .filter((item: any) => item !== "" && item !== null && item !== undefined);
          
          // Convert empty arrays to null
          if (value.length === 0) {
            value = null;
          }
        }

        // Validate and normalize gallery URLs
        if (key === "institutionGallery" && Array.isArray(value)) {
          const validUrls = value.filter((url: string) => {
            try {
              new URL(url);
              return true;
            } catch {
              validationErrors.push(`Invalid gallery URL: ${url}`);
              return false;
            }
          });
          value = validUrls.length > 0 ? validUrls : null;
        }

        // Validate numeric fields - handle null, NaN, and empty strings
        const numericFields = ["tuitionFeesMin", "tuitionFeesMax", "establishedYear", "numberOfCampuses", "scholarshipPercentageMin", "scholarshipPercentageMax"];
        if (numericFields.includes(key) || key.includes("Min") || key.includes("Max")) {
          // Skip null values (optional fields)
          if (value !== null && value !== undefined) {
            // Convert to number if it's a string (already trimmed above)
            const numValue = typeof value === "string" ? Number(value) : value;
            
            if (isNaN(numValue)) {
              validationErrors.push(`${key} has an invalid numeric value`);
              return;
            }
            if (numValue < 0) {
              validationErrors.push(`${key} cannot be negative`);
              return;
            }
            value = numValue; // Use the normalized number
          }
        }

        // Ensure booleans are actual booleans
        if (key === "internationalStudentSupport") {
          value = value === null || value === undefined ? null : !!value;
        }

        approvedData[key] = value;
      }
    });

    if (validationErrors.length > 0) {
      toast({
        title: "Validation errors",
        description: validationErrors.join(". "),
        variant: "destructive",
      });
      return;
    }

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

  const renderField = (label: string, fieldName: string, value: any, type: "text" | "textarea" | "number" | "array" | "boolean" = "text") => {
    if (!editableFields[fieldName]) return null;

    const field = editableFields[fieldName];
    const isApproved = field.approved;
    const isRejected = field.rejected;
    const isEdited = field.edited;

    // Always render fields, even if rejected, so reviewers can recover them

    return (
      <div className={`space-y-2 p-4 rounded-lg border ${isRejected ? 'bg-destructive/10 border-destructive/30' : 'bg-muted/30 border-border'}`} data-testid={`field-${fieldName}`}>
        <div className="flex items-center justify-between">
          <Label className="font-semibold">{label}</Label>
          <div className="flex items-center gap-2">
            {isEdited && <Badge variant="secondary" className="text-xs">Edited</Badge>}
            {isRejected && (
              <Badge variant="destructive" className="text-xs">
                Rejected
              </Badge>
            )}
            {isApproved ? (
              <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Approved
              </Badge>
            ) : isRejected ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleFieldUnreject(fieldName)}
                data-testid={`button-unreject-${fieldName}`}
              >
                Undo Reject
              </Button>
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
        
        {type === "boolean" ? (
          <div className="flex items-center space-x-2">
            <Switch
              checked={!!field.value}
              onCheckedChange={(checked) => handleFieldEdit(fieldName, checked)}
              disabled={isApproved || isRejected}
              data-testid={`input-${fieldName}`}
            />
            <span className="text-sm text-muted-foreground">
              {field.value === null || field.value === undefined ? "Unknown" : field.value ? "Yes" : "No"}
            </span>
          </div>
        ) : type === "textarea" ? (
          <Textarea
            value={field.value === null || field.value === undefined ? "" : field.value}
            onChange={(e) => handleFieldEdit(fieldName, e.target.value)}
            disabled={isApproved || isRejected}
            className="min-h-[100px]"
            data-testid={`input-${fieldName}`}
          />
        ) : type === "array" ? (
          <Textarea
            value={Array.isArray(field.value) ? field.value.join(", ") : ""}
            onChange={(e) => handleFieldEdit(fieldName, e.target.value.split(",").map((v: string) => v.trim()).filter(Boolean))}
            disabled={isApproved || isRejected}
            placeholder="Comma-separated values"
            data-testid={`input-${fieldName}`}
          />
        ) : (
          <Input
            type={type}
            value={field.value === null || field.value === undefined ? "" : field.value}
            onChange={(e) => {
              if (type === "number") {
                // Normalize numeric inputs: empty string becomes null, otherwise parse
                const rawValue = e.target.value.trim();
                handleFieldEdit(fieldName, rawValue === "" ? null : Number(rawValue));
              } else {
                handleFieldEdit(fieldName, e.target.value);
              }
            }}
            disabled={isApproved || isRejected}
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
                {renderField("Location", "location", extractedData.location)}
                {renderField("Country", "country", extractedData.country)}
                {renderField("Website", "website", extractedData.website)}
                {renderField("Logo URL", "logo", extractedData.logo)}
                {renderField("Established Year", "establishedYear", extractedData.establishedYear, "number")}
              </div>

              {/* Contact Information */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">Contact Information</h4>
                {renderField("Contact Email", "contactEmail", extractedData?.contactEmail)}
                {renderField("Contact Phone", "contactPhone", extractedData?.contactPhone)}
              </div>

              {/* Descriptions */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">Descriptions</h4>
                {renderField("Overview", "overview", extractedData?.overview, "textarea")}
                {renderField("Small Description", "smallDescription", extractedData?.smallDescription, "textarea")}
                {renderField("Full Description", "fullDescription", extractedData?.fullDescription, "textarea")}
                {renderField("Description", "description", extractedData?.description, "textarea")}
              </div>

              {/* Academic Information */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">Academic Information</h4>
                {renderField("Top Disciplines", "topDisciplines", extractedData?.topDisciplines, "array")}
                {renderField("Top Courses", "topCourses", extractedData?.topCourses, "array")}
              </div>

              {/* Financial Information */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">Financial Information</h4>
                {renderField("Scholarship Min %", "scholarshipPercentageMin", extractedData?.scholarshipPercentageMin, "number")}
                {renderField("Scholarship Max %", "scholarshipPercentageMax", extractedData?.scholarshipPercentageMax, "number")}
                {renderField("Tuition Fees Min", "tuitionFeesMin", extractedData?.tuitionFeesMin, "number")}
                {renderField("Tuition Fees Max", "tuitionFeesMax", extractedData?.tuitionFeesMax, "number")}
                {renderField("Tuition Currency", "tuitionCurrency", extractedData?.tuitionCurrency)}
              </div>

              {/* Campus Information */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">Campus Information</h4>
                {renderField("Number of Campuses", "numberOfCampuses", extractedData?.numberOfCampuses, "number")}
              </div>

              {/* Delivery & Intake */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">Delivery & Intake</h4>
                {renderField("Delivery Modes", "deliveryModes", extractedData?.deliveryModes, "array")}
                {renderField("Intake Periods", "intakePeriods", extractedData?.intakePeriods, "array")}
              </div>

              {/* Additional Information */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">Additional Information</h4>
                {renderField("Accreditation Status", "accreditationStatus", extractedData?.accreditationStatus)}
                {renderField("Ranking Band", "rankingBand", extractedData?.rankingBand)}
                {renderField("Facilities", "facilities", extractedData?.facilities, "array")}
                {renderField("International Student Support", "internationalStudentSupport", extractedData?.internationalStudentSupport, "boolean")}
                {renderField("Tags", "tags", extractedData?.tags, "array")}
              </div>

              {/* Gallery Images */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">Gallery Images</h4>
                {renderField("Institution Gallery URLs", "institutionGallery", extractedData?.institutionGallery, "array")}
              </div>

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
