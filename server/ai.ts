import OpenAI from "openai";

// This is using Replit's AI Integrations service (blueprint: javascript_openai_ai_integrations)
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

export async function generateUniversityDescription(name: string, location: string): Promise<string> {
  const prompt = `Generate a compelling and professional university description for ${name} located in ${location}. 
The description should be 2-3 paragraphs and highlight:
- The university's academic excellence and research contributions
- Campus facilities and student life
- Global perspective and international opportunities
- Commitment to student success

Write in a professional, welcoming tone suitable for prospective students.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 500,
  });

  return response.choices[0]?.message?.content || "";
}

export async function generateCourseDescription(
  title: string,
  subject: string,
  level: string
): Promise<string> {
  const prompt = `Generate a detailed course description for "${title}", a ${level} level course in ${subject}.
The description should be 2-3 paragraphs and include:
- Course overview and learning objectives
- Key topics and curriculum highlights
- Skills and knowledge students will gain
- Career opportunities and real-world applications

Write in an engaging, informative tone that attracts prospective students.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 500,
  });

  return response.choices[0]?.message?.content || "";
}

export async function generateStudentBio(
  educationLevel?: string,
  fieldOfStudy?: string
): Promise<string> {
  const context = [educationLevel, fieldOfStudy].filter(Boolean).join(", ");
  const prompt = `Generate a compelling personal bio for a student${context ? ` studying ${context}` : ""}. 
The bio should be 1-2 paragraphs and include:
- Their academic interests and passions
- What drives their educational journey
- Their approach to learning and growth

Write in first person, professional yet personable tone.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 300,
  });

  return response.choices[0]?.message?.content || "";
}

export async function generateCareerGoals(
  educationLevel?: string,
  fieldOfStudy?: string
): Promise<string> {
  const context = [educationLevel, fieldOfStudy].filter(Boolean).join(", ");
  const prompt = `Generate career goals for a student${context ? ` studying ${context}` : ""}. 
The goals should be 1-2 paragraphs and include:
- Short-term and long-term career aspirations
- How their education aligns with these goals
- The impact they hope to make in their field

Write in first person, ambitious yet realistic tone.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 300,
  });

  return response.choices[0]?.message?.content || "";
}
