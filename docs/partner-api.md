# CampQ - Partner API Documentation

## Overview

The Partner API allows external AI bots and integration partners to programmatically upload institutions and courses to the CampQ platform. All submissions are created as **drafts** and require approval by a Platform Admin before being published.

**Data Quality Standard:** The API enforces strict validation to ensure uploaded data matches manual entry quality (98%+ completeness).

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

#### Create Institution (Draft)

Create a new institution as a draft pending approval.

```
POST /api/partner/institutions
```

**Required Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Institution name (minimum 2 characters, unique per country) |
| `country` | string | Country where institution is located |
| `description` | string | Institution description (minimum 50 characters) |
| `website` | string | Valid institution website URL |
| `contactEmail` | string | Valid contact email address |
| `contactPhone` | string | Contact phone number (minimum 8 characters) |

**Optional Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `smallDescription` | string | AI-powered short description (max 100 words) |
| `fullDescription` | string | Detailed description |
| `logo` | string | Valid URL to institution logo image |
| `institutionGallery` | string[] | Array of image URLs (up to 3 images) |
| `establishedYear` | number | Year established |
| `contactEmail` | string | Contact email address |
| `contactPhone` | string | Contact phone number |
| `numberOfCampuses` | number | Number of campus locations |
| `providerType` | string | One of: `University`, `Institution`, `Tafe`, `School` |
| `scholarshipPercentageMin` | number | Minimum scholarship percentage offered |
| `scholarshipPercentageMax` | number | Maximum scholarship percentage offered |
| `topDisciplines` | string[] | Array of top discipline areas |
| `rtoNumber` | string | RTO number (Australia-specific) |
| `cricosProviderCode` | string | CRICOS Provider Code (Australia-specific) |
| `campusAddresses` | object[] | Array of campus address objects |

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

**Request Example:**

```json
{
  "name": "Melbourne Business School",
  "country": "Australia",
  "description": "A leading business school offering MBA and executive education programs with a focus on innovation, leadership, and global business practices. Accredited by AACSB and EQUIS.",
  "website": "https://mbs.edu",
  "contactEmail": "admissions@mbs.edu",
  "contactPhone": "+61 3 9349 8400",
  "logo": "https://mbs.edu/logo.png",
  "establishedYear": 1955,
  "providerType": "University",
  "numberOfCampuses": 2,
  "cricosProviderCode": "00116K",
  "topDisciplines": ["Accounting, Business & Finance", "Humanities"],
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
  "message": "Institution created as draft. Pending admin approval.",
  "data": {
    "id": "generated-uuid",
    "name": "Melbourne Business School",
    "approvalStatus": "pending",
    "publishStatus": "draft"
  }
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    { "field": "name", "message": "Institution name is required" }
  ]
}
```

**Error Response (409 Conflict):**

```json
{
  "success": false,
  "error": "Institution with this name already exists",
  "existingId": "existing-uuid"
}
```

---

### Courses

#### Create Course (Draft)

Create a new course as a draft pending approval.

```
POST /api/partner/courses
```

**Required Fields:**

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
- `Graduate Certificate`
- `Graduate Diploma`
- `Bachelor Degree`
- `Professional Year`
- `Masters Degree`
- `Doctoral Degree`
- `Higher Doctoral Degree`
- `ELICOS`

**Optional Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `description` | string | Course description |
| `discipline` | string | Main discipline category |
| `duration` | string | Duration (e.g., "2 years", "6 months") |
| `durationMonths` | number | Duration in months for filtering |
| `durationWeeks` | number | Duration in weeks for precise tracking |
| `fees` | number | Tuition fees |
| `currency` | string | Currency code (default: "AUD") |
| `location` | string | Course location |
| `country` | string | Country |
| `startDate` | string | Start date |
| `applicationDeadline` | string | Application deadline |
| `prerequisites` | string | Prerequisites |
| `courseCode` | string | Institution's course code |
| `prPathway` | boolean | Permanent residency pathway (default: false) |
| `eligibilityRequirements` | string | Eligibility requirements |
| `englishRequirements` | string | English language requirements |
| `sourceUrl` | string | URL to course page on institution website |
| `deliveryMode` | string | `online`, `on-campus`, or `hybrid` |
| `intakes` | string[] | Available intake months |
| `studyAreas` | string[] | Curriculum topics |
| `careerOutcomes` | string[] | Potential career paths |
| `campusLocations` | string[] | Available campus locations |
| `workRights` | boolean | Provides work rights/visa eligibility |
| `internshipAvailable` | boolean | Internship included in program |
| `internshipDetails` | string | Details about internship opportunities |

**Request Example:**

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
  "englishRequirements": "IELTS 6.5 overall with no band less than 6.0",
  "country": "Australia",
  "location": "Melbourne",
  "sourceUrl": "https://mbs.edu/mba",
  "thumbnailUrl": "https://mbs.edu/images/mba-thumbnail.jpg",
  "deliveryMode": "hybrid",
  "prPathway": true,
  "intakes": ["February", "July"],
  "studyAreas": ["Strategic Management", "Finance", "Leadership"],
  "careerOutcomes": ["CEO", "CFO", "Management Consultant"],
  "campusLocations": ["Melbourne CBD", "Carlton"],
  "internshipAvailable": true,
  "internshipDetails": "6-month industry placement with partner companies"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Course created as draft. Pending admin approval.",
  "data": {
    "id": "generated-course-uuid",
    "title": "Master of Business Administration",
    "universityId": "institution-uuid",
    "approvalStatus": "pending",
    "publishStatus": "draft"
  }
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    { "field": "universityId", "message": "Institution not found" },
    { "field": "level", "message": "Invalid course level" }
  ]
}
```

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Validation error |
| 401 | Unauthorized - Invalid or missing API key |
| 403 | Forbidden - API key lacks required permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Duplicate resource |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

---

## Best Practices

### 1. Check for Duplicates First

Before creating an institution, use the list endpoint to check if it already exists:

```bash
GET /api/partner/institutions?search=Melbourne%20Business%20School
```

### 2. Use Valid Institution IDs

When creating courses, ensure the `universityId` corresponds to an existing institution. Use the list institutions endpoint to get valid IDs.

### 3. Provide Complete Data

The more complete your submissions, the faster they will be approved:
- Include descriptions and contact information
- Provide accurate fee information
- Include intake dates and career outcomes for courses

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

---

## Example: Complete Institution + Course Upload

```bash
# Step 1: Create institution
curl -X POST https://your-domain.com/api/partner/institutions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "name": "Global Tech University",
    "country": "Australia",
    "website": "https://globaltech.edu.au",
    "providerType": "University"
  }'

# Response: {"success": true, "data": {"id": "inst-123"}}

# Step 2: Create course using institution ID
curl -X POST https://your-domain.com/api/partner/courses \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "universityId": "inst-123",
    "title": "Bachelor of Computer Science",
    "subject": "Computer Science",
    "level": "Bachelor Degree",
    "discipline": "Computer Science & IT",
    "fees": 42000,
    "duration": "3 years"
  }'

# Response: {"success": true, "data": {"id": "course-456"}}
```

---

## Support

For API access, contact your Platform Admin or CTO to generate an API key.

For technical issues, refer to the platform documentation or contact support.
