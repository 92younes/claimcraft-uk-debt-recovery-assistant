import { Party, PartyType } from "../types";

/**
 * Companies House API Integration
 *
 * Searches UK Companies House registry for company information and solvency status.
 *
 * Setup Instructions:
 * 1. Get FREE API key at: https://developer.company-information.service.gov.uk/
 * 2. Add to .env: VITE_COMPANIES_HOUSE_API_KEY=your_key_here
 * 3. Restart dev server
 *
 * Features:
 * - Company name, number, address lookup
 * - Solvency status (Active, Dissolved, Liquidation, etc.)
 * - SIC codes (business type)
 * - Fallback to mock data if API key not configured
 *
 * API Docs: https://developer-specs.company-information.service.gov.uk/
 * Rate Limit: 600 requests per 5 minutes
 */

const COMPANIES_HOUSE_API = 'https://api.company-information.service.gov.uk';
const API_KEY = import.meta.env.VITE_COMPANIES_HOUSE_API_KEY;

// Mock data for development/testing when API key not available
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
    solvencyStatus: "Insolvent"
  }
};

/**
 * Map Companies House status to our solvency status
 */
const mapCompanyStatus = (status: string): 'Active' | 'Insolvent' | 'Dissolved' | 'Unknown' => {
  const statusMap: Record<string, 'Active' | 'Insolvent' | 'Dissolved' | 'Unknown'> = {
    'active': 'Active',
    'dissolved': 'Dissolved',
    'liquidation': 'Insolvent',
    'receivership': 'Insolvent',
    'administration': 'Insolvent',
    'voluntary-arrangement': 'Active', // CVA companies are still trading
    'converted-closed': 'Dissolved',
    'insolvency-proceedings': 'Insolvent',
    'open': 'Active',
    'closed': 'Dissolved'
  };

  return statusMap[status.toLowerCase()] || 'Unknown';
};

/**
 * Parse Companies House address into our address format
 */
const parseAddress = (address: any): { address: string; city: string; county: string; postcode: string } => {
  const parts = [];

  if (address.premises) parts.push(address.premises);
  if (address.address_line_1) parts.push(address.address_line_1);
  if (address.address_line_2) parts.push(address.address_line_2);

  return {
    address: parts.join(', '),
    city: address.locality || '',
    county: address.region || '',
    postcode: address.postal_code || ''
  };
};

/**
 * Search Companies House for company by name or number
 */
export const searchCompaniesHouse = async (query: string): Promise<Partial<Party> | null> => {
  // If no API key, use mock data
  if (!API_KEY) {
    console.warn('⚠️ Companies House API key not configured. Using mock data. See services/companiesHouse.ts for setup instructions.');
    return searchMockData(query);
  }

  try {
    // Search endpoint - finds companies by name
    const searchUrl = `${COMPANIES_HOUSE_API}/search/companies?q=${encodeURIComponent(query)}&items_per_page=5`;

    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Basic ${btoa(API_KEY + ':')}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.error('❌ Companies House API: Invalid API key');
      } else if (response.status === 429) {
        console.error('❌ Companies House API: Rate limit exceeded (600 requests per 5 minutes)');
      }
      throw new Error(`Companies House API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.items && data.items.length > 0) {
      // Get first match
      const company = data.items[0];

      // Fetch full company profile for more details
      const profileUrl = `${COMPANIES_HOUSE_API}/company/${company.company_number}`;
      const profileResponse = await fetch(profileUrl, {
        headers: {
          'Authorization': `Basic ${btoa(API_KEY + ':')}`
        }
      });

      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        const addressData = parseAddress(profile.registered_office_address || company.address);

        return {
          type: PartyType.BUSINESS,
          name: profile.company_name || company.title,
          ...addressData,
          companyNumber: profile.company_number,
          solvencyStatus: mapCompanyStatus(profile.company_status)
        };
      } else {
        // Fallback to search result data if profile fetch fails
        const addressData = parseAddress(company.address);

        return {
          type: PartyType.BUSINESS,
          name: company.title,
          ...addressData,
          companyNumber: company.company_number,
          solvencyStatus: mapCompanyStatus(company.company_status)
        };
      }
    }

    return null;
  } catch (error) {
    console.error('❌ Companies House API error:', error);

    // Fallback to mock data on error
    console.warn('⚠️ Falling back to mock data due to API error');
    return searchMockData(query);
  }
};

/**
 * Search mock database (fallback when API unavailable)
 */
const searchMockData = async (query: string): Promise<Partial<Party> | null> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  const key = query.toLowerCase().split(' ')[0];
  const match = Object.keys(MOCK_DB).find(k => key.includes(k));

  if (match) {
    return {
      type: PartyType.BUSINESS,
      ...MOCK_DB[match]
    };
  }

  return null;
};