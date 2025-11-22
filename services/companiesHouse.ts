import { Party, PartyType } from "../types";

// Simulation of the Companies House API
// Real implementation would use: https://api.company-information.service.gov.uk/

const MOCK_DB: Record<string, Partial<Party>> = {
  "acme": {
    name: "Acme Services Ltd",
    address: "12 Industrial Estate",
    city: "Birmingham",
    county: "West Midlands",
    postcode: "B1 1AA",
    companyNumber: "01234567",
    solvencyStatus: "Active"
  },
  "quantum": {
    name: "Quantum Dynamics Ltd",
    address: "Unit 4, Innovation Park",
    city: "Cambridge",
    county: "Cambridgeshire",
    postcode: "CB4 0WS",
    companyNumber: "09876543",
    solvencyStatus: "Active"
  },
  "buildright": {
    name: "BuildRight Construction PLC",
    address: "The Shard, 32 London Bridge St",
    city: "London",
    county: "Greater London",
    postcode: "SE1 9SG",
    companyNumber: "11223344",
    solvencyStatus: "Insolvent" // Example of bad debt
  }
};

export const searchCompaniesHouse = async (query: string): Promise<Partial<Party> | null> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  const key = query.toLowerCase().split(' ')[0]; // Simple fuzzy match
  
  // Check if key exists in mock DB
  const match = Object.keys(MOCK_DB).find(k => key.includes(k));
  
  if (match) {
    return {
        type: PartyType.BUSINESS,
        ...MOCK_DB[match]
    };
  }

  return null;
};