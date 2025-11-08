import type { Course, StudentProfile } from "@shared/schema";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface CourseMatch {
  course: Course;
  matchScore: number;
  matchReasons: string[];
  aiInsight?: string;
}

export interface RecommendationResult {
  courses: CourseMatch[];
  summary: string;
}

export class RecommendationService {
  private normalizeFees(course: Course): number {
    const fees = parseFloat(course.fees?.toString() || "0");
    const costOfLiving = parseFloat(course.costOfLiving?.toString() || "0");
    const applicationFees = parseFloat(course.applicationFees?.toString() || "0");
    
    return fees + costOfLiving + applicationFees;
  }

  private checkBudgetEligibility(course: Course, student: StudentProfile): boolean {
    if (!student.budgetMin || !student.budgetMax) return true;
    
    const totalCost = this.normalizeFees(course);
    const budgetMin = parseFloat(student.budgetMin.toString());
    const budgetMax = parseFloat(student.budgetMax.toString());
    
    return totalCost >= budgetMin && totalCost <= budgetMax;
  }

  private checkSubjectMatch(course: Course, student: StudentProfile): boolean {
    if (!student.preferredSubjects || student.preferredSubjects.length === 0) return true;
    
    return student.preferredSubjects.some(
      subject => subject.toLowerCase() === course.subject.toLowerCase()
    );
  }

  private checkCountryMatch(course: Course, student: StudentProfile): boolean {
    if (!student.preferredCountries || student.preferredCountries.length === 0) return true;
    
    return student.preferredCountries.some(
      country => country.toLowerCase() === course.country?.toLowerCase()
    );
  }

  private checkIntakeMatch(course: Course, student: StudentProfile): boolean {
    if (!student.preferredIntakeMonths || student.preferredIntakeMonths.length === 0) return true;
    if (!course.intakeMonths || course.intakeMonths.length === 0) return true;
    
    return student.preferredIntakeMonths.some(
      month => course.intakeMonths?.some(
        courseMonth => month.toLowerCase() === courseMonth.toLowerCase()
      )
    );
  }

  private calculateMatchScore(course: Course, student: StudentProfile): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    if (this.checkSubjectMatch(course, student)) {
      score += 30;
      reasons.push("Matches your preferred subject area");
    }

    if (this.checkCountryMatch(course, student)) {
      score += 20;
      reasons.push("Located in your preferred country");
    }

    if (this.checkIntakeMatch(course, student)) {
      score += 15;
      reasons.push("Intake timing aligns with your preference");
    }

    if (course.scholarshipPercentage && course.scholarshipPercentage > 0) {
      score += Math.min(course.scholarshipPercentage / 2, 20);
      reasons.push(`${course.scholarshipPercentage}% scholarship available`);
    }

    if (course.prPathway && student.desiredScholarship) {
      score += 15;
      reasons.push("Offers PR pathway");
    }

    if (this.checkBudgetEligibility(course, student)) {
      score += 10;
      reasons.push("Within your budget range");
    }

    return { score, reasons };
  }

  public filterEligibleCourses(courses: Course[], student: StudentProfile): Course[] {
    return courses.filter(course => {
      if (!course.isActive) return false;
      
      const budgetMatch = this.checkBudgetEligibility(course, student);
      
      if (student.budgetMin && student.budgetMax && !budgetMatch) {
        return false;
      }

      return true;
    });
  }

  public async generateRecommendations(
    courses: Course[],
    student: StudentProfile,
    limit: number = 10
  ): Promise<RecommendationResult> {
    const eligibleCourses = this.filterEligibleCourses(courses, student);

    const scoredCourses: CourseMatch[] = eligibleCourses.map(course => {
      const { score, reasons } = this.calculateMatchScore(course, student);
      return {
        course,
        matchScore: score,
        matchReasons: reasons,
      };
    });

    scoredCourses.sort((a, b) => b.matchScore - a.matchScore);
    const topCourses = scoredCourses.slice(0, limit);

    try {
      const aiEnhancedCourses = await this.addAIInsights(topCourses, student);
      const summary = await this.generateSummary(aiEnhancedCourses, student);
      
      return {
        courses: aiEnhancedCourses,
        summary,
      };
    } catch (error) {
      console.error("AI enhancement failed, returning rule-based results:", error);
      return {
        courses: topCourses,
        summary: `Found ${topCourses.length} courses matching your criteria based on subject preferences, budget, location, and scholarship availability.`,
      };
    }
  }

  private async addAIInsights(
    matches: CourseMatch[],
    student: StudentProfile
  ): Promise<CourseMatch[]> {
    if (matches.length === 0) return matches;

    const topMatches = matches.slice(0, 3);
    
    const prompt = `You are an educational advisor helping a student find the best courses. 

Student Profile:
- Education Level: ${student.educationLevel || "Not specified"}
- Field of Study Interest: ${student.fieldOfStudy || "Not specified"}
- Career Goals: ${student.careerGoals || "Not specified"}
- Budget Range: ${student.budgetMin ? `$${student.budgetMin} - $${student.budgetMax}` : "Not specified"}
- Preferred Subjects: ${student.preferredSubjects?.join(", ") || "Not specified"}
- English Score: ${student.englishScore || "Not specified"}

For each of the following courses, provide a brief (1-2 sentences) personalized insight on why it's a good match:

${topMatches.map((match, idx) => `
${idx + 1}. ${match.course.title} at ${match.course.universityId}
   - Subject: ${match.course.subject}
   - Level: ${match.course.level}
   - Fees: ${match.course.fees} ${match.course.currency}
   - Match Reasons: ${match.matchReasons.join(", ")}
`).join("\n")}

Respond in JSON format:
{
  "insights": ["insight for course 1", "insight for course 2", "insight for course 3"]
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful educational advisor. Provide concise, personalized course recommendations.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 500,
      });

      const aiResponse = JSON.parse(response.choices[0].message.content || "{}");
      
      if (aiResponse.insights && Array.isArray(aiResponse.insights)) {
        topMatches.forEach((match, idx) => {
          if (aiResponse.insights[idx]) {
            match.aiInsight = aiResponse.insights[idx];
          }
        });
      }
    } catch (error) {
      console.error("Failed to get AI insights:", error);
    }

    return matches;
  }

  private async generateSummary(
    matches: CourseMatch[],
    student: StudentProfile
  ): Promise<string> {
    if (matches.length === 0) {
      return "We couldn't find courses matching all your criteria. Try adjusting your preferences for more options.";
    }

    const prompt = `Create a brief summary (2-3 sentences) for a student about their ${matches.length} recommended courses.

Student interested in: ${student.fieldOfStudy || "various fields"}
Career goals: ${student.careerGoals || "Not specified"}
Top matches include: ${matches.slice(0, 3).map(m => m.course.title).join(", ")}

Keep it encouraging and highlight the variety or focus of recommendations.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful educational advisor. Provide concise, encouraging summaries.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 150,
      });

      return response.choices[0].message.content || 
        `Found ${matches.length} courses matching your preferences in ${student.fieldOfStudy || "your field of interest"}.`;
    } catch (error) {
      console.error("Failed to generate summary:", error);
      return `Found ${matches.length} courses matching your preferences.`;
    }
  }
}

export const recommendationService = new RecommendationService();
