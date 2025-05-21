import { FormStep } from "./types";

// Form steps definition with explanatory comments
export const steps: FormStep[] = [
  "eventType", 
  "basicInfo", 
  "eventDetails", 
  "menuSelection", // Keep menuSelection as step 4 (for regular themes)
  "appetizerQuestion", // New step to ask if user wants appetizers
  "appetizers",    // Only show if user wants appetizers
  "desserts", 
  "beverages",
  "equipment",
  "review"
];