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
  title: string | null;
  description: string | null;
  subject: string | null;
  level: string | null;
  duration: string | null;
  durationMonths: number | null;
  fees: number | null;
  currency: string | null;
  location: string | null;
  country: string | null;
  startDate: string | null;
  applicationDeadline: string | null;
  prerequisites: string | null;
  courseCode: string | null;
  prPathway: boolean | null;
  scholarshipPercentageMin: number | null;
  scholarshipPercentageMax: number | null;
  eligibilityRequirements: string | null;
  englishRequirements: string | null;
  academicRequirements: string | null;
  intakes: string[] | null;
  studyAreas: string[] | null;
  careerOutcomes: string[] | null;
  careerPath: string | null;
  deliveryMode: string | null;
  campusLocations: string[] | null;
  workRights: boolean | null;
  internshipAvailable: boolean | null;
  internshipDetails: string | null;
  minimumAge: number | null;
}

interface EditableField {
  approved: boolean;
  edited: boolean;
  value: any;
}

interface AICourseExtractorProps {
  onDataApproved?: (data: any) => void;
}

export function AICourseExtractor({ onDataApproved }: AICourseExtractorProps) {
  const [url, setUrl] = useState("");
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [editableFields, setEditableFields] = useState<Record<string, EditableField>>({});
  const { toast } = useToast();

  const extractMutation = useMutation({
    mutationFn: async (websiteUrl: string) => {
      const response = await apiRequest("POST", "/api/admin/extract-course-data", { url: websiteUrl });
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
        description: "Review and approve the extracted course information below.",
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
        description: "Please enter a course website URL to extract data from.",
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
      description: "You can now submit this data to update the course.",
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

  const renderField = (label: string, fieldName: string, value: any, type: "text" | "textarea" | "number" | "array" | "boolean" = "text") => {
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
        
        {type === "boolean" ? (
          <div className="flex items-center gap-2">
            <Switch
              checked={field.value || false}
              onCheckedChange={(checked) => handleFieldEdit(fieldName, checked)}
              disabled={isApproved}
              data-testid={`input-${fieldName}`}
            />
            <span className="text-sm text-muted-foreground">{field.value ? "Yes" : "No"}</span>
          </div>
        ) : type === "textarea" ? (
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
          <CardTitle>AI Course Data Extractor</CardTitle>
        </div>
        <CardDescription>
          Enter a course's website URL and let AI automatically extract detailed information for your review.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* URL Input */}
        <div className="space-y-2">
          <Label htmlFor="website-url">Course Website URL</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="website-url"
                placeholder="https://university.edu.au/courses/computer-science"
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
                {renderField("Course Title", "title", extractedData.title)}
                {renderField("Subject Area", "subject", extractedData.subject)}
                {renderField("Level", "level", extractedData.level)}
                {renderField("Course Code", "courseCode", extractedData.courseCode)}
              </div>

              {/* Description */}
              {editableFields.description && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground">Description</h4>
                  {renderField("Course Description", "description", extractedData.description, "textarea")}
                </div>
              )}

              {/* Duration & Fees */}
              {(editableFields.duration || editableFields.fees) && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground">Duration & Fees</h4>
                  {renderField("Duration", "duration", extractedData.duration)}
                  {renderField("Duration (Months)", "durationMonths", extractedData.durationMonths, "number")}
                  {renderField("Annual Tuition", "fees", extractedData.fees, "number")}
                  {renderField("Currency", "currency", extractedData.currency)}
                </div>
              )}

              {/* Location & Dates */}
              {(editableFields.location || editableFields.startDate) && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground">Location & Dates</h4>
                  {renderField("Location", "location", extractedData.location)}
                  {renderField("Country", "country", extractedData.country)}
                  {renderField("Start Date", "startDate", extractedData.startDate)}
                  {renderField("Application Deadline", "applicationDeadline", extractedData.applicationDeadline)}
                  {renderField("Intakes", "intakes", extractedData.intakes, "array")}
                  {renderField("Campus Locations", "campusLocations", extractedData.campusLocations, "array")}
                </div>
              )}

              {/* Requirements */}
              {(editableFields.prerequisites || editableFields.eligibilityRequirements) && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground">Requirements</h4>
                  {renderField("Prerequisites", "prerequisites", extractedData.prerequisites, "textarea")}
                  {renderField("Eligibility Requirements", "eligibilityRequirements", extractedData.eligibilityRequirements, "textarea")}
                  {renderField("English Requirements", "englishRequirements", extractedData.englishRequirements, "textarea")}
                  {renderField("Academic Requirements", "academicRequirements", extractedData.academicRequirements, "textarea")}
                  {renderField("Minimum Age", "minimumAge", extractedData.minimumAge, "number")}
                </div>
              )}

              {/* Academic Content */}
              {(editableFields.studyAreas || editableFields.careerOutcomes) && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground">Academic Content & Career</h4>
                  {renderField("Study Areas", "studyAreas", extractedData.studyAreas, "array")}
                  {renderField("Career Outcomes", "careerOutcomes", extractedData.careerOutcomes, "array")}
                  {renderField("Career Path", "careerPath", extractedData.careerPath, "textarea")}
                </div>
              )}

              {/* Scholarships & Pathways */}
              {(editableFields.scholarshipPercentageMin || editableFields.prPathway) && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground">Scholarships & Pathways</h4>
                  {renderField("Scholarship Min %", "scholarshipPercentageMin", extractedData.scholarshipPercentageMin, "number")}
                  {renderField("Scholarship Max %", "scholarshipPercentageMax", extractedData.scholarshipPercentageMax, "number")}
                  {renderField("PR Pathway", "prPathway", extractedData.prPathway, "boolean")}
                </div>
              )}

              {/* Delivery & Work */}
              {(editableFields.deliveryMode || editableFields.workRights) && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground">Delivery & Work</h4>
                  {renderField("Delivery Mode", "deliveryMode", extractedData.deliveryMode)}
                  {renderField("Work Rights", "workRights", extractedData.workRights, "boolean")}
                  {renderField("Internship Available", "internshipAvailable", extractedData.internshipAvailable, "boolean")}
                  {renderField("Internship Details", "internshipDetails", extractedData.internshipDetails, "textarea")}
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
