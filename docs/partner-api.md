# ANZ Global Education - Partner API Documentation

## Overview

The Partner API allows external AI bots and integration partners to programmatically upload institutions and courses to the ANZ Global Education platform. All submissions are created as **drafts** and require approval by a Platform Admin before being published.

**Gold Standard Data Quality:** The API enforces strict validation to ensure uploaded data matches manual entry quality (95%+ completeness). This means humans only need to review and approve, not fill in missing fields.

## Base URL

```
https://your-domain.com/api/partner
```

## Authentication

All Partner API requests require an API key passed in the `X-API-Key` header.

```
X-API-Key: your-api-key-here
```

API keys are generated and managed by Platform Admins or CTOs through the admin dashboard.

### Rate Limits

- **100 requests per minute** per API key
- **1,000 requests per hour** per API key
- Bulk endpoints count as 1 request regardless of batch size

---

## Endpoints

### Institutions

#### List Institutions

Retrieve existing institutions for duplicate checking before creating new ones.

```
GET /api/partner/institutions
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search by name (optional) |
| `country` | string | Filter by country (optional) |
| `limit` | number | Results per page (default: 50, max: 100) |
| `offset` | number | Pagination offset (default: 0) |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-string",
      "name": "University of Sydney",
      "country": "Australia",
      "website": "https://sydney.edu.au",
      "approvalStatus": "approved",
      "publishStatus": "published"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0
  }
}
```

---

#### Create Institution (Gold Standard)

Create a new institution as a draft pending approval. All required fields must be provided for 95% completeness.

```
POST /api/partner/institutions
```

**Required Fields (Gold Standard):**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Institution name (minimum 2 characters, unique per country) |
| `country` | string | Country where institution is located |
| `description` | string | Full institution description (minimum 50 characters) |
| `smallDescription` | string | Short description for cards/listings (minimum 30 characters) |
| `website` | string | Valid institution website URL |
| `contactEmail` | string | Valid contact email address |
| `contactPhone` | string | Contact phone number (minimum 8 characters) |
| `establishedYear` | number | Year established (between 1800 and current year) |
| `tuitionFeesMin` | number | Minimum annual tuition fees (>= 0) |
| `tuitionFeesMax` | number | Maximum annual tuition fees (> 0) |
| `intakePeriods` | string[] | Available intake months (e.g., ["February", "July"]) |
| `deliveryModes` | string[] | Teaching modes (e.g., ["On Campus", "Online", "Hybrid"]) |
| `internationalStudentSupport` | boolean | Does institution support international students? |

**Optional Fields (Recommended for Higher Quality):**

| Field | Type | Description |
|-------|------|-------------|
| `fullDescription` | string | Extended detailed description |
| `logo` | string | Valid URL to institution logo image |
| `institutionGallery` | string[] | Array of image URLs (up to 3 images) |
| `numberOfCampuses` | number | Number of campus locations |
| `providerType` | string | One of: `University`, `Institution`, `Tafe`, `School` |
| `tuitionCurrency` | string | Currency code (default: "AUD") |
| `accreditationStatus` | string | Accreditation information (e.g., "TEQSA Registered") |
| `rankingBand` | string | Ranking tier (e.g., "Top 100 World Universities") |
| `facilities` | string[] | Available facilities (e.g., ["Library", "Gym", "Lab"]) |
| `scholarshipPercentageMin` | number | Minimum scholarship percentage offered |
| `scholarshipPercentageMax` | number | Maximum scholarship percentage offered |
| `topDisciplines` | string[] | Array of top discipline areas (use valid discipline values) |
| `rtoNumber` | string | RTO number (Australia-specific) |
| `cricosProviderCode` | string | CRICOS Provider Code (Australia-specific) |
| `campusAddresses` | object[] | Array of campus address objects |
| `tags` | string[] | Searchable tags for filtering |

**Valid Provider Types:**
- `University`
- `Institution`
- `Tafe`
- `School`

**Campus Address Object:**

```json
{
  "name": "Main Campus",
  "address": "123 University Street",
  "city": "Sydney",
  "state": "NSW",
  "postcode": "2000",
  "country": "Australia"
}
```

**Gold Standard Request Example:**

```json
{
  "name": "Melbourne Business School",
  "country": "Australia",
  "description": "A leading business school offering MBA and executive education programs with a focus on innovation, leadership, and global business practices. Accredited by AACSB and EQUIS with strong industry partnerships.",
  "smallDescription": "Leading business school offering MBA and executive programs with AACSB and EQUIS accreditation.",
  "website": "https://mbs.edu",
  "contactEmail": "admissions@mbs.edu",
  "contactPhone": "+61 3 9349 8400",
  "establishedYear": 1955,
  "tuitionFeesMin": 45000,
  "tuitionFeesMax": 120000,
  "tuitionCurrency": "AUD",
  "intakePeriods": ["February", "July", "November"],
  "deliveryModes": ["On Campus", "Online", "Hybrid"],
  "internationalStudentSupport": true,
  "logo": "https://mbs.edu/logo.png",
  "providerType": "University",
  "numberOfCampuses": 2,
  "accreditationStatus": "AACSB, EQUIS, AMBA Triple Crown Accredited",
  "rankingBand": "Top 50 MBA Programs Globally",
  "facilities": ["Library", "Computer Labs", "Career Center", "Student Lounge"],
  "cricosProviderCode": "00116K",
  "topDisciplines": ["Accounting, Business & Finance", "Humanities"],
  "scholarshipPercentageMin": 10,
  "scholarshipPercentageMax": 50,
  "campusAddresses": [
    {
      "name": "Carlton Campus",
      "address": "200 Leicester Street",
      "city": "Carlton",
      "state": "VIC",
      "postcode": "3053",
      "country": "Australia"
    }
  ]
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Institution created as draft. It will be reviewed by an admin before being published.",
  "data": {
    "id": "generated-uuid",
    "name": "Melbourne Business School",
    "country": "Australia",
    "status": "pending_approval"
  }
}
```

**Error Response (400 Bad Request):**

```json
{
  "error": "Validation error",
  "message": "One or more required fields are missing or invalid",
  "details": [
    { "field": "smallDescription", "message": "Short description is required (minimum 30 characters for card displays)" },
    { "field": "establishedYear", "message": "Established year is required (between 1800 and 2026)" },
    { "field": "tuitionFeesMin", "message": "Minimum tuition fees is required (must be a number >= 0)" }
  ]
}
```

**Error Response (409 Conflict):**

```json
{
  "error": "Duplicate institution",
  "message": "An institution with this name already exists in this country",
  "existingId": "existing-uuid"
}
```

---

### Courses

#### Create Course (Gold Standard)

Create a new course as a draft pending approval. All required fields must be provided for 95% completeness.

```
POST /api/partner/courses
```

**Required Fields (Gold Standard):**

| Field | Type | Description |
|-------|------|-------------|
| `universityId` | string | UUID of the parent institution (must exist) |
| `title` | string | Course title (minimum 5 characters) |
| `description` | string | Course description (minimum 50 characters) |
| `discipline` | string | Main discipline category (see valid values below) |
| `courseLevel` | string | Course level (see valid values below) |
| `fees` | number | Tuition fees (must be a positive number) |
| `durationMonths` | number | Duration in months (or provide `duration` string or `durationWeeks`) |
| `englishRequirements` | string | English language requirements (minimum 10 characters, e.g., "IELTS 6.5") |
| `eligibilityRequirements` | string | Entry qualifications describing who can enroll |
| `intakes` | string[] | Available intake months (e.g., ["February", "July"]) |
| `deliveryMode` | string | Teaching mode: `online`, `on-campus`, `hybrid`, or `blended` |
| `careerOutcomes` | string[] | Job titles graduates can pursue (at least one required) |

**Valid Disciplines:**

- `Accounting, Business & Finance`
- `Agriculture & Forestry`
- `Applied Sciences & Professions`
- `Arts, Design & Architecture`
- `Computer Science & IT`
- `Education & Training`
- `Engineering & Technology`
- `Environmental Studies & Earth Sciences`
- `Hospitality, Leisure & Sports`
- `Humanities`
- `Journalism & Media`
- `Law`
- `Medicine & Health`
- `Short Courses`
- `Trade`

**Valid Course Levels:**

- `VCE (11-12)`
- `Certificate I`
- `Certificate II`
- `Certificate III`
- `Certificate IV`
- `Diploma`
- `Advanced Diploma`
- `Associate Degree`
- `Graduate Certificate`
- `Graduate Diploma`
- `Bachelor Degree`
- `Bachelor Honours`
- `Masters Degree`
- `Doctoral Degree`
- `Higher Doctoral Degree`
- `ELICOS - General English`
- `ELICOS - EAP`
- `ELICOS - Exam Prep`
- `Professional Year - Accounting`
- `Professional Year - IT`
- `Professional Year - Engineering`
- `Foundation`
- `Pathway Program`
- `Short Course`

**Optional Fields (Recommended for Higher Quality):**

| Field | Type | Description |
|-------|------|-------------|
| `subDiscipline` | string | Sub-discipline within main discipline (see Discipline Hierarchy below) |
| `specialization` | string | Free-text specialization for course focus (e.g., "Artificial Intelligence", "Civil Engineering") |
| `subject` | string | Subject area (defaults to title if not provided) |
| `currency` | string | Currency code (default: "AUD") |
| `location` | string | Course location/city |
| `country` | string | Country (defaults to institution's country) |
| `applicationDeadline` | string | Application deadline |
| `prerequisites` | string | Prerequisites for enrollment |
| `courseCode` | string | Institution's course code |
| `prPathway` | boolean | Permanent residency pathway (default: false) |
| `sourceUrl` | string | Valid URL to course page on institution website |
| `thumbnailUrl` | string | Valid URL to course thumbnail image |
| `campusLocations` | string[] | Available campus locations |
| `internshipAvailable` | boolean | Internship included in program |
| `internshipDetails` | string | Details about internship opportunities |
| `studyAreas` | string[] | Curriculum topics/modules |
| `careerPath` | string | Detailed career progression description |
| `scholarshipPercentageMin` | number | Minimum scholarship percentage |
| `scholarshipPercentageMax` | number | Maximum scholarship percentage |
| `costOfLiving` | number | Estimated annual cost of living |
| `applicationFees` | number | Application processing fee |
| `curriculumUrl` | string | Valid URL to curriculum/syllabus |
| `minimumAge` | number | Minimum age requirement |
| `pathways` | string[] | Further study pathways after completion |

**Discipline Hierarchy (3-Tier System):**

Courses use a 3-tier categorization system for precise filtering and discovery:

| Tier | Field | Required | Description |
|------|-------|----------|-------------|
| 1 | `discipline` | **Required** | Main discipline category (must be from valid list above) |
| 2 | `subDiscipline` | Optional | Sub-category within discipline (use valid sub-discipline name) |
| 3 | `specialization` | Optional | Free-text focus area for maximum specificity |

**Example Hierarchy:**
```
Discipline: "Computer Science & IT" (Tier 1 - Required)
  └── Sub-Discipline: "Cybersecurity" (Tier 2 - Optional)
        └── Specialization: "Network Security" (Tier 3 - Optional free text)
```

**Valid Sub-Disciplines by Discipline:**

| Discipline | Valid Sub-Disciplines |
|------------|----------------------|
| Accounting, Business & Finance | Accounting, Business Management, Economics, Finance, Human Resources, International Business, Marketing, Project Management |
| Arts, Design & Architecture | Architecture, Fashion Design, Fine Arts, Graphic Design, Interior Design |
| Computer Science & IT | Artificial Intelligence, Computer Science, Cybersecurity, Data Science, Information Technology, Software Development |
| Education & Training | Early Childhood Education, Primary Education, Secondary Education, TESOL |
| Engineering & Technology | Aerospace Engineering, Chemical Engineering, Civil Engineering, Electrical Engineering, Mechanical Engineering, Software Engineering |
| Hospitality, Leisure & Sports | Culinary Arts, Event Management, Hospitality Management, Sports Management, Tourism |
| Law | Commercial Law, Criminal Law, International Law |
| Medicine & Health | Aged Care, Allied Health, Medicine, Nursing, Pharmacy, Public Health |
| Trade | Automotive, Carpentry, Electrical Trade, Plumbing |

Use `GET /api/partner/disciplines` to retrieve the full list of disciplines and their sub-disciplines programmatically.

**Gold Standard Request Example:**

```json
{
  "universityId": "institution-uuid",
  "title": "Master of Business Administration",
  "subject": "Business Administration",
  "description": "Our globally recognized MBA program prepares leaders for the modern business environment. With a focus on strategic thinking, innovation, and ethical leadership, graduates are equipped to drive organizational success in any industry.",
  "discipline": "Accounting, Business & Finance",
  "courseLevel": "Masters Degree",
  "fees": 75000,
  "currency": "AUD",
  "durationMonths": 24,
  "englishRequirements": "IELTS 6.5 overall with no band less than 6.0, or PTE Academic 58",
  "eligibilityRequirements": "Bachelor's degree from a recognized institution with minimum 2 years work experience. GPA of 3.0/4.0 or equivalent preferred.",
  "intakes": ["February", "July"],
  "deliveryMode": "hybrid",
  "careerOutcomes": ["Chief Executive Officer", "Chief Financial Officer", "Management Consultant", "Business Development Director"],
  "country": "Australia",
  "location": "Melbourne",
  "sourceUrl": "https://mbs.edu/mba",
  "thumbnailUrl": "https://mbs.edu/images/mba-thumbnail.jpg",
  "prPathway": true,
  "studyAreas": ["Strategic Management", "Finance", "Leadership", "Marketing", "Operations"],
  "campusLocations": ["Melbourne CBD", "Carlton"],
  "internshipAvailable": true,
  "internshipDetails": "6-month industry placement with partner companies including Deloitte, PwC, and major banks",
  "careerPath": "Graduates typically progress from Senior Manager to Director to C-Suite roles within 5-10 years",
  "scholarshipPercentageMin": 10,
  "scholarshipPercentageMax": 50,
  "costOfLiving": 25000,
  "applicationFees": 100,
  "pathways": ["Doctor of Business Administration", "PhD in Management"]
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Course created as draft. It will be reviewed by an admin before being published.",
  "data": {
    "id": "generated-course-uuid",
    "title": "Master of Business Administration",
    "universityId": "institution-uuid",
    "discipline": "Accounting, Business & Finance",
    "level": "Masters Degree",
    "fees": "75000.00",
    "status": "pending_approval"
  }
}
```

**Error Response (400 Bad Request):**

```json
{
  "error": "Validation error",
  "message": "One or more required fields are missing or invalid",
  "details": [
    { "field": "eligibilityRequirements", "message": "Eligibility requirements is required (describe entry qualifications)" },
    { "field": "intakes", "message": "Intakes is required (array of months, e.g., [\"February\", \"July\"])" },
    { "field": "careerOutcomes", "message": "Career outcomes is required (array of job titles graduates can pursue)" }
  ]
}
```

---

### Disciplines

#### List Disciplines and Sub-Disciplines

Retrieve all valid disciplines and their sub-disciplines for course categorization.

```
GET /api/partner/disciplines
```

**Response:**

```json
{
  "success": true,
  "data": {
    "disciplines": [
      "Accounting, Business & Finance",
      "Agriculture & Forestry",
      "Applied Sciences & Professions",
      "Arts, Design & Architecture",
      "Computer Science & IT",
      "Education & Training",
      "Engineering & Technology",
      "Environmental Studies & Earth Sciences",
      "Hospitality, Leisure & Sports",
      "Humanities",
      "Journalism & Media",
      "Law",
      "Medicine & Health",
      "Short Courses",
      "Trade"
    ],
    "hierarchy": {
      "Computer Science & IT": {
        "subDisciplines": [
          { "name": "Artificial Intelligence", "slug": "artificial-intelligence" },
          { "name": "Computer Science", "slug": "computer-science" },
          { "name": "Cybersecurity", "slug": "cybersecurity" },
          { "name": "Data Science", "slug": "data-science" },
          { "name": "Information Technology", "slug": "information-technology" },
          { "name": "Software Development", "slug": "software-development" }
        ]
      },
      "Law": {
        "subDisciplines": [
          { "name": "Commercial Law", "slug": "commercial-law" },
          { "name": "Criminal Law", "slug": "criminal-law" },
          { "name": "International Law", "slug": "international-law" }
        ]
      }
    },
    "description": "3-tier system: discipline (required) → subDiscipline (optional) → specialization (optional free text)"
  }
}
```

**Usage Notes:**
- Use the `disciplines` array for the required `discipline` field when creating courses
- Use the `hierarchy` to find valid `subDiscipline` values for each discipline
- The `specialization` field accepts free text and is not validated against a fixed list

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Validation error (see details array for specific issues) |
| 401 | Unauthorized - Invalid or missing API key |
| 403 | Forbidden - API key lacks required permissions |
| 404 | Not Found - Resource doesn't exist (e.g., universityId not found) |
| 409 | Conflict - Duplicate resource |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

---

## Gold Standard Checklist

To achieve 95% data completeness and minimize human review effort:

### Institutions
- [ ] Name, country, website, contact email, contact phone
- [ ] Description (50+ chars) and short description (30+ chars)
- [ ] Established year (valid range)
- [ ] Tuition fees range (min and max)
- [ ] Intake periods (array of months)
- [ ] Delivery modes (array)
- [ ] International student support (boolean)
- [ ] Optional: Logo, provider type, CRICOS/RTO codes, facilities, scholarships

### Courses
- [ ] Title, description (50+ chars), university ID
- [ ] Discipline (from valid list) and course level (from valid list)
- [ ] Fees and duration (months, weeks, or string)
- [ ] English requirements (10+ chars)
- [ ] Eligibility requirements (describe who can enroll)
- [ ] Intakes (array of months)
- [ ] Delivery mode
- [ ] Career outcomes (array)
- [ ] Optional: subDiscipline, specialization, source URL, thumbnail, internship details, scholarships, pathways

---

## Best Practices

### 1. Check for Duplicates First

Before creating an institution, use the list endpoint to check if it already exists:

```bash
GET /api/partner/institutions?search=Melbourne%20Business%20School
```

### 2. Use Valid Institution IDs

When creating courses, ensure the `universityId` corresponds to an existing institution. Use the list institutions endpoint to get valid IDs.

### 3. Provide Complete Gold Standard Data

**Key principle:** The goal is for humans to only review and approve, not fill in missing data.

- Provide ALL required fields - the API will reject incomplete submissions
- Use exact enum values for discipline and course level
- Include realistic, detailed descriptions
- Provide accurate fee and duration information
- Include career outcomes and intake dates

### 4. Handle Rate Limits Gracefully

Implement exponential backoff when you receive a 429 response.

### 5. Track Your Submissions

Store the returned `id` values to track your submissions through the approval process.

---

## Workflow

1. **Bot submits institution/course** → Created as `draft` with `approvalStatus: pending`
2. **Admin reviews submission** → Admin sees pending items in approval queue
3. **Admin approves/rejects** → Status updated to `approved` or `rejected`
4. **Admin publishes (if approved)** → `publishStatus: published`, item visible publicly

With gold standard data, approval is typically just a quick verification - no data entry required.

---

## Example: Complete Gold Standard Upload

```bash
# Step 1: Create institution with gold standard data
curl -X POST https://your-domain.com/api/partner/institutions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "name": "Global Tech University",
    "country": "Australia",
    "description": "Global Tech University is a leading institution for technology and innovation education, offering cutting-edge programs in computer science, engineering, and digital transformation.",
    "smallDescription": "Leading tech university with cutting-edge programs in CS, engineering, and digital transformation.",
    "website": "https://globaltech.edu.au",
    "contactEmail": "info@globaltech.edu.au",
    "contactPhone": "+61 2 9123 4567",
    "establishedYear": 2010,
    "tuitionFeesMin": 25000,
    "tuitionFeesMax": 55000,
    "intakePeriods": ["February", "July"],
    "deliveryModes": ["On Campus", "Online"],
    "internationalStudentSupport": true,
    "providerType": "University",
    "cricosProviderCode": "03456K"
  }'

# Response: {"success": true, "data": {"id": "inst-123", ...}}

# Step 2: Create course with gold standard data using institution ID
curl -X POST https://your-domain.com/api/partner/courses \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "universityId": "inst-123",
    "title": "Bachelor of Computer Science",
    "description": "Comprehensive computer science program covering software development, algorithms, AI, and cybersecurity. Graduates are prepared for careers in technology companies worldwide.",
    "discipline": "Computer Science & IT",
    "subDiscipline": "Computer Science",
    "specialization": "Artificial Intelligence",
    "courseLevel": "Bachelor Degree",
    "fees": 42000,
    "durationMonths": 36,
    "englishRequirements": "IELTS 6.0 overall with no band less than 5.5",
    "eligibilityRequirements": "Completion of Year 12 or equivalent with mathematics background. ATAR 85 or equivalent preferred.",
    "intakes": ["February", "July"],
    "deliveryMode": "on-campus",
    "careerOutcomes": ["Software Developer", "Data Analyst", "Systems Architect", "DevOps Engineer"]
  }'

# Response: {"success": true, "data": {"id": "course-456", ...}}
```

---

## Support

For API access, contact your Platform Admin or CTO to generate an API key.

For technical issues, refer to the platform documentation or contact support.
