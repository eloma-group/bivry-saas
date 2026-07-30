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

export const COUNTRIES = [
  "Australia",
  "New Zealand",
  "India",
  "United Kingdom",
  "United States",
  "Canada",
  "Philippines",
  "Nepal",
  "Pakistan",
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
    requires: ["firstName", "lastName", "dob", "email", "phone", "nationality"],
  },
  {
    id: "address",
    label: "Address",
    requires: ["currentAddress"],
  },
  {
    id: "licence",
    label: "Licence",
    requires: ["licenceNumber", "licenceType", "licenceState", "licenceExpiry"],
  },
  {
    id: "documents",
    label: "Documents",
    requires: ["drivingHistoryFile", "policeFile"],
  },
  {
    id: "medical",
    label: "Medical",
    requires: ["medicalFile"],
  },
  {
    id: "review",
    label: "Review",
    requires: [],
  },
];
