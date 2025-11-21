import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Sparkles, Globe, CheckCircle2, XCircle, Edit3, Undo2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ExtractedData {
  // Basic Information
  title: string | null;
  description: string | null;
  subject: string | null;
  level: string | null;
  courseCode: string | null;
  
  // Duration & Timing
  duration: string | null;
  durationMonths: number | null;
  durationWeeks: number | null;
  startDate: string | null;
  applicationDeadline: string | null;
  intakes: string[] | null;
  
  // Financial
  fees: number | null;
  currency: string | null;
  applicationFees: number | null;
  costOfLiving: number | null;
  scholarshipPercentageMin: number | null;
  scholarshipPercentageMax: number | null;
  
  // Location
  location: string | null;
  country: string | null;
  campusLocations: string[] | null;
  
  // Requirements
  prerequisites: string | null;
  eligibilityRequirements: string | null;
  englishRequirements: string | null;
  academicRequirements: string | null;
  minimumAge: number | null;
  
  // Academic Content
  studyAreas: string[] | null;
  careerOutcomes: string[] | null;
  careerPath: string | null;
  pathways: string[] | null;
  
  // Delivery & Resources
  deliveryMode: string | null;
  thumbnailUrl: string | null;
  curriculumUrl: string | null;
  images: string[] | null;
  
  // Work & Pathways
  prPathway: boolean | null;
  workRights: boolean | null;
  internshipAvailable: boolean | null;
  internshipDetails: string | null;
}

interface EditableField {
  approved: boolean;
  edited: boolean;
  value: any;
  rejected?: boolean; // Track rejected state instead of deleting
  wasApprovedBeforeReject?: boolean; // Store approval state before rejection
}

interface AICourseExtractorProps {
  onDataApproved?: (data: any) => void;
}

export function AICourseExtractor({ onDataApproved }: AICourseExtractorProps) {
  const [url, setUrl] = useState("");
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("");
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [editableFields, setEditableFields] = useState<Record<string, EditableField>>({});
  const { toast } = useToast();

  // Fetch universities for institution selection
  const { data: universitiesData } = useQuery<{ universities: Array<{ id: string; name: string; country: string }> }>({
    queryKey: ["/api/universities"],
  });

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
        description: "Review and approve the extracted course information below.",
      });
    },
    onError: (error: any) => {
      let title = "Extraction failed";
      let description = error.message || "Failed to extract data from website. Please check the URL and try again.";
      let duration = 8000;
      
      // Handle rate limiting with better messaging
      if (error.rateLimit) {
        const resetDate = new Date(error.rateLimit.resetDate);
        const minutesUntilReset = Math.ceil((resetDate.getTime() - Date.now()) / 60000);
        
        title = "Rate Limit Exceeded";
        description = `${error.message}\n\nYou've used all ${error.rateLimit.limit} requests for this hour. You can try again in ${minutesUntilReset} minute${minutesUntilReset !== 1 ? 's' : ''} (at ${resetDate.toLocaleTimeString()}).`;
      } 
      // Handle website access restrictions (403, bot detection)
      else if (error.message?.toLowerCase().includes('forbidden') || error.message?.toLowerCase().includes('403')) {
        title = "Website Access Restricted";
        description = "The course website is blocking automated access. This is common with university sites. Try:\n• Using a different course URL from the same institution\n• Checking if the URL is accessible in your browser\n• Entering course details manually instead";
        duration = 12000; // Show longer for actionable advice
      }
      // Handle not found errors
      else if (error.message?.toLowerCase().includes('not found') || error.message?.toLowerCase().includes('404')) {
        title = "Course Page Not Found";
        description = "The course URL doesn't exist or has been moved. Please verify the URL is correct and accessible in your browser.";
      }
      // Handle timeout/network errors
      else if (error.message?.toLowerCase().includes('timeout') || error.message?.toLowerCase().includes('network')) {
        title = "Connection Timeout";
        description = "The website took too long to respond. This could be due to a slow connection or server issues. Please try again.";
      }
      
      toast({
        title,
        description,
        variant: "destructive",
        duration,
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
        // Only restore approval if it was actually approved before rejection
        approved: !!prev[fieldName].wasApprovedBeforeReject,
        wasApprovedBeforeReject: undefined // Clear stale state
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
      // Only approve fields that aren't rejected
      if (!newFields[key].rejected) {
        newFields[key].approved = true;
      }
    });
    setEditableFields(newFields);
    
    toast({
      title: "All fields approved",
      description: "You can now submit this data to update the course.",
    });
  };

  const handleSubmit = () => {
    if (!selectedInstitutionId) {
      toast({
        title: "Institution required",
        description: "Please select an institution for this course.",
        variant: "destructive",
      });
      return;
    }

    const approvedData: any = { universityId: selectedInstitutionId };
    Object.entries(editableFields).forEach(([key, field]) => {
      if (field.approved && !field.rejected) {
        let value = field.value;
        
        // Normalize numeric fields - guard against NaN
        if (typeof value === 'number' && isNaN(value)) {
          value = null;
        } else if (typeof value === 'string' && value.trim() === '') {
          value = null;
        }
        
        // Normalize array fields - ensure proper array format
        if (Array.isArray(value)) {
          value = value.filter(Boolean); // Remove empty strings
          if (value.length === 0) {
            value = null;
          }
        }
        
        approvedData[key] = value;
      }
    });

    if (Object.keys(approvedData).length === 1) { // Only universityId
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
    setSelectedInstitutionId("");
    setExtractedData(null);
    setEditableFields({});
  };

  const renderField = (label: string, fieldName: string, value: any, type: "text" | "textarea" | "number" | "array" | "boolean" = "text") => {
    if (!editableFields[fieldName]) return null;

    const field = editableFields[fieldName];
    const isApproved = field.approved;
    const isEdited = field.edited;
    const isRejected = field.rejected;

    return (
      <div 
        className={`space-y-2 p-4 rounded-lg border ${isRejected ? 'bg-muted/50 border-muted opacity-60' : 'bg-muted/30 border-border'}`} 
        data-testid={`field-${fieldName}`}
      >
        <div className="flex items-center justify-between">
          <Label className={`font-semibold ${isRejected ? 'text-muted-foreground line-through' : ''}`}>{label}</Label>
          <div className="flex items-center gap-2">
            {isEdited && <Badge variant="secondary" className="text-xs">Edited</Badge>}
            {isRejected ? (
              <>
                <Badge variant="secondary" className="opacity-60">
                  <XCircle className="h-3 w-3 mr-1" />
                  Rejected
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleFieldUnreject(fieldName)}
                  data-testid={`button-undo-reject-${fieldName}`}
                >
                  <Undo2 className="h-4 w-4 mr-1" />
                  Undo Reject
                </Button>
              </>
            ) : isApproved ? (
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
              checked={field.value === true}
              onCheckedChange={(checked) => handleFieldEdit(fieldName, checked)}
              disabled={isApproved || isRejected}
              data-testid={`input-${fieldName}`}
            />
            <span className="text-sm text-muted-foreground">
              {field.value === null ? "(not set)" : field.value ? "Yes" : "No"}
            </span>
          </div>
        ) : type === "textarea" ? (
          <Textarea
            value={field.value === null ? "" : field.value}
            onChange={(e) => handleFieldEdit(fieldName, e.target.value || null)}
            disabled={isApproved || isRejected}
            className="min-h-[100px]"
            placeholder={field.value === null ? "(null)" : ""}
            data-testid={`input-${fieldName}`}
          />
        ) : type === "array" ? (
          <Textarea
            value={Array.isArray(field.value) && field.value.length > 0 ? field.value.join(", ") : ""}
            onChange={(e) => {
              const trimmed = e.target.value.trim();
              handleFieldEdit(fieldName, trimmed ? trimmed.split(",").map((v: string) => v.trim()).filter(Boolean) : null);
            }}
            disabled={isApproved || isRejected}
            placeholder={field.value === null ? "(null - no items)" : "Comma-separated values"}
            data-testid={`input-${fieldName}`}
          />
        ) : (
          <Input
            type={type}
            value={field.value === null || field.value === undefined ? "" : field.value}
            onChange={(e) => {
              if (type === "number") {
                const val = e.target.value.trim();
                handleFieldEdit(fieldName, val === "" ? null : parseFloat(val));
              } else {
                handleFieldEdit(fieldName, e.target.value.trim() || null);
              }
            }}
            disabled={isApproved || isRejected}
            placeholder={field.value === null ? "(null)" : ""}
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
        {/* Institution Selection */}
        <div className="space-y-2">
          <Label htmlFor="institution-select">Institution (Required)</Label>
          <Select 
            value={selectedInstitutionId} 
            onValueChange={setSelectedInstitutionId}
            disabled={extractMutation.isPending}
          >
            <SelectTrigger 
              id="institution-select" 
              data-testid="select-course-institution"
              className="data-testid"
            >
              <SelectValue placeholder="Select institution for this course" />
            </SelectTrigger>
            <SelectContent>
              {universitiesData?.universities.map((uni) => (
                <SelectItem 
                  key={uni.id} 
                  value={uni.id}
                  data-testid={`select-option-institution-${uni.id}`}
                >
                  {uni.name} ({uni.country})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Select the institution that offers this course. This is required before submission.
          </p>
        </div>

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
                  {renderField("Duration (Weeks)", "durationWeeks", extractedData.durationWeeks, "number")}
                  {renderField("Annual Tuition", "fees", extractedData.fees, "number")}
                  {renderField("Application Fees", "applicationFees", extractedData.applicationFees, "number")}
                  {renderField("Cost of Living", "costOfLiving", extractedData.costOfLiving, "number")}
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
                  {renderField("Pathways", "pathways", extractedData.pathways, "array")}
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

              {/* Media & Resources */}
              {(editableFields.thumbnailUrl || editableFields.curriculumUrl || editableFields.images) && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground">Media & Resources</h4>
                  {renderField("Thumbnail URL", "thumbnailUrl", extractedData.thumbnailUrl)}
                  {renderField("Curriculum URL", "curriculumUrl", extractedData.curriculumUrl)}
                  {renderField("Images", "images", extractedData.images, "array")}
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
