import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  User, 
  FileText, 
  GraduationCap, 
  Languages, 
  Briefcase, 
  Wallet, 
  Heart, 
  Globe, 
  Calendar, 
  Phone, 
  Mail,
  MapPin,
  Target,
  Clock,
  Building2,
  Award
} from "lucide-react";
import { format } from "date-fns";

interface StudentProfileData {
  profile: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    preferredName: string | null;
    gender: string | null;
    maritalStatus: string | null;
    phone: string | null;
    whatsapp: string | null;
    dateOfBirth: string | null;
    nationality: string | null;
    profileImageUrl: string | null;
    unitNo: string | null;
    street: string | null;
    suburb: string | null;
    city: string | null;
    state: string | null;
    postcode: string | null;
    country: string | null;
    bio: string | null;
    educationLevel: string | null;
    fieldOfStudy: string | null;
    careerGoals: string | null;
    currentCountry: string | null;
    isInAustralia: boolean | null;
    australianVisaType: string | null;
    visaExpiryDate: string | null;
    visaConditions: string | null;
    passportNumber: string | null;
    passportCountry: string | null;
    passportIssuedDate: string | null;
    passportExpiryDate: string | null;
    passportIssuingAuthority: string | null;
    destinationCountry: string | null;
    preferredDiscipline: string | null;
    preferredCourseLevel: string | null;
    preferredStudyMode: string | null;
    preferredIntakes: string[] | null;
    budgetMin: string | null;
    budgetMax: string | null;
    budgetCurrency: string | null;
    prPathwayInterest: boolean | null;
    hasWorkExperience: boolean | null;
    workExperienceYears: number | null;
    workExperienceIndustry: string | null;
    profileCompletionPercentage: number | null;
    fundingSource: string | null;
    sponsorName: string | null;
    sponsorRelationship: string | null;
    sponsorContact: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    statementOfPurpose: string | null;
  };
  education: Array<{
    id: string;
    institutionName: string | null;
    qualification: string | null;
    fieldOfStudy: string | null;
    startDate: string | null;
    endDate: string | null;
    grade: string | null;
    country: string | null;
    isCurrentlyStudying: boolean | null;
  }>;
  languageScores: Array<{
    id: string;
    testType: string | null;
    overallScore: string | null;
    listeningScore: string | null;
    readingScore: string | null;
    writingScore: string | null;
    speakingScore: string | null;
    testDate: string | null;
    expiryDate: string | null;
  }>;
  employment: Array<{
    id: string;
    companyName: string | null;
    jobTitle: string | null;
    industry: string | null;
    startDate: string | null;
    endDate: string | null;
    isCurrentJob: boolean | null;
    responsibilities: string | null;
    country: string | null;
  }>;
  documentsSummary: {
    total: number;
    byType: Record<string, number>;
  };
}

interface StudentProfileViewerProps {
  profileId: string;
  studentName?: string;
}

function DataRow({ label, value, icon: Icon }: { label: string; value: string | number | null | undefined; icon?: React.ElementType }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-muted/50 last:border-0" data-testid={`row-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-words">{String(value)}</p>
      </div>
    </div>
  );
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr), "MMM d, yyyy");
  } catch {
    return dateStr;
  }
}

export function StudentProfileViewer({ profileId, studentName }: StudentProfileViewerProps) {
  const { data, isLoading, error } = useQuery<StudentProfileData>({
    queryKey: [`/api/admin/student-profiles/${profileId}`],
    enabled: !!profileId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load student profile data
        </CardContent>
      </Card>
    );
  }

  const { profile, education, languageScores, employment, documentsSummary } = data;

  const formatAddress = () => {
    const parts = [profile.unitNo, profile.street, profile.suburb, profile.city, profile.state, profile.postcode, profile.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  return (
    <div className="space-y-4" data-testid="student-profile-viewer">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <User className="h-5 w-5" />
          {studentName || `${profile.firstName} ${profile.lastName}`}'s Profile
        </h3>
        {profile.profileCompletionPercentage != null && (
          <Badge variant={profile.profileCompletionPercentage >= 80 ? "default" : "secondary"}>
            {profile.profileCompletionPercentage}% Complete
          </Badge>
        )}
      </div>

      <Accordion type="multiple" defaultValue={["personal", "passport", "education", "english", "preferences", "work", "financial", "sop"]} className="space-y-2">
        {/* Personal Information */}
        <AccordionItem value="personal" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline" data-testid="accordion-personal">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <span>Personal Information</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-2 sm:grid-cols-2 py-2">
              <DataRow label="First Name" value={profile.firstName} icon={User} />
              <DataRow label="Last Name" value={profile.lastName} />
              <DataRow label="Preferred Name" value={profile.preferredName} />
              <DataRow label="Gender" value={profile.gender} />
              <DataRow label="Marital Status" value={profile.maritalStatus} />
              <DataRow label="Date of Birth" value={formatDate(profile.dateOfBirth)} icon={Calendar} />
              <DataRow label="Nationality" value={profile.nationality} icon={Globe} />
              <DataRow label="Phone" value={profile.phone} icon={Phone} />
              <DataRow label="WhatsApp" value={profile.whatsapp} icon={Phone} />
              <DataRow label="Address" value={formatAddress()} icon={MapPin} />
              <DataRow label="Current Country" value={profile.currentCountry || profile.country} icon={Globe} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Passport & Visa */}
        <AccordionItem value="passport" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline" data-testid="accordion-passport">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span>Passport & Visa Details</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-2 sm:grid-cols-2 py-2">
              <DataRow label="Passport Number" value={profile.passportNumber ? `***${profile.passportNumber.slice(-4)}` : null} icon={FileText} />
              <DataRow label="Passport Country" value={profile.passportCountry} icon={Globe} />
              <DataRow label="Issued Date" value={formatDate(profile.passportIssuedDate)} icon={Calendar} />
              <DataRow label="Expiry Date" value={formatDate(profile.passportExpiryDate)} icon={Calendar} />
              <DataRow label="Issuing Authority" value={profile.passportIssuingAuthority} icon={Building2} />
              <DataRow label="In Australia" value={profile.isInAustralia ? "Yes" : "No"} icon={MapPin} />
              {profile.isInAustralia && (
                <>
                  <DataRow label="Visa Type" value={profile.australianVisaType} icon={FileText} />
                  <DataRow label="Visa Expiry" value={formatDate(profile.visaExpiryDate)} icon={Calendar} />
                  <DataRow label="Visa Conditions" value={profile.visaConditions} />
                </>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Education History */}
        <AccordionItem value="education" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline" data-testid="accordion-education">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              <span>Education History</span>
              <Badge variant="outline" className="ml-2">{education.length}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            {education.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No education records</p>
            ) : (
              <div className="space-y-4 py-2">
                {education.map((edu, idx) => (
                  <Card key={edu.id} className="bg-muted/30" data-testid={`education-${idx}`}>
                    <CardContent className="py-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium">{edu.qualification}</p>
                          <p className="text-sm text-muted-foreground">{edu.institutionName}</p>
                        </div>
                        {edu.isCurrentlyStudying && <Badge variant="secondary">Current</Badge>}
                      </div>
                      <div className="grid gap-1 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <GraduationCap className="h-3 w-3" />
                          {edu.fieldOfStudy}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(edu.startDate)} - {edu.isCurrentlyStudying ? "Present" : formatDate(edu.endDate)}
                        </div>
                        {edu.grade && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Award className="h-3 w-3" />
                            Grade: {edu.grade}
                          </div>
                        )}
                        {edu.country && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Globe className="h-3 w-3" />
                            {edu.country}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* English Proficiency */}
        <AccordionItem value="english" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline" data-testid="accordion-english">
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-primary" />
              <span>English Proficiency</span>
              <Badge variant="outline" className="ml-2">{languageScores.length}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            {languageScores.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No language test scores</p>
            ) : (
              <div className="space-y-4 py-2">
                {languageScores.map((score, idx) => (
                  <Card key={score.id} className="bg-muted/30" data-testid={`language-score-${idx}`}>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between mb-3">
                        <Badge>{score.testType}</Badge>
                        <span className="text-lg font-bold text-primary">{score.overallScore}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Listening</p>
                          <p className="font-medium">{score.listeningScore || "-"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Reading</p>
                          <p className="font-medium">{score.readingScore || "-"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Writing</p>
                          <p className="font-medium">{score.writingScore || "-"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Speaking</p>
                          <p className="font-medium">{score.speakingScore || "-"}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                        <span>Test Date: {formatDate(score.testDate)}</span>
                        <span>Expires: {formatDate(score.expiryDate)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Study Preferences */}
        <AccordionItem value="preferences" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline" data-testid="accordion-preferences">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span>Study Preferences</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-2 sm:grid-cols-2 py-2">
              <DataRow label="Destination Country" value={profile.destinationCountry} icon={Globe} />
              <DataRow label="Preferred Discipline" value={profile.preferredDiscipline} icon={GraduationCap} />
              <DataRow label="Preferred Course Level" value={profile.preferredCourseLevel} icon={Award} />
              <DataRow label="Preferred Study Mode" value={profile.preferredStudyMode} />
              <DataRow label="Preferred Intakes" value={profile.preferredIntakes?.join(", ")} icon={Calendar} />
              <DataRow label="Budget Range" value={profile.budgetMin && profile.budgetMax ? `${profile.budgetCurrency || "AUD"} ${profile.budgetMin} - ${profile.budgetMax}` : null} icon={Wallet} />
              <DataRow label="PR Pathway Interest" value={profile.prPathwayInterest ? "Yes" : "No"} icon={Heart} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Work Experience */}
        <AccordionItem value="work" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline" data-testid="accordion-work">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              <span>Work Experience</span>
              <Badge variant="outline" className="ml-2">{employment.length}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="py-2">
              <div className="grid gap-2 sm:grid-cols-2 mb-4">
                <DataRow label="Has Work Experience" value={profile.hasWorkExperience ? "Yes" : "No"} icon={Briefcase} />
                <DataRow label="Years of Experience" value={profile.workExperienceYears} icon={Clock} />
                <DataRow label="Industry" value={profile.workExperienceIndustry} icon={Building2} />
              </div>
              {employment.length > 0 && (
                <div className="space-y-4">
                  {employment.map((job, idx) => (
                    <Card key={job.id} className="bg-muted/30" data-testid={`employment-${idx}`}>
                      <CardContent className="py-3">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium">{job.jobTitle}</p>
                            <p className="text-sm text-muted-foreground">{job.companyName}</p>
                          </div>
                          {job.isCurrentJob && <Badge variant="secondary">Current</Badge>}
                        </div>
                        <div className="grid gap-1 text-sm text-muted-foreground">
                          {job.industry && (
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3 w-3" />
                              {job.industry}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            {formatDate(job.startDate)} - {job.isCurrentJob ? "Present" : formatDate(job.endDate)}
                          </div>
                          {job.country && (
                            <div className="flex items-center gap-2">
                              <Globe className="h-3 w-3" />
                              {job.country}
                            </div>
                          )}
                        </div>
                        {job.responsibilities && (
                          <p className="text-sm mt-2 text-muted-foreground">{job.responsibilities}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Financial Information */}
        <AccordionItem value="financial" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline" data-testid="accordion-financial">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              <span>Financial / Sponsor Information</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-2 sm:grid-cols-2 py-2">
              <DataRow label="Funding Source" value={profile.fundingSource} icon={Wallet} />
              {profile.fundingSource && profile.fundingSource !== "self" && profile.fundingSource !== "loan" && (
                <>
                  <DataRow label="Sponsor Name" value={profile.sponsorName} icon={User} />
                  <DataRow label="Relationship" value={profile.sponsorRelationship} />
                  <DataRow label="Sponsor Contact" value={profile.sponsorContact} icon={Phone} />
                </>
              )}
              <DataRow label="Emergency Contact" value={profile.emergencyContactName} icon={Heart} />
              <DataRow label="Emergency Phone" value={profile.emergencyContactPhone} icon={Phone} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Statement of Purpose */}
        <AccordionItem value="sop" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline" data-testid="accordion-sop">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span>Statement of Purpose & Bio</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 py-2">
              {profile.statementOfPurpose && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Statement of Purpose</p>
                  <p className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">{profile.statementOfPurpose}</p>
                </div>
              )}
              {profile.bio && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Bio</p>
                  <p className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">{profile.bio}</p>
                </div>
              )}
              {profile.careerGoals && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Career Goals</p>
                  <p className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">{profile.careerGoals}</p>
                </div>
              )}
              {!profile.statementOfPurpose && !profile.bio && !profile.careerGoals && (
                <p className="text-sm text-muted-foreground">No statement of purpose or bio provided</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Documents Summary */}
      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <p className="text-2xl font-bold">{documentsSummary.total}</p>
              <p className="text-xs text-muted-foreground">Total Documents</p>
            </div>
            <div className="flex-1 flex flex-wrap gap-2">
              {Object.entries(documentsSummary.byType).map(([type, count]) => (
                <Badge key={type} variant="outline" className="text-xs">
                  {type}: {count}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
