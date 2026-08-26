import type { LicenceType, StepDef } from "@/types/driver";

export const LICENCE_TYPES: LicenceType[] = [
  "Car",
  "Heavy Rigid",
  "Heavy Combination",
  "Multi Combination",
  "Motorcycle",
];

export const AU_STATES = [
  "New South Wales",
  "Victoria",
  "Queensland",
  "Western Australia",
  "South Australia",
  "Tasmania",
  "Australian Capital Territory",
  "Northern Territory",
];

/** Australia first: it decides which documents the visa section asks for. */
export const COUNTRIES = [
  "Australia",
  "New Zealand",
  "India",
  "United Kingdom",
  "Ireland",
  "United States",
  "Canada",
  "Germany",
  "France",
  "Italy",
  "Spain",
  "Netherlands",
  "South Africa",
  "Brazil",
  "Argentina",
  "Mexico",
  "China",
  "Japan",
  "South Korea",
  "Singapore",
  "Malaysia",
  "Indonesia",
  "Thailand",
  "Vietnam",
  "Philippines",
  "Nepal",
  "Sri Lanka",
  "Bangladesh",
  "United Arab Emirates",
  "Fiji",
  "Other",
];

export const VISA_STATUSES = [
  "Citizen",
  "Permanent Resident",
  "Temporary Visa",
  "Student Visa",
  "Working Holiday",
  "Bridging Visa",
];

export const VISA_TYPES = [
  "Subclass 189 - Skilled Independent",
  "Subclass 482 - Skilled Work",
  "Subclass 500 - Student",
  "Subclass 417 - Working Holiday",
  "Subclass 820 - Partner",
  "Other",
];

export const ADDITIONAL_DOC_CATEGORIES = [
  "Passport",
  "Medicare",
  "Insurance",
  "Tax File",
  "Other",
];

/** Horizontal stepper definition - completion drives progress %. */
export const STEPS: StepDef[] = [
  {
    id: "personal",
    label: "Personal Info",
    requires: [
      "firstName",
      "lastName",
      "dob",
      "email",
      "phone",
      "country",
      "profilePhoto",
    ],
  },
  {
    id: "address",
    label: "Address",
    requires: ["currentAddress"],
  },
  {
    id: "licence",
    label: "Licence",
    requires: [
      "licenceNumber",
      "licenceCardNumber",
      "licenceType",
      "licenceState",
      "licenceExpiry",
      "licenceFront",
      "licenceBack",
    ],
  },
  {
    id: "documents",
    label: "Documents",
    requires: [
      "drivingHistoryFile",
      "drivingHistoryIssue",
      "policeFile",
      "policeIssue",
    ],
  },
  {
    id: "medical",
    label: "Medical",
    requires: ["medicalFile", "medicalIssue", "drugTestFile", "drugTestIssue"],
  },
  {
    id: "review",
    label: "Review",
    requires: [],
  },
];
