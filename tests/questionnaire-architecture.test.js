import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { db } from '../server/db.js';

// Use the application's Express app
const app = 'http://localhost:5000';

// Test data for our flexible questionnaire architecture
const testData = {
  definitions: {
    corporate: {
      versionName: 'Corporate Event Form v1.0',
      description: 'Specialized form for corporate event catering',
      isActive: true
    },
    wedding: {
      versionName: 'Wedding Catering Form v1.0',
      description: 'Specialized form for wedding catering',
      isActive: true
    }
  },
  sections: {
    contactInfo: {
      title: 'Contact Information',
      description: 'Basic contact details for all event types',
      templateKey: 'contact_info_section'
    },
    venueDetails: {
      title: 'Venue Information',
      description: 'Details about the event venue',
      templateKey: 'venue_details_section'
    }
  },
  componentTypes: {
    signaturePad: {
      typeKey: 'signature_pad',
      componentCategory: 'question',
      displayName: 'Signature Pad',
      description: 'Allows users to draw their signature',
      configSchema: {
        type: 'object',
        properties: {
          width: { type: 'number', default: 400 },
          height: { type: 'number', default: 200 },
          penColor: { type: 'string', default: '#000000' }
        }
      }
    },
    containsSubstring: {
      typeKey: 'contains_substring',
      componentCategory: 'condition',
      displayName: 'Contains Substring',
      description: 'Checks if a text field contains a specific substring',
      configSchema: {
        type: 'object',
        properties: {
          caseSensitive: { type: 'boolean', default: false }
        }
      }
    }
  }
};

// Store IDs and cookies for use across tests
const testState = {
  authCookie: null,
  sectionIds: {},
  definitionIds: {},
  pageIds: {},
  componentTypeIds: {}
};

// Helper to login
async function login() {
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      username: 'admin',
      password: 'admin123'
    });

  if (response.status === 200 && response.headers['set-cookie']) {
    testState.authCookie = response.headers['set-cookie'][0];
    return true;
  }
  
  return false;
}

describe('Flexible Questionnaire Architecture', () => {
  beforeAll(async () => {
    // Try to login before tests
    const loggedIn = await login();
    if (!loggedIn) {
      console.warn('Not logged in - tests will likely fail');
    }
  });

  afterAll(async () => {
    // Clean up created test data if needed
    // await db.end();
  });

  describe('Component Types Management', () => {
    it('should register a new question component type', async () => {
      const response = await request(app)
        .post('/api/questionnaires/builder')
        .set('Cookie', testState.authCookie)
        .send({
          action: 'registerComponentType',
          data: testData.componentTypes.signaturePad
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.componentType).toBeDefined();
      expect(response.body.componentType.typeKey).toBe('signature_pad');
      
      // Store the component type ID for later tests
      testState.componentTypeIds.signaturePad = response.body.componentType.id;
    });

    it('should register a new condition component type', async () => {
      const response = await request(app)
        .post('/api/questionnaires/builder')
        .set('Cookie', testState.authCookie)
        .send({
          action: 'registerComponentType',
          data: testData.componentTypes.containsSubstring
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.componentType).toBeDefined();
      expect(response.body.componentType.typeKey).toBe('contains_substring');
      
      // Store the component type ID for later tests
      testState.componentTypeIds.containsSubstring = response.body.componentType.id;
    });

    it('should retrieve all component types', async () => {
      const response = await request(app)
        .post('/api/questionnaires/builder')
        .set('Cookie', testState.authCookie)
        .send({
          action: 'listComponentTypes',
          data: {}
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.componentTypes)).toBe(true);
      expect(response.body.componentTypes.length).toBeGreaterThanOrEqual(2);
      
      // Verify our newly created component types are in the list
      const signaturePadType = response.body.componentTypes.find(
        type => type.typeKey === 'signature_pad'
      );
      expect(signaturePadType).toBeDefined();
      
      const containsSubstringType = response.body.componentTypes.find(
        type => type.typeKey === 'contains_substring'
      );
      expect(containsSubstringType).toBeDefined();
    });
  });

  describe('Reusable Sections Management', () => {
    it('should create a reusable contact information section', async () => {
      const response = await request(app)
        .post('/api/questionnaires/builder')
        .set('Cookie', testState.authCookie)
        .send({
          action: 'createSection',
          data: testData.sections.contactInfo
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.section).toBeDefined();
      expect(response.body.section.title).toBe('Contact Information');
      
      // Store the section ID for later tests
      testState.sectionIds.contactInfo = response.body.section.id;
    });

    it('should create a reusable venue details section', async () => {
      const response = await request(app)
        .post('/api/questionnaires/builder')
        .set('Cookie', testState.authCookie)
        .send({
          action: 'createSection',
          data: testData.sections.venueDetails
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.section).toBeDefined();
      expect(response.body.section.title).toBe('Venue Information');
      
      // Store the section ID for later tests
      testState.sectionIds.venueDetails = response.body.section.id;
    });

    it('should add questions to the contact information section', async () => {
      const response = await request(app)
        .post('/api/questionnaires/builder')
        .set('Cookie', testState.authCookie)
        .send({
          action: 'addSectionQuestions',
          data: {
            sectionId: testState.sectionIds.contactInfo,
            questions: [
              {
                questionText: 'Full Name',
                questionKey: 'contact_name',
                questionType: 'text',
                order: 1,
                isRequired: true,
                helpText: 'Please enter your full name'
              },
              {
                questionText: 'Email Address',
                questionKey: 'contact_email',
                questionType: 'email',
                order: 2,
                isRequired: true,
                helpText: 'Please enter a valid email address'
              },
              {
                questionText: 'Phone Number',
                questionKey: 'contact_phone',
                questionType: 'phone',
                order: 3,
                isRequired: true,
                helpText: 'Please enter your phone number'
              }
            ]
          }
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.questions).toBeDefined();
      expect(response.body.questions.length).toBe(3);
    });

    it('should add questions to the venue details section', async () => {
      const response = await request(app)
        .post('/api/questionnaires/builder')
        .set('Cookie', testState.authCookie)
        .send({
          action: 'addSectionQuestions',
          data: {
            sectionId: testState.sectionIds.venueDetails,
            questions: [
              {
                questionText: 'Venue Name',
                questionKey: 'venue_name',
                questionType: 'text',
                order: 1,
                isRequired: true,
                helpText: 'Please enter the name of the venue'
              },
              {
                questionText: 'Venue Address',
                questionKey: 'venue_address',
                questionType: 'address',
                order: 2,
                isRequired: true,
                helpText: 'Please enter the complete venue address'
              },
              {
                questionText: 'Venue Contact Person',
                questionKey: 'venue_contact',
                questionType: 'text',
                order: 3,
                isRequired: false,
                helpText: 'Who should we contact at the venue?'
              }
            ]
          }
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.questions).toBeDefined();
      expect(response.body.questions.length).toBe(3);
    });
  });

  describe('Questionnaire Creation and Section Reuse', () => {
    it('should create a corporate event questionnaire definition', async () => {
      const response = await request(app)
        .post('/api/questionnaires/builder')
        .set('Cookie', testState.authCookie)
        .send({
          action: 'createDefinition',
          data: testData.definitions.corporate
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.definition).toBeDefined();
      expect(response.body.definition.versionName).toBe('Corporate Event Form v1.0');
      
      // Store the definition ID for later tests
      testState.definitionIds.corporate = response.body.definition.id;
    });

    it('should create a wedding event questionnaire definition', async () => {
      const response = await request(app)
        .post('/api/questionnaires/builder')
        .set('Cookie', testState.authCookie)
        .send({
          action: 'createDefinition',
          data: testData.definitions.wedding
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.definition).toBeDefined();
      expect(response.body.definition.versionName).toBe('Wedding Catering Form v1.0');
      
      // Store the definition ID for later tests
      testState.definitionIds.wedding = response.body.definition.id;
    });

    it('should add pages to the corporate questionnaire', async () => {
      // Add contact info page
      const contactPageResponse = await request(app)
        .post('/api/questionnaires/builder')
        .set('Cookie', testState.authCookie)
        .send({
          action: 'addPage',
          data: {
            definitionId: testState.definitionIds.corporate,
            title: 'Contact Information',
            order: 1
          }
        });
      
      expect(contactPageResponse.status).toBe(201);
      expect(contactPageResponse.body.success).toBe(true);
      expect(contactPageResponse.body.page).toBeDefined();
      
      testState.pageIds.corporateContact = contactPageResponse.body.page.id;
      
      // Add venue details page
      const venuePageResponse = await request(app)
        .post('/api/questionnaires/builder')
        .set('Cookie', testState.authCookie)
        .send({
          action: 'addPage',
          data: {
            definitionId: testState.definitionIds.corporate,
            title: 'Venue Information',
            order: 2
          }
        });
      
      expect(venuePageResponse.status).toBe(201);
      expect(venuePageResponse.body.success).toBe(true);
      expect(venuePageResponse.body.page).toBeDefined();
      
      testState.pageIds.corporateVenue = venuePageResponse.body.page.id;
    });

    it('should reuse sections in the corporate questionnaire', async () => {
      // Add contact info section to the contact page
      const contactSectionResponse = await request(app)
        .post('/api/questionnaires/builder')
        .set('Cookie', testState.authCookie)
        .send({
          action: 'addSectionToPage',
          data: {
            pageId: testState.pageIds.corporateContact,
            sectionId: testState.sectionIds.contactInfo,
            sectionOrder: 1
          }
        });
      
      expect(contactSectionResponse.status).toBe(201);
      expect(contactSectionResponse.body.success).toBe(true);
      expect(contactSectionResponse.body.pageSection).toBeDefined();
      
      // Add venue details section to the venue page
      const venueSectionResponse = await request(app)
        .post('/api/questionnaires/builder')
        .set('Cookie', testState.authCookie)
        .send({
          action: 'addSectionToPage',
          data: {
            pageId: testState.pageIds.corporateVenue,
            sectionId: testState.sectionIds.venueDetails,
            sectionOrder: 1
          }
        });
      
      expect(venueSectionResponse.status).toBe(201);
      expect(venueSectionResponse.body.success).toBe(true);
      expect(venueSectionResponse.body.pageSection).toBeDefined();
    });

    it('should retrieve the full corporate questionnaire with sections', async () => {
      const response = await request(app)
        .post('/api/questionnaires/builder')
        .set('Cookie', testState.authCookie)
        .send({
          action: 'getFullQuestionnaire',
          data: {
            definitionId: testState.definitionIds.corporate
          }
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.questionnaire).toBeDefined();
      expect(response.body.questionnaire.definition).toBeDefined();
      expect(response.body.questionnaire.pages).toBeDefined();
      expect(response.body.questionnaire.pages.length).toBe(2);
      
      // Check for sections in pages
      const contactPage = response.body.questionnaire.pages.find(p => p.title === 'Contact Information');
      expect(contactPage).toBeDefined();
      expect(contactPage.sections).toBeDefined();
      expect(contactPage.sections.length).toBe(1);
      expect(contactPage.sections[0].title).toBe('Contact Information');
      
      // Check that questions are properly copied to the page
      expect(contactPage.questions).toBeDefined();
      expect(contactPage.questions.length).toBeGreaterThanOrEqual(3);
      
      // Check for the venue page
      const venuePage = response.body.questionnaire.pages.find(p => p.title === 'Venue Information');
      expect(venuePage).toBeDefined();
      expect(venuePage.sections).toBeDefined();
      expect(venuePage.sections.length).toBe(1);
      expect(venuePage.sections[0].title).toBe('Venue Information');
    });
  });
});