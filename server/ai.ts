import OpenAI from "openai";

// This is using Replit's AI Integrations service (blueprint: javascript_openai_ai_integrations)
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

// Use GPT-4 for all generations (Replit AI Integrations compatible model)
const MODEL = "gpt-4";

export async function generateUniversityDescription(name: string, location: string): Promise<string> {
  const prompt = `Generate a compelling and professional university description for ${name} located in ${location}. 
The description should be 2-3 paragraphs and highlight:
- The university's academic excellence and research contributions
- Campus facilities and student life
- Global perspective and international opportunities
- Commitment to student success

Write in a professional, welcoming tone suitable for prospective students.`;

  const response = await openai.chat.completions.create({
    model: MODEL,
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

  console.log("Generating course description with prompt:", prompt);

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 500,
  });

  console.log("OpenAI response:", JSON.stringify(response, null, 2));
  const content = response.choices[0]?.message?.content || "";
  console.log("Extracted content:", content);

  return content;
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
    model: MODEL,
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
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 300,
  });

  return response.choices[0]?.message?.content || "";
}

export async function generateInstitutionSmallDescription(
  name: string,
  location: string,
  providerType?: string
): Promise<string> {
  const typeContext = providerType ? ` a ${providerType}` : " an educational institution";
  const prompt = `Generate a compelling short description (maximum 100 words) for ${name},${typeContext} located in ${location}.

The description should:
- Be concise and impactful (under 100 words)
- Highlight what makes the institution unique
- Mention key strengths or specializations
- Appeal to prospective students

Write in a professional, engaging tone.`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 150,
  });

  return response.choices[0]?.message?.content || "";
}

export async function generateInstitutionFullDescription(
  name: string,
  location: string,
  providerType?: string,
  topDisciplines?: string[]
): Promise<string> {
  const typeContext = providerType ? ` a ${providerType}` : " an educational institution";
  const disciplinesContext = topDisciplines && topDisciplines.length > 0 
    ? ` The institution specializes in ${topDisciplines.join(", ")}.` 
    : "";
  
  const prompt = `Generate a comprehensive, detailed description for ${name},${typeContext} located in ${location}.${disciplinesContext}

The description should be 4-5 paragraphs and include:
- Institution history and mission
- Academic programs and research excellence
- Campus facilities and learning environment
- Student support services and resources
- International opportunities and industry connections
- Commitment to student success and outcomes

Write in a professional, inspiring tone suitable for prospective students and their families.`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 800,
  });

  return response.choices[0]?.message?.content || "";
}

export async function generateInstitutionGalleryImages(
  name: string,
  location: string,
  providerType?: string
): Promise<string[]> {
  const typeContext = providerType ? ` ${providerType}` : " educational institution";
  
  const prompts = [
    `A modern, welcoming campus entrance of ${name}, a${typeContext} in ${location}. Show impressive architecture with students walking, bright daylight, professional photography style`,
    `Students studying and collaborating in a state-of-the-art library or learning commons at ${name} in ${location}. Modern furniture, natural lighting, engaged students, vibrant atmosphere`,
    `Beautiful campus grounds of ${name} in ${location} showing outdoor study areas, green spaces, and modern buildings. Students socializing, sunny day, professional university photography`
  ];

  const imageUrls: string[] = [];

  for (const prompt of prompts) {
    try {
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
      });

      if (response.data?.[0]?.url) {
        imageUrls.push(response.data[0].url);
      }
    } catch (error) {
      console.error("Error generating gallery image:", error);
    }
  }

  return imageUrls;
}
