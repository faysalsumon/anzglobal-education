import { Pinecone, PineconeRecord } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import { db } from './db';
import { courses, universities } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

const PINECONE_INDEX_NAME = 'anz-global-education';

// Initialize OpenAI for embeddings
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Cache for Pinecone index to avoid repeated initialization
let cachedPineconeIndex: any = null;
let indexInitializationPromise: Promise<any> | null = null;
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

// Initialize Pinecone client
export async function initializePinecone() {
  const apiKey = process.env.PINECONE_API_KEY;
  
  if (!apiKey) {
    throw new Error('PINECONE_API_KEY environment variable is required');
  }

  const pc = new Pinecone({
    apiKey: apiKey,
  });

  return pc;
}

// Initialize Pinecone index (call at server startup)
export async function initializePineconeIndex() {
  // If index is already cached, return it
  if (cachedPineconeIndex) {
    return cachedPineconeIndex;
  }

  // If initialization is in progress, wait for it (don't spawn duplicate attempts)
  if (indexInitializationPromise) {
    return indexInitializationPromise;
  }

  // Start initialization with bounded retry loop inside cached promise
  indexInitializationPromise = (async () => {
    for (let attempt = 1; attempt <= MAX_INIT_ATTEMPTS; attempt++) {
      try {
        console.log(`[Pinecone] Initialization attempt ${attempt}/${MAX_INIT_ATTEMPTS}`);
        
        const pc = await initializePinecone();
        
        const indexList = await pc.listIndexes();
        const indexExists = indexList.indexes?.some(index => index.name === PINECONE_INDEX_NAME);

        if (!indexExists) {
          console.log(`[Pinecone] Creating index: ${PINECONE_INDEX_NAME}`);
          await pc.createIndex({
            name: PINECONE_INDEX_NAME,
            dimension: 1536, // OpenAI text-embedding-3-small dimension
            metric: 'cosine',
            spec: {
              serverless: {
                cloud: 'aws',
                region: 'us-east-1'
              }
            }
          });
          
          // Wait for index to be ready (poll instead of fixed wait)
          console.log('[Pinecone] Waiting for index to be ready...');
          let retries = 0;
          while (retries < 30) { // Max 2 minutes (30 * 4s)
            await new Promise(resolve => setTimeout(resolve, 4000));
            const indexes = await pc.listIndexes();
            const targetIndex = indexes.indexes?.find(idx => idx.name === PINECONE_INDEX_NAME);
            if (targetIndex && targetIndex.status?.ready) {
              console.log('[Pinecone] Index is ready!');
              break;
            }
            retries++;
          }
        } else {
          console.log('[Pinecone] Using existing index');
        }

        const index = pc.index(PINECONE_INDEX_NAME);
        cachedPineconeIndex = index;
        return index;
      } catch (error) {
        console.error(`[Pinecone] Initialization failed (attempt ${attempt}/${MAX_INIT_ATTEMPTS}):`, error);
        
        if (attempt === MAX_INIT_ATTEMPTS) {
          // Max attempts reached, throw wrapped error
          throw new Error(`[Pinecone] Failed to initialize after ${MAX_INIT_ATTEMPTS} attempts. Last error: ${error}`);
        }
        
        // Exponential backoff before next retry
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
        console.log(`[Pinecone] Retrying in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
    
    throw new Error('[Pinecone] Initialization loop completed without success');
  })().finally(() => {
    // Only clear promise if initialization definitively failed
    if (!cachedPineconeIndex) {
      indexInitializationPromise = null;
    }
  });

  return indexInitializationPromise;
}

// Get Pinecone index (returns cached or waits for initialization to complete)
export async function getPineconeIndex() {
  // If index is already cached, return it
  if (cachedPineconeIndex) {
    return cachedPineconeIndex;
  }
  
  // If initialization is in progress, wait for it
  if (indexInitializationPromise) {
    try {
      return await indexInitializationPromise;
    } catch (error) {
      throw new Error('Pinecone index initialization failed. Please try again later.');
    }
  }
  
  // Index not initialized yet, start initialization now
  console.log('[Pinecone] Index not initialized, starting initialization now...');
  return await initializePineconeIndex();
}

// Create text embeddings using OpenAI
async function createEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  return response.data[0].embedding;
}

// Split text into chunks
function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }

  return chunks;
}

interface KnowledgeDocument {
  id: string;
  content: string;
  metadata: Record<string, any>;
}

// Extract and format course data for knowledge base
async function extractCourseDocuments(): Promise<KnowledgeDocument[]> {
  const coursesWithUniversities = await db
    .select({
      course: courses,
      university: universities,
    })
    .from(courses)
    .leftJoin(universities, eq(courses.universityId, universities.id))
    .where(eq(courses.approvalStatus, 'approved'));

  const documents: KnowledgeDocument[] = [];

  for (const { course, university } of coursesWithUniversities) {
    if (!university) continue;

    // Get campus locations from course's campusLocations array
    const campusLocations = course.campusLocations?.join(', ') || 'Not specified';

    const content = `
Course: ${course.title}
Institution: ${university.name}
Provider Type: ${university.providerType}
Discipline: ${course.discipline || 'Not specified'}
Level: ${course.level || 'Not specified'}
Country: ${course.country || 'Not specified'}
Campus Locations: ${campusLocations}
Duration: ${course.duration || 'Not specified'}
Fees: ${course.fees ? `$${course.fees} AUD` : 'Not specified'}
Course Code: ${course.courseCode || 'Not specified'}
Description: ${course.description || 'No description available'}
Career Path: ${course.careerPath || 'Not specified'}
Academic Requirements: ${course.academicRequirements || 'Not specified'}
English Requirements: ${course.englishRequirements || 'Not specified'}
Delivery Mode: ${course.deliveryMode || 'Not specified'}
PR Pathway: ${course.prPathway ? 'Yes' : 'No'}
`.trim();

    documents.push({
      id: `course-${course.id}`,
      content,
      metadata: {
        type: 'course',
        courseId: course.id,
        courseName: course.title,
        universityId: university.id,
        universityName: university.name,
        discipline: course.discipline || '',
        level: course.level || '',
        country: course.country || '',
        fees: course.fees ? String(course.fees) : '',
      }
    });
  }

  console.log(`Extracted ${documents.length} course documents`);
  return documents;
}

// Extract and format institution data
async function extractInstitutionDocuments(): Promise<KnowledgeDocument[]> {
  const allUniversities = await db
    .select()
    .from(universities);

  const documents: KnowledgeDocument[] = [];

  for (const university of allUniversities) {
    // Get campus locations from institution's campusAddresses array
    const campusAddresses = university.campusAddresses as Array<{ city?: string; state?: string }> | null;
    const campusLocations = campusAddresses
      ?.map((campus: { city?: string; state?: string }) => `${campus.city || ''}, ${campus.state || ''}`)
      .join('; ') || 'Not specified';

    const content = `
Institution: ${university.name}
Provider Type: ${university.providerType}
Country: ${university.country || 'Not specified'}
Campus Locations: ${campusLocations}
Description: ${university.description || 'No description available'}
Ranking: ${university.rankingBand || 'Not specified'}
Accreditation: ${university.accreditationStatus || 'Not specified'}
Contact Email: ${university.contactEmail || 'Not specified'}
Phone: ${university.contactPhone || 'Not specified'}
Website: ${university.website || 'Not specified'}
Established: ${university.establishedYear || 'Not specified'}
International Support: ${university.internationalStudentSupport ? 'Yes' : 'Not specified'}
`.trim();

    documents.push({
      id: `institution-${university.id}`,
      content,
      metadata: {
        type: 'institution',
        institutionId: university.id,
        institutionName: university.name,
        providerType: university.providerType,
        country: university.country || '',
      }
    });
  }

  console.log(`Extracted ${documents.length} institution documents`);
  return documents;
}

// Extract platform guide documents with dynamic statistics
async function extractPlatformGuides(): Promise<KnowledgeDocument[]> {
  // Get dynamic platform statistics
  const [courseStats, institutionStats] = await Promise.all([
    db.select().from(courses).where(eq(courses.approvalStatus, 'approved')),
    db.select().from(universities),
  ]);

  const totalCourses = courseStats.length;
  const totalInstitutions = institutionStats.length;
  
  // Calculate disciplines and levels from course stats
  const disciplineCounts: Record<string, number> = {};
  const levelCounts: Record<string, number> = {};
  let prPathwayCourses = 0;
  
  for (const course of courseStats) {
    if (course.discipline) {
      disciplineCounts[course.discipline] = (disciplineCounts[course.discipline] || 0) + 1;
    }
    if (course.level) {
      levelCounts[course.level] = (levelCounts[course.level] || 0) + 1;
    }
    if (course.prPathway) {
      prPathwayCourses++;
    }
  }
  
  const disciplines = Object.entries(disciplineCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${name} (${count} courses)`)
    .join(', ') || 'Various disciplines';
    
  const levels = Object.entries(levelCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${name} (${count})`)
    .join(', ') || 'Various levels';
    
  const institutionNames = institutionStats.map(u => u.name).join(', ');

  const guides = [
    {
      id: 'guide-platform-statistics',
      title: 'ANZ Global Education Platform Statistics',
      content: `
ANZ Global Education Platform Current Statistics:

Total Courses Available: ${totalCourses} courses
Total Institutions Listed: ${totalInstitutions} institutions
PR Pathway Courses: ${prPathwayCourses} courses offer Permanent Residency pathways

Institutions on our platform: ${institutionNames}

Disciplines Available: ${disciplines}

Course Levels Available: ${levels}

Our platform connects international students with quality Australian education providers. Browse our courses at /courses to explore all options.
      `.trim(),
      metadata: { type: 'guide', topic: 'platform-statistics' }
    },
    {
      id: 'guide-pr-pathway',
      title: 'Understanding PR Pathway Courses',
      content: `
What is a PR Pathway Course?

A PR (Permanent Residency) Pathway course is a qualification that can help international students gain points toward Australian permanent residency.

Key Points about PR Pathway Courses:
- These courses align with occupations on Australia's Skilled Occupation List (SOL)
- Completing such a course may qualify you for a skilled migration visa
- Common PR pathway disciplines include: Engineering, Nursing, Accounting, IT, Teaching, Trade qualifications
- The course must be at least 2 years in duration (CRICOS registered)
- You need to meet additional requirements like English proficiency and skills assessment

Benefits of PR Pathway Courses:
1. Pathway to permanent residency in Australia
2. Better employment prospects post-graduation
3. Access to post-study work visa (subclass 485)
4. Opportunity to build a career in Australia

Currently, we have ${prPathwayCourses} PR pathway courses available on our platform. Use the "PR Pathway" filter when searching courses to find them.

Note: Immigration policies change frequently. Always verify current requirements with the Department of Home Affairs or a registered migration agent.
      `.trim(),
      metadata: { type: 'guide', topic: 'pr-pathway' }
    },
    {
      id: 'guide-applications',
      title: 'How to Apply for Courses',
      content: `
To apply for courses on ANZ Global Education:

1. Create a student account or log in
2. Browse courses using the search and filters
3. Click on a course to view details
4. Click "Apply Now" on the course page
5. Fill in the application form with your details
6. Upload required documents (transcripts, English test scores, passport)
7. Submit your application
8. Track your application status in your dashboard
9. Universities will review and respond to your application

Required documents typically include:
- Academic transcripts
- English language test scores (IELTS, TOEFL, PTE)
- Copy of passport
- Statement of purpose
- Letters of recommendation (for postgraduate programs)
      `.trim(),
      metadata: { type: 'guide', topic: 'applications' }
    },
    {
      id: 'guide-course-levels',
      title: 'Understanding Course Levels',
      content: `
ANZ Global Education offers courses at various qualification levels:

- VCE (11-12): Victorian Certificate of Education (high school)
- Certificate II-IV: Vocational training certificates
- Diploma: 1-2 year vocational qualification
- Advanced Diploma: Higher vocational qualification
- Graduate Certificate: Short postgraduate program
- Graduate Diploma: Postgraduate diploma
- Bachelor Degree: Undergraduate degree (3-4 years)
- Professional Year: Post-study work program
- Masters Degree: Postgraduate degree (1-2 years)
- Doctoral Degree: PhD programs
- ELICOS: English language courses

Each level has different entry requirements and career outcomes.
      `.trim(),
      metadata: { type: 'guide', topic: 'course-levels' }
    },
    {
      id: 'guide-english-requirements',
      title: 'English Language Requirements',
      content: `
Most Australian universities require proof of English proficiency:

Common tests accepted:
- IELTS (International English Language Testing System)
- TOEFL (Test of English as a Foreign Language)
- PTE (Pearson Test of English)
- Duolingo English Test

Typical requirements:
- Undergraduate: IELTS 6.0-6.5 overall
- Postgraduate: IELTS 6.5-7.0 overall
- Some courses may have higher requirements

You can also complete ELICOS (English Language Intensive Courses) in Australia if you don't meet the requirements initially.
      `.trim(),
      metadata: { type: 'guide', topic: 'english-requirements' }
    },
    {
      id: 'guide-studying-australia',
      title: 'Studying in Australia',
      content: `
Australia is a popular destination for international students:

Why study in Australia:
- World-class education system
- Globally recognized qualifications
- Safe and welcoming environment
- Post-study work opportunities
- Diverse and multicultural society

Student visa requirements:
- Confirmation of Enrolment (CoE) from institution
- Genuine Temporary Entrant (GTE) statement
- Financial capacity proof
- Health insurance (OSHC)
- English proficiency proof
- Health and character requirements

Post-study work rights:
- Temporary Graduate visa (subclass 485)
- Work rights depend on qualification level
- Bachelor/Masters: 2-4 years work rights
      `.trim(),
      metadata: { type: 'guide', topic: 'studying-in-australia' }
    },
    {
      id: 'guide-platform-features',
      title: 'Platform Features',
      content: `
ANZ Global Education platform features:

For Students:
- Search and filter courses by discipline, level, location, fees
- View detailed course and institution information
- Apply to multiple courses
- Track application status
- Upload and manage documents
- Receive notifications about applications
- Chat with Zan, our AI assistant, for instant help

For Institutions:
- Manage course listings
- Review and respond to applications
- Manage team members and roles
- Upload institution information and images
- Track student inquiries

Search Tips:
- Use natural language: "Computer Science courses in Melbourne under $25000"
- Filter by discipline, level, country, city, fees
- Click on campus badges to filter by location
- Save favorite courses for later
      `.trim(),
      metadata: { type: 'guide', topic: 'platform-features' }
    },
    {
      id: 'guide-course-components',
      title: 'Understanding Course Components',
      content: `
Each course on ANZ Global Education includes detailed information:

Course Details:
- Course Title: The name of the qualification
- Course Code: Official identification code (e.g., CRICOS code)
- Discipline: Subject area (IT, Business, Engineering, etc.)
- Level: Qualification level (Diploma, Bachelor, Masters, etc.)
- Duration: How long the course takes to complete
- Delivery Mode: On-campus, online, or blended learning

Fees & Costs:
- Tuition Fees: Course fees per year or total
- Application Fees: One-time application cost
- Cost of Living: Estimated living expenses in the area

Location:
- Country: Where the institution is located
- Campus Locations: Specific cities and campuses available
- Study Options: Full-time, part-time availability

Entry Requirements:
- Academic Requirements: Previous qualifications needed
- English Requirements: IELTS/PTE/TOEFL scores required
- Work Experience: If relevant experience is needed

Career Outcomes:
- Career Path: Potential job opportunities after graduation
- PR Pathway: Whether the course helps with permanent residency
- Scholarship Range: Available financial assistance

Intakes:
- Start Dates: When you can begin the course
- Application Deadlines: When to submit applications
      `.trim(),
      metadata: { type: 'guide', topic: 'course-components' }
    }
  ];

  return guides.map(guide => ({
    id: guide.id,
    content: `${guide.title}\n\n${guide.content}`,
    metadata: guide.metadata
  }));
}

// Build and upload knowledge base to Pinecone
export async function buildKnowledgeBase() {
  console.log('[KnowledgeBase] Starting build...');

  try {
    // Extract all documents
    const [coursesDocs, institutionsDocs, guidesDocs] = await Promise.all([
      extractCourseDocuments(),
      extractInstitutionDocuments(),
      extractPlatformGuides(),
    ]);

    const allDocuments = [
      ...coursesDocs,
      ...institutionsDocs,
      ...guidesDocs,
    ];

    console.log(`[KnowledgeBase] Total documents extracted: ${allDocuments.length}`);

    if (allDocuments.length === 0) {
      console.log('[KnowledgeBase] No documents to upload');
      return { success: true, documentsProcessed: 0, vectorsCreated: 0 };
    }

    // Get Pinecone index (await in case initialization is still in progress)
    const index = await getPineconeIndex();

    // Create vectors for each document
    const vectors: PineconeRecord[] = [];
    for (const doc of allDocuments) {
      const chunks = chunkText(doc.content);
      
      for (let i = 0; i < chunks.length; i++) {
        const embedding = await createEmbedding(chunks[i]);
        vectors.push({
          id: `${doc.id}-chunk-${i}`,
          values: embedding,
          metadata: {
            ...doc.metadata,
            content: chunks[i],
            chunkIndex: i,
            totalChunks: chunks.length,
          }
        });
      }
    }

    console.log(`Created ${vectors.length} vectors from ${allDocuments.length} documents`);

    // Upload to Pinecone in batches
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.upsert(batch);
      console.log(`Uploaded batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)}`);
    }

    console.log('Knowledge base build completed successfully!');
    return {
      success: true,
      documentsProcessed: allDocuments.length,
      vectorsCreated: vectors.length,
    };
  } catch (error) {
    console.error('Error building knowledge base:', error);
    throw error;
  }
}

// Track if knowledge base has been auto-initialized
let autoInitializationAttempted = false;
let lastBuildTime: Date | null = null;

// Force a knowledge base rebuild (resets the auto-init flag)
export function resetKnowledgeBaseInitialization(): void {
  autoInitializationAttempted = false;
  lastBuildTime = null;
  console.log('[Knowledge Base] Initialization flag reset - will rebuild on next query');
}

// Check if knowledge base is empty or stale (older than 1 hour)
async function isKnowledgeBaseStale(): Promise<boolean> {
  try {
    // If never built or built more than 1 hour ago, consider stale
    if (!lastBuildTime || (Date.now() - lastBuildTime.getTime()) > 60 * 60 * 1000) {
      return true;
    }
    
    const index = await getPineconeIndex();
    const stats = await index.describeIndexStats();
    const totalVectors = stats.totalRecordCount || 0;
    console.log(`[Knowledge Base] Current vector count: ${totalVectors}`);
    return totalVectors === 0;
  } catch (error) {
    console.error('[Knowledge Base] Error checking if stale:', error);
    return true; // Assume stale on error
  }
}

// Query knowledge base
export async function queryKnowledgeBase(query: string, topK = 5): Promise<Array<{ content: string; metadata: Record<string, any>; score: number }>> {
  try {
    // Auto-initialize knowledge base if empty or stale (one-time per server restart)
    if (!autoInitializationAttempted) {
      autoInitializationAttempted = true;
      const isStale = await isKnowledgeBaseStale();
      
      if (isStale) {
        console.log('[Knowledge Base] Stale or empty knowledge base detected, rebuilding with fresh platform data...');
        try {
          await buildKnowledgeBase();
          lastBuildTime = new Date();
          console.log('[Knowledge Base] Auto-initialization completed successfully');
        } catch (error) {
          console.error('[Knowledge Base] Auto-initialization failed:', error);
          // Continue anyway - the query will return empty results
        }
      }
    }

    // Get Pinecone index (await in case initialization is still in progress)
    const index = await getPineconeIndex();

    // Create embedding for query
    const queryEmbedding = await createEmbedding(query);

    // Search Pinecone
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
    });

    return (queryResponse.matches || []).map((match: any) => {
      // Extract the stored text content from metadata
      const storedContent = match.metadata?.content as string;
      
      // Remove the content field from metadata before returning
      const { content, ...restMetadata } = match.metadata || {};
      
      return {
        content: storedContent || '',
        metadata: restMetadata,
        score: match.score || 0,
      };
    });
  } catch (error) {
    console.error('Error querying knowledge base:', error);
    throw error;
  }
}
