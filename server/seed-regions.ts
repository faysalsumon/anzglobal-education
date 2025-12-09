import { storage } from "./storage";

export async function seedRegions() {
  console.log("Seeding regions and pathways...");
  
  try {
    const existingRegions = await storage.getAllRegions();
    if (existingRegions.length > 0) {
      console.log(`Regions already exist (${existingRegions.length} found). Skipping seed.`);
      return;
    }

    const australia = await storage.createRegion({
      code: "AU",
      name: "Australia",
      domainPattern: ".com.au",
      primaryDomain: "anzglobal.com.au",
      defaultLocale: "en",
      supportedLocales: ["en"],
      defaultCurrency: "AUD",
      currencySymbol: "A$",
      timezone: "Australia/Sydney",
      flagEmoji: "🇦🇺",
      displayOrder: 1,
      isActive: true,
      isDefault: true,
    });
    console.log(`Created region: ${australia.name} (${australia.code})`);

    const bangladesh = await storage.createRegion({
      code: "BD",
      name: "Bangladesh",
      domainPattern: ".com.bd",
      primaryDomain: "anzglobal.com.bd",
      defaultLocale: "bn",
      supportedLocales: ["bn", "en"],
      defaultCurrency: "BDT",
      currencySymbol: "৳",
      timezone: "Asia/Dhaka",
      flagEmoji: "🇧🇩",
      displayOrder: 2,
      isActive: true,
      isDefault: false,
    });
    console.log(`Created region: ${bangladesh.name} (${bangladesh.code})`);

    const india = await storage.createRegion({
      code: "IN",
      name: "India",
      domainPattern: ".co.in",
      primaryDomain: "anzglobal.co.in",
      defaultLocale: "en",
      supportedLocales: ["en", "hi"],
      defaultCurrency: "INR",
      currencySymbol: "₹",
      timezone: "Asia/Kolkata",
      flagEmoji: "🇮🇳",
      displayOrder: 3,
      isActive: true,
      isDefault: false,
    });
    console.log(`Created region: ${india.name} (${india.code})`);

    const pakistan = await storage.createRegion({
      code: "PK",
      name: "Pakistan",
      domainPattern: ".com.pk",
      primaryDomain: "anzglobal.com.pk",
      defaultLocale: "en",
      supportedLocales: ["en", "ur"],
      defaultCurrency: "PKR",
      currencySymbol: "Rs",
      timezone: "Asia/Karachi",
      flagEmoji: "🇵🇰",
      displayOrder: 4,
      isActive: true,
      isDefault: false,
    });
    console.log(`Created region: ${pakistan.name} (${pakistan.code})`);

    const existingPathways = await storage.getAllPathways();
    if (existingPathways.length === 0) {
      const onshore = await storage.createPathway({
        code: "onshore",
        name: "Onshore Student",
        description: "Students currently residing in Australia with valid visa",
        requiresVisa: false,
        displayOrder: 1,
        isActive: true,
      });
      console.log(`Created pathway: ${onshore.name}`);

      const offshore = await storage.createPathway({
        code: "offshore",
        name: "Offshore Student",
        description: "Students applying from outside Australia who need a student visa",
        requiresVisa: true,
        displayOrder: 2,
        isActive: true,
      });
      console.log(`Created pathway: ${offshore.name}`);

      const prPathway = await storage.createPathway({
        code: "pr_pathway",
        name: "PR Pathway Student",
        description: "Students seeking courses that lead to permanent residency",
        requiresVisa: true,
        displayOrder: 3,
        isActive: true,
      });
      console.log(`Created pathway: ${prPathway.name}`);

      const offshorePathway = await storage.getPathwayByCode("offshore");
      if (offshorePathway) {
        await storage.createVisaRequirement({
          regionId: bangladesh.id,
          pathwayId: offshorePathway.id,
          visaType: "Student Visa (Subclass 500)",
          visaName: "Australian Student Visa for Bangladesh",
          description: "Student visa for Bangladeshi students studying in Australia",
          processingTime: "4-8 weeks",
          financialRequirements: JSON.stringify({
            tuitionCoverage: "First year tuition",
            livingCosts: "AUD 24,505 per year",
            travelCosts: "Return airfare",
            healthInsurance: "OSHC for duration of study",
          }),
          healthRequirements: JSON.stringify(["Medical examination", "Chest X-ray", "TB clearance"]),
          englishRequirements: JSON.stringify({
            tests: ["IELTS", "TOEFL", "PTE Academic"],
            minimumScores: { IELTS: 5.5, TOEFL: 46, PTE: 42 },
          }),
          requiredDocuments: [
            "Confirmation of Enrolment (CoE)",
            "Genuine Temporary Entrant (GTE) statement",
            "Academic transcripts",
            "English test results",
            "Police clearance",
            "Health insurance",
          ],
          applicationUrl: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
          notes: "Processing times may vary. Ensure all documents are certified translations.",
          isActive: true,
        });
        console.log(`Created visa requirement for Bangladesh offshore students`);

        await storage.createVisaRequirement({
          regionId: india.id,
          pathwayId: offshorePathway.id,
          visaType: "Student Visa (Subclass 500)",
          visaName: "Australian Student Visa for India",
          description: "Student visa for Indian students studying in Australia",
          processingTime: "4-6 weeks",
          financialRequirements: JSON.stringify({
            tuitionCoverage: "First year tuition",
            livingCosts: "AUD 24,505 per year",
            travelCosts: "Return airfare",
            healthInsurance: "OSHC for duration of study",
          }),
          healthRequirements: JSON.stringify(["Medical examination", "Chest X-ray"]),
          englishRequirements: JSON.stringify({
            tests: ["IELTS", "TOEFL", "PTE Academic"],
            minimumScores: { IELTS: 5.5, TOEFL: 46, PTE: 42 },
          }),
          requiredDocuments: [
            "Confirmation of Enrolment (CoE)",
            "Genuine Temporary Entrant (GTE) statement",
            "Academic transcripts",
            "English test results",
            "Police clearance",
          ],
          applicationUrl: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
          isActive: true,
        });
        console.log(`Created visa requirement for India offshore students`);

        await storage.createVisaRequirement({
          regionId: pakistan.id,
          pathwayId: offshorePathway.id,
          visaType: "Student Visa (Subclass 500)",
          visaName: "Australian Student Visa for Pakistan",
          description: "Student visa for Pakistani students studying in Australia",
          processingTime: "6-10 weeks",
          financialRequirements: JSON.stringify({
            tuitionCoverage: "First year tuition",
            livingCosts: "AUD 24,505 per year",
            travelCosts: "Return airfare",
            healthInsurance: "OSHC for duration of study",
          }),
          healthRequirements: JSON.stringify(["Medical examination", "Chest X-ray", "TB clearance", "HIV test"]),
          englishRequirements: JSON.stringify({
            tests: ["IELTS", "TOEFL", "PTE Academic"],
            minimumScores: { IELTS: 5.5, TOEFL: 46, PTE: 42 },
          }),
          requiredDocuments: [
            "Confirmation of Enrolment (CoE)",
            "Genuine Temporary Entrant (GTE) statement",
            "Academic transcripts",
            "English test results",
            "Police clearance",
            "Sponsor documents (if applicable)",
          ],
          applicationUrl: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
          notes: "Enhanced documentation requirements may apply.",
          isActive: true,
        });
        console.log(`Created visa requirement for Pakistan offshore students`);
      }
    }

    console.log("Region seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding regions:", error);
    throw error;
  }
}
