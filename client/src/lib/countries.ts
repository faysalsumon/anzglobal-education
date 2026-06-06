export interface Country {
  code: string;
  name: string;
  nationality: string;
}

export const COUNTRIES: Country[] = [
  { code: "AF", name: "Afghanistan", nationality: "Afghan" },
  { code: "AL", name: "Albania", nationality: "Albanian" },
  { code: "DZ", name: "Algeria", nationality: "Algerian" },
  { code: "AD", name: "Andorra", nationality: "Andorran" },
  { code: "AO", name: "Angola", nationality: "Angolan" },
  { code: "AG", name: "Antigua and Barbuda", nationality: "Antiguan" },
  { code: "AR", name: "Argentina", nationality: "Argentine" },
  { code: "AM", name: "Armenia", nationality: "Armenian" },
  { code: "AU", name: "Australia", nationality: "Australian" },
  { code: "AT", name: "Austria", nationality: "Austrian" },
  { code: "AZ", name: "Azerbaijan", nationality: "Azerbaijani" },
  { code: "BS", name: "Bahamas", nationality: "Bahamian" },
  { code: "BH", name: "Bahrain", nationality: "Bahraini" },
  { code: "BD", name: "Bangladesh", nationality: "Bangladeshi" },
  { code: "BB", name: "Barbados", nationality: "Barbadian" },
  { code: "BY", name: "Belarus", nationality: "Belarusian" },
  { code: "BE", name: "Belgium", nationality: "Belgian" },
  { code: "BZ", name: "Belize", nationality: "Belizean" },
  { code: "BJ", name: "Benin", nationality: "Beninese" },
  { code: "BT", name: "Bhutan", nationality: "Bhutanese" },
  { code: "BO", name: "Bolivia", nationality: "Bolivian" },
  { code: "BA", name: "Bosnia and Herzegovina", nationality: "Bosnian" },
  { code: "BW", name: "Botswana", nationality: "Motswana" },
  { code: "BR", name: "Brazil", nationality: "Brazilian" },
  { code: "BN", name: "Brunei", nationality: "Bruneian" },
  { code: "BG", name: "Bulgaria", nationality: "Bulgarian" },
  { code: "BF", name: "Burkina Faso", nationality: "Burkinabe" },
  { code: "BI", name: "Burundi", nationality: "Burundian" },
  { code: "CV", name: "Cabo Verde", nationality: "Cape Verdean" },
  { code: "KH", name: "Cambodia", nationality: "Cambodian" },
  { code: "CM", name: "Cameroon", nationality: "Cameroonian" },
  { code: "CA", name: "Canada", nationality: "Canadian" },
  { code: "CF", name: "Central African Republic", nationality: "Central African" },
  { code: "TD", name: "Chad", nationality: "Chadian" },
  { code: "CL", name: "Chile", nationality: "Chilean" },
  { code: "CN", name: "China", nationality: "Chinese" },
  { code: "CO", name: "Colombia", nationality: "Colombian" },
  { code: "KM", name: "Comoros", nationality: "Comorian" },
  { code: "CG", name: "Congo", nationality: "Congolese" },
  { code: "CD", name: "Congo (Democratic Republic)", nationality: "Congolese" },
  { code: "CR", name: "Costa Rica", nationality: "Costa Rican" },
  { code: "CI", name: "Côte d'Ivoire", nationality: "Ivoirian" },
  { code: "HR", name: "Croatia", nationality: "Croatian" },
  { code: "CU", name: "Cuba", nationality: "Cuban" },
  { code: "CY", name: "Cyprus", nationality: "Cypriot" },
  { code: "CZ", name: "Czech Republic", nationality: "Czech" },
  { code: "DK", name: "Denmark", nationality: "Danish" },
  { code: "DJ", name: "Djibouti", nationality: "Djiboutian" },
  { code: "DM", name: "Dominica", nationality: "Dominican" },
  { code: "DO", name: "Dominican Republic", nationality: "Dominican" },
  { code: "EC", name: "Ecuador", nationality: "Ecuadorian" },
  { code: "EG", name: "Egypt", nationality: "Egyptian" },
  { code: "SV", name: "El Salvador", nationality: "Salvadoran" },
  { code: "GQ", name: "Equatorial Guinea", nationality: "Equatorial Guinean" },
  { code: "ER", name: "Eritrea", nationality: "Eritrean" },
  { code: "EE", name: "Estonia", nationality: "Estonian" },
  { code: "SZ", name: "Eswatini", nationality: "Swazi" },
  { code: "ET", name: "Ethiopia", nationality: "Ethiopian" },
  { code: "FJ", name: "Fiji", nationality: "Fijian" },
  { code: "FI", name: "Finland", nationality: "Finnish" },
  { code: "FR", name: "France", nationality: "French" },
  { code: "GA", name: "Gabon", nationality: "Gabonese" },
  { code: "GM", name: "Gambia", nationality: "Gambian" },
  { code: "GE", name: "Georgia", nationality: "Georgian" },
  { code: "DE", name: "Germany", nationality: "German" },
  { code: "GH", name: "Ghana", nationality: "Ghanaian" },
  { code: "GR", name: "Greece", nationality: "Greek" },
  { code: "GD", name: "Grenada", nationality: "Grenadian" },
  { code: "GT", name: "Guatemala", nationality: "Guatemalan" },
  { code: "GN", name: "Guinea", nationality: "Guinean" },
  { code: "GW", name: "Guinea-Bissau", nationality: "Bissau-Guinean" },
  { code: "GY", name: "Guyana", nationality: "Guyanese" },
  { code: "HT", name: "Haiti", nationality: "Haitian" },
  { code: "HN", name: "Honduras", nationality: "Honduran" },
  { code: "HK", name: "Hong Kong", nationality: "Hong Konger" },
  { code: "HU", name: "Hungary", nationality: "Hungarian" },
  { code: "IS", name: "Iceland", nationality: "Icelandic" },
  { code: "IN", name: "India", nationality: "Indian" },
  { code: "ID", name: "Indonesia", nationality: "Indonesian" },
  { code: "IR", name: "Iran", nationality: "Iranian" },
  { code: "IQ", name: "Iraq", nationality: "Iraqi" },
  { code: "IE", name: "Ireland", nationality: "Irish" },
  { code: "IL", name: "Israel", nationality: "Israeli" },
  { code: "IT", name: "Italy", nationality: "Italian" },
  { code: "JM", name: "Jamaica", nationality: "Jamaican" },
  { code: "JP", name: "Japan", nationality: "Japanese" },
  { code: "JO", name: "Jordan", nationality: "Jordanian" },
  { code: "KZ", name: "Kazakhstan", nationality: "Kazakhstani" },
  { code: "KE", name: "Kenya", nationality: "Kenyan" },
  { code: "KI", name: "Kiribati", nationality: "I-Kiribati" },
  { code: "KP", name: "North Korea", nationality: "North Korean" },
  { code: "KR", name: "South Korea", nationality: "South Korean" },
  { code: "KW", name: "Kuwait", nationality: "Kuwaiti" },
  { code: "KG", name: "Kyrgyzstan", nationality: "Kyrgyzstani" },
  { code: "LA", name: "Laos", nationality: "Laotian" },
  { code: "LV", name: "Latvia", nationality: "Latvian" },
  { code: "LB", name: "Lebanon", nationality: "Lebanese" },
  { code: "LS", name: "Lesotho", nationality: "Mosotho" },
  { code: "LR", name: "Liberia", nationality: "Liberian" },
  { code: "LY", name: "Libya", nationality: "Libyan" },
  { code: "LI", name: "Liechtenstein", nationality: "Liechtensteiner" },
  { code: "LT", name: "Lithuania", nationality: "Lithuanian" },
  { code: "LU", name: "Luxembourg", nationality: "Luxembourgish" },
  { code: "MO", name: "Macau", nationality: "Macanese" },
  { code: "MG", name: "Madagascar", nationality: "Malagasy" },
  { code: "MW", name: "Malawi", nationality: "Malawian" },
  { code: "MY", name: "Malaysia", nationality: "Malaysian" },
  { code: "MV", name: "Maldives", nationality: "Maldivian" },
  { code: "ML", name: "Mali", nationality: "Malian" },
  { code: "MT", name: "Malta", nationality: "Maltese" },
  { code: "MH", name: "Marshall Islands", nationality: "Marshallese" },
  { code: "MR", name: "Mauritania", nationality: "Mauritanian" },
  { code: "MU", name: "Mauritius", nationality: "Mauritian" },
  { code: "MX", name: "Mexico", nationality: "Mexican" },
  { code: "FM", name: "Micronesia", nationality: "Micronesian" },
  { code: "MD", name: "Moldova", nationality: "Moldovan" },
  { code: "MC", name: "Monaco", nationality: "Monegasque" },
  { code: "MN", name: "Mongolia", nationality: "Mongolian" },
  { code: "ME", name: "Montenegro", nationality: "Montenegrin" },
  { code: "MA", name: "Morocco", nationality: "Moroccan" },
  { code: "MZ", name: "Mozambique", nationality: "Mozambican" },
  { code: "MM", name: "Myanmar", nationality: "Burmese" },
  { code: "NA", name: "Namibia", nationality: "Namibian" },
  { code: "NR", name: "Nauru", nationality: "Nauruan" },
  { code: "NP", name: "Nepal", nationality: "Nepali" },
  { code: "NL", name: "Netherlands", nationality: "Dutch" },
  { code: "NZ", name: "New Zealand", nationality: "New Zealander" },
  { code: "NI", name: "Nicaragua", nationality: "Nicaraguan" },
  { code: "NE", name: "Niger", nationality: "Nigerien" },
  { code: "NG", name: "Nigeria", nationality: "Nigerian" },
  { code: "MK", name: "North Macedonia", nationality: "Macedonian" },
  { code: "NO", name: "Norway", nationality: "Norwegian" },
  { code: "OM", name: "Oman", nationality: "Omani" },
  { code: "PK", name: "Pakistan", nationality: "Pakistani" },
  { code: "PW", name: "Palau", nationality: "Palauan" },
  { code: "PS", name: "Palestine", nationality: "Palestinian" },
  { code: "PA", name: "Panama", nationality: "Panamanian" },
  { code: "PG", name: "Papua New Guinea", nationality: "Papua New Guinean" },
  { code: "PY", name: "Paraguay", nationality: "Paraguayan" },
  { code: "PE", name: "Peru", nationality: "Peruvian" },
  { code: "PH", name: "Philippines", nationality: "Filipino" },
  { code: "PL", name: "Poland", nationality: "Polish" },
  { code: "PT", name: "Portugal", nationality: "Portuguese" },
  { code: "QA", name: "Qatar", nationality: "Qatari" },
  { code: "RO", name: "Romania", nationality: "Romanian" },
  { code: "RU", name: "Russia", nationality: "Russian" },
  { code: "RW", name: "Rwanda", nationality: "Rwandan" },
  { code: "KN", name: "Saint Kitts and Nevis", nationality: "Kittitian" },
  { code: "LC", name: "Saint Lucia", nationality: "Saint Lucian" },
  { code: "VC", name: "Saint Vincent and the Grenadines", nationality: "Vincentian" },
  { code: "WS", name: "Samoa", nationality: "Samoan" },
  { code: "SM", name: "San Marino", nationality: "Sammarinese" },
  { code: "ST", name: "Sao Tome and Principe", nationality: "Sao Tomean" },
  { code: "SA", name: "Saudi Arabia", nationality: "Saudi" },
  { code: "SN", name: "Senegal", nationality: "Senegalese" },
  { code: "RS", name: "Serbia", nationality: "Serbian" },
  { code: "SC", name: "Seychelles", nationality: "Seychellois" },
  { code: "SL", name: "Sierra Leone", nationality: "Sierra Leonean" },
  { code: "SG", name: "Singapore", nationality: "Singaporean" },
  { code: "SK", name: "Slovakia", nationality: "Slovak" },
  { code: "SI", name: "Slovenia", nationality: "Slovenian" },
  { code: "SB", name: "Solomon Islands", nationality: "Solomon Islander" },
  { code: "SO", name: "Somalia", nationality: "Somali" },
  { code: "ZA", name: "South Africa", nationality: "South African" },
  { code: "SS", name: "South Sudan", nationality: "South Sudanese" },
  { code: "ES", name: "Spain", nationality: "Spanish" },
  { code: "LK", name: "Sri Lanka", nationality: "Sri Lankan" },
  { code: "SD", name: "Sudan", nationality: "Sudanese" },
  { code: "SR", name: "Suriname", nationality: "Surinamese" },
  { code: "SE", name: "Sweden", nationality: "Swedish" },
  { code: "CH", name: "Switzerland", nationality: "Swiss" },
  { code: "SY", name: "Syria", nationality: "Syrian" },
  { code: "TW", name: "Taiwan", nationality: "Taiwanese" },
  { code: "TJ", name: "Tajikistan", nationality: "Tajikistani" },
  { code: "TZ", name: "Tanzania", nationality: "Tanzanian" },
  { code: "TH", name: "Thailand", nationality: "Thai" },
  { code: "TL", name: "Timor-Leste", nationality: "Timorese" },
  { code: "TG", name: "Togo", nationality: "Togolese" },
  { code: "TO", name: "Tonga", nationality: "Tongan" },
  { code: "TT", name: "Trinidad and Tobago", nationality: "Trinidadian" },
  { code: "TN", name: "Tunisia", nationality: "Tunisian" },
  { code: "TR", name: "Turkey", nationality: "Turkish" },
  { code: "TM", name: "Turkmenistan", nationality: "Turkmen" },
  { code: "TV", name: "Tuvalu", nationality: "Tuvaluan" },
  { code: "UG", name: "Uganda", nationality: "Ugandan" },
  { code: "UA", name: "Ukraine", nationality: "Ukrainian" },
  { code: "AE", name: "United Arab Emirates", nationality: "Emirati" },
  { code: "GB", name: "United Kingdom", nationality: "British" },
  { code: "US", name: "United States", nationality: "American" },
  { code: "UY", name: "Uruguay", nationality: "Uruguayan" },
  { code: "UZ", name: "Uzbekistan", nationality: "Uzbekistani" },
  { code: "VU", name: "Vanuatu", nationality: "Ni-Vanuatu" },
  { code: "VA", name: "Vatican City", nationality: "Vatican" },
  { code: "VE", name: "Venezuela", nationality: "Venezuelan" },
  { code: "VN", name: "Vietnam", nationality: "Vietnamese" },
  { code: "YE", name: "Yemen", nationality: "Yemeni" },
  { code: "ZM", name: "Zambia", nationality: "Zambian" },
  { code: "ZW", name: "Zimbabwe", nationality: "Zimbabwean" },
].sort((a, b) => a.name.localeCompare(b.name));

export const NATIONALITIES_SORTED = [...COUNTRIES].sort((a, b) => 
  a.nationality.localeCompare(b.nationality)
);

const COUNTRY_ALIASES: Record<string, string> = {
  "usa": "United States",
  "u.s.a.": "United States",
  "u.s.": "United States",
  "us": "United States",
  "america": "United States",
  "united states of america": "United States",
  "uk": "United Kingdom",
  "u.k.": "United Kingdom",
  "great britain": "United Kingdom",
  "britain": "United Kingdom",
  "england": "United Kingdom",
  "uae": "United Arab Emirates",
  "u.a.e.": "United Arab Emirates",
  "emirates": "United Arab Emirates",
  "drc": "Congo (Democratic Republic)",
  "dr congo": "Congo (Democratic Republic)",
  "democratic republic of congo": "Congo (Democratic Republic)",
  "democratic republic of the congo": "Congo (Democratic Republic)",
  "ivory coast": "Côte d'Ivoire",
  "cote d'ivoire": "Côte d'Ivoire",
  "cote divoire": "Côte d'Ivoire",
  "korea": "South Korea",
  "republic of korea": "South Korea",
  "rok": "South Korea",
  "dprk": "North Korea",
  "holland": "Netherlands",
  "the netherlands": "Netherlands",
  "czech": "Czech Republic",
  "czechia": "Czech Republic",
  "burma": "Myanmar",
  "persia": "Iran",
  "siam": "Thailand",
  "formosa": "Taiwan",
  "roc": "Taiwan",
  "republic of china": "Taiwan",
  "prc": "China",
  "peoples republic of china": "China",
  "people's republic of china": "China",
};

const NATIONALITY_ALIASES: Record<string, string> = {
  "american": "American",
  "us citizen": "American",
  "british": "British",
  "english": "British",
  "scottish": "British",
  "welsh": "British",
  "emirati": "Emirati",
  "uae": "Emirati",
  "congolese": "Congolese",
  "ivorian": "Ivoirian",
  "korean": "South Korean",
  "dutch": "Dutch",
  "burmese": "Burmese",
  "persian": "Iranian",
};

export function getFlagUrl(countryCode: string): string {
  return `https://flagcdn.com/w20/${countryCode.toLowerCase()}.png`;
}

export function getCountryByName(name: string): Country | undefined {
  if (!name) return undefined;
  const normalized = name.toLowerCase().trim();
  
  const aliasedName = COUNTRY_ALIASES[normalized];
  if (aliasedName) {
    return COUNTRIES.find(c => c.name === aliasedName);
  }
  
  return COUNTRIES.find(c => c.name.toLowerCase() === normalized) ||
    COUNTRIES.find(c => c.name.toLowerCase().includes(normalized)) ||
    COUNTRIES.find(c => normalized.includes(c.name.toLowerCase()));
}

export function getCountryByNationality(nationality: string): Country | undefined {
  if (!nationality) return undefined;
  const normalized = nationality.toLowerCase().trim();
  
  const aliasedNationality = NATIONALITY_ALIASES[normalized];
  if (aliasedNationality) {
    return COUNTRIES.find(c => c.nationality === aliasedNationality);
  }
  
  return COUNTRIES.find(c => c.nationality.toLowerCase() === normalized) ||
    COUNTRIES.find(c => c.nationality.toLowerCase().includes(normalized)) ||
    COUNTRIES.find(c => normalized.includes(c.nationality.toLowerCase()));
}

export function getCountryByCode(code: string): Country | undefined {
  if (!code) return undefined;
  return COUNTRIES.find(c => c.code.toLowerCase() === code.toLowerCase());
}

export const DIAL_CODES: Record<string, string> = {
  AF: "+93", AL: "+355", DZ: "+213", AD: "+376", AO: "+244",
  AG: "+1268", AR: "+54", AM: "+374", AU: "+61", AT: "+43",
  AZ: "+994", BS: "+1242", BH: "+973", BD: "+880", BB: "+1246",
  BY: "+375", BE: "+32", BZ: "+501", BJ: "+229", BT: "+975",
  BO: "+591", BA: "+387", BW: "+267", BR: "+55", BN: "+673",
  BG: "+359", BF: "+226", BI: "+257", CV: "+238", KH: "+855",
  CM: "+237", CA: "+1", CF: "+236", TD: "+235", CL: "+56",
  CN: "+86", CO: "+57", KM: "+269", CG: "+242", CD: "+243",
  CR: "+506", CI: "+225", HR: "+385", CU: "+53", CY: "+357",
  CZ: "+420", DK: "+45", DJ: "+253", DM: "+1767", DO: "+1809",
  EC: "+593", EG: "+20", SV: "+503", GQ: "+240", ER: "+291",
  EE: "+372", SZ: "+268", ET: "+251", FJ: "+679", FI: "+358",
  FR: "+33", GA: "+241", GM: "+220", GE: "+995", DE: "+49",
  GH: "+233", GR: "+30", GD: "+1473", GT: "+502", GN: "+224",
  GW: "+245", GY: "+592", HT: "+509", HN: "+504", HK: "+852",
  HU: "+36", IS: "+354", IN: "+91", ID: "+62", IR: "+98",
  IQ: "+964", IE: "+353", IL: "+972", IT: "+39", JM: "+1876",
  JP: "+81", JO: "+962", KZ: "+7", KE: "+254", KI: "+686",
  KP: "+850", KR: "+82", KW: "+965", KG: "+996", LA: "+856",
  LV: "+371", LB: "+961", LS: "+266", LR: "+231", LY: "+218",
  LI: "+423", LT: "+370", LU: "+352", MO: "+853", MG: "+261",
  MW: "+265", MY: "+60", MV: "+960", ML: "+223", MT: "+356",
  MH: "+692", MR: "+222", MU: "+230", MX: "+52", FM: "+691",
  MD: "+373", MC: "+377", MN: "+976", ME: "+382", MA: "+212",
  MZ: "+258", MM: "+95", NA: "+264", NR: "+674", NP: "+977",
  NL: "+31", NZ: "+64", NI: "+505", NE: "+227", NG: "+234",
  MK: "+389", NO: "+47", OM: "+968", PK: "+92", PW: "+680",
  PS: "+970", PA: "+507", PG: "+675", PY: "+595", PE: "+51",
  PH: "+63", PL: "+48", PT: "+351", QA: "+974", RO: "+40",
  RU: "+7", RW: "+250", KN: "+1869", LC: "+1758", VC: "+1784",
  WS: "+685", SM: "+378", ST: "+239", SA: "+966", SN: "+221",
  RS: "+381", SC: "+248", SL: "+232", SG: "+65", SK: "+421",
  SI: "+386", SB: "+677", SO: "+252", ZA: "+27", SS: "+211",
  ES: "+34", LK: "+94", SD: "+249", SR: "+597", SE: "+46",
  CH: "+41", SY: "+963", TW: "+886", TJ: "+992", TZ: "+255",
  TH: "+66", TL: "+670", TG: "+228", TO: "+676", TT: "+1868",
  TN: "+216", TR: "+90", TM: "+993", TV: "+688", UG: "+256",
  UA: "+380", AE: "+971", GB: "+44", US: "+1", UY: "+598",
  UZ: "+998", VU: "+678", VA: "+379", VE: "+58", VN: "+84",
  YE: "+967", ZM: "+260", ZW: "+263",
};

export function getDialCode(countryCode: string): string {
  return DIAL_CODES[countryCode.toUpperCase()] || "";
}

export interface CountryWithDialCode extends Country {
  dialCode: string;
}

export const COUNTRIES_WITH_DIAL_CODES: CountryWithDialCode[] = COUNTRIES.map(c => ({
  ...c,
  dialCode: DIAL_CODES[c.code] || "",
})).filter(c => c.dialCode).sort((a, b) => a.name.localeCompare(b.name));

const DIAL_CODES_SORTED = Object.entries(DIAL_CODES)
  .sort((a, b) => b[1].length - a[1].length);

export function parsePhoneNumber(phone: string): { countryCode: string; dialCode: string; number: string } {
  if (!phone) return { countryCode: "", dialCode: "", number: "" };
  
  // eslint-disable-next-line no-useless-escape
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, "");
  
  if (cleaned.startsWith("+")) {
    for (const [code, dial] of DIAL_CODES_SORTED) {
      if (cleaned.startsWith(dial)) {
        const numberPart = cleaned.slice(dial.length).replace(/\D/g, "");
        return {
          countryCode: code,
          dialCode: dial,
          number: numberPart,
        };
      }
    }
  }
  
  return { countryCode: "", dialCode: "", number: phone.replace(/\D/g, "") };
}
