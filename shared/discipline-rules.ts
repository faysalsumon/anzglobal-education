export interface DisciplineRule {
  id: string;
  name: string;
  regulatoryBody: string;
  regulatoryBodyAbbr: string;
  description: string;
  disciplines: string[];
  keywords: string[];
  countries: string[];
  englishRequirements?: {
    testType: string;
    minOverall: string;
    minListening: string;
    minReading: string;
    minWriting: string;
    minSpeaking: string;
    notes?: string;
  }[];
  qualificationRequirements?: {
    description: string;
    link?: string;
  }[];
  warnings: string[];
  links: { label: string; url: string }[];
}

export const DISCIPLINE_RULES: DisciplineRule[] = [
  {
    id: "nmba-nursing",
    name: "Nursing & Midwifery",
    regulatoryBody: "Nursing and Midwifery Board of Australia",
    regulatoryBodyAbbr: "NMBA",
    description: "Nursing and midwifery courses in Australia are regulated by NMBA with strict English language requirements for registration.",
    disciplines: ["Nursing", "Midwifery", "Health Sciences"],
    keywords: ["nursing", "nurse", "midwife", "midwifery", "registered nurse", "enrolled nurse", "bachelor of nursing"],
    countries: ["Australia"],
    englishRequirements: [
      {
        testType: "IELTS Academic",
        minOverall: "7.0",
        minListening: "7.0",
        minReading: "7.0",
        minWriting: "7.0",
        minSpeaking: "7.0",
        notes: "All bands must be 7.0 or above. Results valid for 24 months."
      },
      {
        testType: "PTE Academic",
        minOverall: "65",
        minListening: "65",
        minReading: "65",
        minWriting: "65",
        minSpeaking: "65",
        notes: "All communicative skills must be 65 or above. Results valid for 24 months."
      },
      {
        testType: "TOEFL iBT",
        minOverall: "94",
        minListening: "24",
        minReading: "24",
        minWriting: "27",
        minSpeaking: "23",
        notes: "Results valid for 24 months."
      },
      {
        testType: "OET",
        minOverall: "B",
        minListening: "B",
        minReading: "B",
        minWriting: "B",
        minSpeaking: "B",
        notes: "Grade B or above in all four components. Results valid for 24 months."
      }
    ],
    warnings: [
      "NMBA registration requires English proficiency proof before practice",
      "International students must meet English requirements for both university admission AND NMBA registration",
      "Combined test results from multiple sittings may be accepted under specific conditions"
    ],
    links: [
      { label: "NMBA English Requirements", url: "https://www.nursingmidwiferyboard.gov.au/registration-standards/english-language-skills.aspx" },
      { label: "NMBA Registration", url: "https://www.nursingmidwiferyboard.gov.au/Registration-and-Endorsement.aspx" }
    ]
  },
  {
    id: "engineers-australia",
    name: "Engineering",
    regulatoryBody: "Engineers Australia",
    regulatoryBodyAbbr: "EA",
    description: "Engineering courses should be accredited by Engineers Australia for graduates to be eligible for membership and skilled migration pathways.",
    disciplines: ["Engineering", "Technology"],
    keywords: ["engineering", "engineer", "civil engineering", "mechanical engineering", "electrical engineering", "software engineering", "chemical engineering", "aerospace engineering", "biomedical engineering", "environmental engineering", "mining engineering", "petroleum engineering"],
    countries: ["Australia"],
    englishRequirements: [
      {
        testType: "IELTS Academic",
        minOverall: "6.0",
        minListening: "6.0",
        minReading: "6.0",
        minWriting: "6.0",
        minSpeaking: "6.0",
        notes: "For Competent English level (migration). Higher scores may be required for some employers."
      },
      {
        testType: "PTE Academic",
        minOverall: "50",
        minListening: "50",
        minReading: "50",
        minWriting: "50",
        minSpeaking: "50",
        notes: "For Competent English level (migration)."
      }
    ],
    qualificationRequirements: [
      {
        description: "Washington Accord accredited programs allow direct pathway to Professional Engineer membership",
        link: "https://www.engineersaustralia.org.au/about-us/accords"
      },
      {
        description: "Non-accredited qualifications require skills assessment through CDR (Competency Demonstration Report)",
        link: "https://www.engineersaustralia.org.au/For-Migrants/Migration-Skills-Assessment"
      }
    ],
    warnings: [
      "Verify course is accredited by Engineers Australia for direct membership pathway",
      "Non-accredited courses require additional skills assessment for migration",
      "Professional Year program available for engineering graduates (485 visa holders)"
    ],
    links: [
      { label: "EA Accredited Programs", url: "https://www.engineersaustralia.org.au/About-Us/Accreditation" },
      { label: "EA Migration Assessment", url: "https://www.engineersaustralia.org.au/For-Migrants" }
    ]
  },
  {
    id: "medical-board",
    name: "Medicine",
    regulatoryBody: "Medical Board of Australia",
    regulatoryBodyAbbr: "MBA",
    description: "Medical courses require AMC (Australian Medical Council) accreditation and registration with the Medical Board of Australia.",
    disciplines: ["Medicine", "Health Sciences"],
    keywords: ["medicine", "medical", "doctor", "physician", "mbbs", "md", "bachelor of medicine"],
    countries: ["Australia"],
    englishRequirements: [
      {
        testType: "IELTS Academic",
        minOverall: "7.0",
        minListening: "7.0",
        minReading: "7.0",
        minWriting: "7.0",
        minSpeaking: "7.0",
        notes: "All bands must be 7.0 or above for medical registration."
      },
      {
        testType: "OET",
        minOverall: "B",
        minListening: "B",
        minReading: "B",
        minWriting: "B",
        minSpeaking: "B",
        notes: "Grade B or above in all four components."
      }
    ],
    warnings: [
      "Medical courses are highly competitive with limited international student places",
      "Clinical placements may have additional English requirements",
      "International Medical Graduates (IMGs) pathway different from local graduates"
    ],
    links: [
      { label: "Medical Board Registration", url: "https://www.medicalboard.gov.au/Registration.aspx" },
      { label: "AMC Accreditation", url: "https://www.amc.org.au/" }
    ]
  },
  {
    id: "legal-admission",
    name: "Law",
    regulatoryBody: "Legal Admissions Board",
    regulatoryBodyAbbr: "LAB",
    description: "Law courses must be accredited for admission to practice. Each state has different admission requirements.",
    disciplines: ["Law", "Legal Studies"],
    keywords: ["law", "legal", "llb", "juris doctor", "bachelor of laws", "lawyer", "solicitor", "barrister"],
    countries: ["Australia"],
    qualificationRequirements: [
      {
        description: "Course must cover Priestley 11 core areas for admission to practice",
        link: "https://www.lawadmissions.vic.gov.au/admission-requirements/academic-requirements"
      },
      {
        description: "Practical Legal Training (PLT) required after LLB/JD for admission"
      }
    ],
    warnings: [
      "Law admission requirements vary by state - check specific state admission board",
      "Practical Legal Training (PLT) required in addition to degree",
      "International students may face additional character requirements for admission"
    ],
    links: [
      { label: "Victorian Legal Admissions", url: "https://www.lawadmissions.vic.gov.au/" },
      { label: "NSW Legal Profession Board", url: "https://www.lpab.justice.nsw.gov.au/" }
    ]
  },
  {
    id: "teaching-registration",
    name: "Teaching",
    regulatoryBody: "Australian Institute for Teaching and School Leadership",
    regulatoryBodyAbbr: "AITSL",
    description: "Teaching courses must be accredited by AITSL. State teacher registration authorities have specific requirements.",
    disciplines: ["Education", "Teaching"],
    keywords: ["teaching", "teacher", "education", "bachelor of education", "master of teaching", "primary teaching", "secondary teaching", "early childhood"],
    countries: ["Australia"],
    englishRequirements: [
      {
        testType: "IELTS Academic",
        minOverall: "7.5",
        minListening: "8.0",
        minReading: "7.0",
        minWriting: "7.0",
        minSpeaking: "8.0",
        notes: "Required for teacher registration in most states."
      },
      {
        testType: "PTE Academic",
        minOverall: "65",
        minListening: "65",
        minReading: "65",
        minWriting: "65",
        minSpeaking: "65",
        notes: "Check specific state requirements."
      }
    ],
    warnings: [
      "Teacher registration requirements vary by state",
      "Working With Children Check required for placements",
      "Higher English requirements for teaching than many other professions"
    ],
    links: [
      { label: "AITSL Standards", url: "https://www.aitsl.edu.au/teach/standards" },
      { label: "NSW Teacher Registration", url: "https://educationstandards.nsw.edu.au/wps/portal/nesa/teacher-accreditation" }
    ]
  },
  {
    id: "pharmacy-board",
    name: "Pharmacy",
    regulatoryBody: "Pharmacy Board of Australia",
    regulatoryBodyAbbr: "PBA",
    description: "Pharmacy courses must be accredited for registration. Graduates must complete an internship year.",
    disciplines: ["Pharmacy", "Health Sciences"],
    keywords: ["pharmacy", "pharmacist", "bachelor of pharmacy", "pharmaceutical"],
    countries: ["Australia"],
    englishRequirements: [
      {
        testType: "IELTS Academic",
        minOverall: "7.5",
        minListening: "7.0",
        minReading: "7.0",
        minWriting: "7.0",
        minSpeaking: "7.0",
        notes: "Overall 7.5 with no band less than 7.0."
      },
      {
        testType: "PTE Academic",
        minOverall: "65",
        minListening: "58",
        minReading: "58",
        minWriting: "58",
        minSpeaking: "58",
        notes: "Overall 65 with no score below 58."
      }
    ],
    warnings: [
      "Intern year required after graduation for full registration",
      "Registration exam (KAPS) required for overseas-trained pharmacists",
      "English requirements are among the highest for health professions"
    ],
    links: [
      { label: "Pharmacy Board Registration", url: "https://www.pharmacyboard.gov.au/Registration.aspx" },
      { label: "APC Accreditation", url: "https://www.pharmacycouncil.org.au/" }
    ]
  },
  {
    id: "accounting-cpa",
    name: "Accounting",
    regulatoryBody: "CPA Australia / CA ANZ / IPA",
    regulatoryBodyAbbr: "CPA/CA/IPA",
    description: "Accounting courses should be accredited by professional bodies for membership pathways.",
    disciplines: ["Accounting", "Business", "Commerce"],
    keywords: ["accounting", "accountant", "cpa", "chartered accountant", "bachelor of accounting", "master of accounting"],
    countries: ["Australia"],
    qualificationRequirements: [
      {
        description: "Course should cover core knowledge areas for CPA/CA membership",
        link: "https://www.cpaaustralia.com.au/become-a-cpa/study-requirements"
      }
    ],
    warnings: [
      "Check if course is accredited by CPA Australia, CA ANZ, or IPA",
      "Professional year program available for accounting graduates",
      "Migration skills assessment through relevant professional body"
    ],
    links: [
      { label: "CPA Australia", url: "https://www.cpaaustralia.com.au/" },
      { label: "CA ANZ", url: "https://www.charteredaccountantsanz.com/" },
      { label: "IPA", url: "https://www.publicaccountants.org.au/" }
    ]
  },
  {
    id: "architecture-board",
    name: "Architecture",
    regulatoryBody: "Architects Accreditation Council of Australia",
    regulatoryBodyAbbr: "AACA",
    description: "Architecture courses must be accredited by AACA for registration as an architect.",
    disciplines: ["Architecture", "Design"],
    keywords: ["architecture", "architect", "bachelor of architecture", "master of architecture"],
    countries: ["Australia"],
    qualificationRequirements: [
      {
        description: "Five-year accredited degree (3+2 or 5-year integrated) required",
        link: "https://www.aaca.org.au/accredited-courses/"
      },
      {
        description: "Architectural Practice Examination (APE) required after work experience"
      }
    ],
    warnings: [
      "Architecture registration requires accredited degree plus work experience plus APE",
      "Minimum 2 years practical experience required before registration",
      "State-based registration required to use title 'Architect'"
    ],
    links: [
      { label: "AACA Accredited Courses", url: "https://www.aaca.org.au/accredited-courses/" },
      { label: "Architects Registration", url: "https://www.aaca.org.au/" }
    ]
  }
];

export function detectDisciplineRules(
  courseName: string,
  discipline: string | null | undefined,
  institutionCountry: string | null | undefined
): DisciplineRule[] {
  if (!institutionCountry) return [];
  
  const matchedRules: DisciplineRule[] = [];
  const courseNameLower = (courseName || "").toLowerCase();
  const disciplineLower = (discipline || "").toLowerCase();
  
  for (const rule of DISCIPLINE_RULES) {
    if (!rule.countries.some(c => c.toLowerCase() === institutionCountry.toLowerCase())) {
      continue;
    }
    
    const keywordMatch = rule.keywords.some(kw => 
      courseNameLower.includes(kw.toLowerCase()) || disciplineLower.includes(kw.toLowerCase())
    );
    
    const disciplineMatch = rule.disciplines.some(d => 
      disciplineLower.includes(d.toLowerCase())
    );
    
    if (keywordMatch || disciplineMatch) {
      matchedRules.push(rule);
    }
  }
  
  return matchedRules;
}

export function getRuleById(ruleId: string): DisciplineRule | undefined {
  return DISCIPLINE_RULES.find(r => r.id === ruleId);
}
