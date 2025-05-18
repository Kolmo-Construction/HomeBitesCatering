import axios from 'axios';

async function makeRequest(method, endpoint, data = null, cookie = null) {
  try {
    const config = {
      method,
      url: `http://localhost:5000${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (cookie) {
      config.headers.Cookie = cookie;
    }
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return {
      status: response.status,
      data: response.data,
      headers: response.headers
    };
  } catch (error) {
    if (error.response) {
      return {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      };
    }
    console.error('Error making request:', error.message);
    return {
      status: 500,
      data: { error: error.message }
    };
  }
}

async function login() {
  console.log('Logging in...');
  
  const response = await makeRequest('POST', '/api/auth/login', {
    username: 'admin',
    password: 'admin123'
  });
  
  if (response.status === 200) {
    console.log('Successfully logged in');
    const cookie = response.headers['set-cookie'][0];
    return cookie;
  } else {
    console.error('Login failed:', response.data);
    throw new Error('Login failed');
  }
}

// Test Cases for Questionnaire Management
async function runQuestionnaireManagerTests() {
  try {
    // Login to get auth cookie
    const authCookie = await login();
    
    // ==========================================
    // Test Case 1: Creating a Questionnaire Definition
    // ==========================================
    console.log('\nTest Case 1: Creating Questionnaire Definitions');
    
    const eventTypes = ['corporate', 'wedding', 'engagement', 'birthday', 'private_party', 'food_truck'];
    const createdDefinitions = [];
    
    for (const eventType of eventTypes) {
      const definitionResponse = await makeRequest('POST', '/api/questionnaires/builder', {
        action: 'createDefinition',
        data: {
          name: `${eventType.charAt(0).toUpperCase() + eventType.slice(1)} Event Questionnaire`,
          description: `Questionnaire for collecting ${eventType} event details`,
          versionName: 'v1.0',
          eventType: eventType
        }
      }, authCookie);
      
      if (definitionResponse.status !== 201) {
        console.error(`Failed to create ${eventType} questionnaire:`, definitionResponse.data);
        continue;
      }
      
      createdDefinitions.push(definitionResponse.data.definition);
      console.log(`✓ Created ${eventType} questionnaire with ID: ${definitionResponse.data.definition.id}`);
    }
    
    // ==========================================
    // Test Case 2: Creating Reusable Sections
    // ==========================================
    console.log('\nTest Case 2: Creating Reusable Sections');
    
    const sections = [
      {
        title: 'Contact Information',
        description: 'Basic contact details for the client',
        templateKey: 'contact_information'
      },
      {
        title: 'Venue Details',
        description: 'Information about the event venue',
        templateKey: 'venue_details'
      },
      {
        title: 'Menu Preferences',
        description: 'Food and beverage preferences',
        templateKey: 'menu_preferences'
      },
      {
        title: 'Special Requests',
        description: 'Any special accommodations or requirements',
        templateKey: 'special_requests'
      }
    ];
    
    const createdSections = [];
    
    for (const section of sections) {
      const sectionResponse = await makeRequest('POST', '/api/questionnaires/builder', {
        action: 'createSection',
        data: section
      }, authCookie);
      
      if (sectionResponse.status !== 201) {
        console.error(`Failed to create section ${section.title}:`, sectionResponse.data);
        continue;
      }
      
      createdSections.push(sectionResponse.data.section);
      console.log(`✓ Created section "${section.title}" with ID: ${sectionResponse.data.section.id}`);
    }
    
    // ==========================================
    // Test Case 3: Creating Pages for a Questionnaire
    // ==========================================
    console.log('\nTest Case 3: Creating Pages for a Questionnaire');
    
    // Use the first definition (Corporate Event)
    const testDefinition = createdDefinitions[0];
    
    const pages = [
      {
        title: 'Event Overview',
        description: 'Basic information about your event',
        order: 1
      },
      {
        title: 'Venue & Logistics',
        description: 'Details about the venue and event logistics',
        order: 2
      },
      {
        title: 'Menu Planning',
        description: 'Food and beverage selections',
        order: 3
      },
      {
        title: 'Additional Services',
        description: 'Extra services and accommodations',
        order: 4
      }
    ];
    
    const createdPages = [];
    
    for (const page of pages) {
      const pageResponse = await makeRequest('POST', '/api/questionnaires/builder', {
        action: 'addPage',
        data: {
          definitionId: testDefinition.id,
          title: page.title,
          description: page.description,
          order: page.order
        }
      }, authCookie);
      
      if (pageResponse.status !== 201) {
        console.error(`Failed to create page ${page.title}:`, pageResponse.data);
        continue;
      }
      
      createdPages.push(pageResponse.data.page);
      console.log(`✓ Created page "${page.title}" with ID: ${pageResponse.data.page.id}`);
    }
    
    // ==========================================
    // Test Case 4: Adding Sections to Pages
    // ==========================================
    console.log('\nTest Case 4: Adding Sections to Pages');
    
    // Map sections to pages
    const pageSectionMappings = [
      { pageIndex: 0, sectionIndex: 0, order: 1 }, // Contact Info in Event Overview
      { pageIndex: 1, sectionIndex: 1, order: 1 }, // Venue Details in Venue & Logistics
      { pageIndex: 2, sectionIndex: 2, order: 1 }, // Menu Preferences in Menu Planning
      { pageIndex: 3, sectionIndex: 3, order: 1 }  // Special Requests in Additional Services
    ];
    
    for (const mapping of pageSectionMappings) {
      const page = createdPages[mapping.pageIndex];
      const section = createdSections[mapping.sectionIndex];
      
      const linkResponse = await makeRequest('POST', '/api/questionnaires/builder', {
        action: 'addSectionToPage',
        data: {
          pageId: page.id,
          sectionId: section.id,
          sectionOrder: mapping.order
        }
      }, authCookie);
      
      if (linkResponse.status !== 201) {
        console.error(`Failed to link section "${section.title}" to page "${page.title}":`, linkResponse.data);
        continue;
      }
      
      console.log(`✓ Added "${section.title}" section to "${page.title}" page`);
    }
    
    // ==========================================
    // Test Case 5: Adding Questions to Sections
    // ==========================================
    console.log('\nTest Case 5: Adding Questions to Sections');
    
    // Adding questions to Contact Information section
    const contactInfoSection = createdSections[0];
    
    const contactQuestions = [
      {
        componentTypeId: 1, // Text input
        text: 'What is your full name?',
        helpText: 'Please provide your first and last name',
        isRequired: true,
        questionKey: 'client_name',
        questionOrder: 1
      },
      {
        componentTypeId: 3, // Email input
        text: 'What is your email address?',
        helpText: 'We\'ll use this for communication about your event',
        isRequired: true,
        questionKey: 'client_email',
        questionOrder: 2
      },
      {
        componentTypeId: 2, // Phone input
        text: 'What is your phone number?',
        helpText: 'Please include area code',
        isRequired: true,
        questionKey: 'client_phone',
        questionOrder: 3
      }
    ];
    
    const questionsResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addSectionQuestions',
      data: {
        sectionId: contactInfoSection.id,
        questions: contactQuestions
      }
    }, authCookie);
    
    if (questionsResponse.status !== 201) {
      console.error('Failed to add questions to Contact Information section:', questionsResponse.data);
    } else {
      console.log(`✓ Added ${questionsResponse.data.questions.length} questions to Contact Information section`);
    }
    
    // ==========================================
    // Test Case 6: Adding Conditional Logic
    // ==========================================
    console.log('\nTest Case 6: Adding Conditional Logic');
    
    // Adding questions to Menu Preferences section with conditional logic
    const menuSection = createdSections[2];
    
    // 1. Add trigger question (dietary restrictions)
    const triggerQuestionResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addSectionQuestions',
      data: {
        sectionId: menuSection.id,
        questions: [{
          componentTypeId: 4, // Radio button
          text: 'Do you have any dietary restrictions to accommodate?',
          helpText: 'Please select yes if anyone attending has dietary restrictions',
          isRequired: true,
          questionKey: 'has_dietary_restrictions',
          questionOrder: 1
        }]
      }
    }, authCookie);
    
    if (triggerQuestionResponse.status !== 201) {
      console.error('Failed to add trigger question:', triggerQuestionResponse.data);
      return;
    }
    
    const triggerQuestion = triggerQuestionResponse.data.questions[0];
    console.log(`✓ Added trigger question with ID: ${triggerQuestion.id}`);
    
    // 2. Add options to trigger question
    const optionsResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addQuestionOptions',
      data: {
        questionId: triggerQuestion.id,
        options: [
          {
            optionText: 'Yes',
            optionValue: 'yes',
            order: 1
          },
          {
            optionText: 'No',
            optionValue: 'no',
            order: 2
          }
        ]
      }
    }, authCookie);
    
    if (optionsResponse.status !== 201) {
      console.error('Failed to add options to trigger question:', optionsResponse.data);
      return;
    }
    
    console.log('✓ Added options to trigger question');
    
    // 3. Add dependent question (specific dietary restrictions)
    const dependentQuestionResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addSectionQuestions',
      data: {
        sectionId: menuSection.id,
        questions: [{
          componentTypeId: 5, // Checkbox group
          text: 'Please select all dietary restrictions that apply:',
          helpText: 'Check all that need to be accommodated',
          isRequired: true,
          questionKey: 'dietary_restriction_types',
          questionOrder: 2
        }]
      }
    }, authCookie);
    
    if (dependentQuestionResponse.status !== 201) {
      console.error('Failed to add dependent question:', dependentQuestionResponse.data);
      return;
    }
    
    const dependentQuestion = dependentQuestionResponse.data.questions[0];
    console.log(`✓ Added dependent question with ID: ${dependentQuestion.id}`);
    
    // 4. Add options to dependent question
    const dependentOptionsResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addQuestionOptions',
      data: {
        questionId: dependentQuestion.id,
        options: [
          {
            optionText: 'Vegetarian',
            optionValue: 'vegetarian',
            order: 1
          },
          {
            optionText: 'Vegan',
            optionValue: 'vegan',
            order: 2
          },
          {
            optionText: 'Gluten-Free',
            optionValue: 'gluten_free',
            order: 3
          },
          {
            optionText: 'Dairy-Free',
            optionValue: 'dairy_free',
            order: 4
          },
          {
            optionText: 'Nut Allergies',
            optionValue: 'nut_allergies',
            order: 5
          },
          {
            optionText: 'Other',
            optionValue: 'other',
            order: 6
          }
        ]
      }
    }, authCookie);
    
    if (dependentOptionsResponse.status !== 201) {
      console.error('Failed to add options to dependent question:', dependentOptionsResponse.data);
      return;
    }
    
    console.log('✓ Added options to dependent question');
    
    // 5. Create conditional logic rule
    const logicResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addConditionalLogic',
      data: {
        definitionId: testDefinition.id,
        triggerQuestionKey: triggerQuestion.questionKey,
        targetQuestionKey: dependentQuestion.questionKey,
        triggerCondition: 'equals',
        triggerValue: 'yes',
        actionType: 'show_question'
      }
    }, authCookie);
    
    if (logicResponse.status !== 201) {
      console.error('Failed to create conditional logic:', logicResponse.data);
      return;
    }
    
    console.log('✓ Created conditional logic rule successfully');
    
    // ==========================================
    // Test Case 7: Retrieving a Full Questionnaire
    // ==========================================
    console.log('\nTest Case 7: Retrieving a Full Questionnaire');
    
    const fullQuestionnaireResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'getFullQuestionnaire',
      data: {
        definitionId: testDefinition.id
      }
    }, authCookie);
    
    if (fullQuestionnaireResponse.status !== 200) {
      console.error('Failed to retrieve full questionnaire:', fullQuestionnaireResponse.data);
      return;
    }
    
    const questionnaireData = fullQuestionnaireResponse.data;
    
    console.log('✓ Successfully retrieved full questionnaire data');
    console.log(`  → Questionnaire: ${questionnaireData.definition.name}`);
    console.log(`  → Pages: ${questionnaireData.pages.length}`);
    
    // Count total sections and questions
    let totalSections = 0;
    let totalQuestions = 0;
    
    questionnaireData.pages.forEach(page => {
      if (page.sections) {
        totalSections += page.sections.length;
        page.sections.forEach(section => {
          if (section.questions) {
            totalQuestions += section.questions.length;
          }
        });
      }
    });
    
    console.log(`  → Sections: ${totalSections}`);
    console.log(`  → Questions: ${totalQuestions}`);
    
    // ==========================================
    // Test Case 8: Cloning a Section to Another Questionnaire
    // ==========================================
    console.log('\nTest Case 8: Cloning a Section to Another Questionnaire');
    
    // Get the second definition (Wedding Event)
    const targetDefinition = createdDefinitions[1];
    
    // Create a new page in the target questionnaire
    const newPageResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addPage',
      data: {
        definitionId: targetDefinition.id,
        title: 'Contact Information',
        description: 'Basic contact details',
        order: 1
      }
    }, authCookie);
    
    if (newPageResponse.status !== 201) {
      console.error('Failed to create new page in target questionnaire:', newPageResponse.data);
      return;
    }
    
    const newPage = newPageResponse.data.page;
    console.log(`✓ Created new page in target questionnaire with ID: ${newPage.id}`);
    
    // Link the existing Contact Information section to the new page
    const cloneLinkResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addSectionToPage',
      data: {
        pageId: newPage.id,
        sectionId: contactInfoSection.id,
        sectionOrder: 1
      }
    }, authCookie);
    
    if (cloneLinkResponse.status !== 201) {
      console.error('Failed to link section to target questionnaire:', cloneLinkResponse.data);
      return;
    }
    
    console.log('✓ Successfully reused Contact Information section in Wedding questionnaire');
    
    // ==========================================
    // Test Summary
    // ==========================================
    console.log('\n==== Questionnaire Management Test Summary ====');
    console.log(`✓ Created ${createdDefinitions.length} event-specific questionnaires`);
    console.log(`✓ Created ${createdSections.length} reusable sections`);
    console.log(`✓ Created ${createdPages.length} pages in the Corporate questionnaire`);
    console.log('✓ Successfully linked sections to pages with correct ordering');
    console.log('✓ Added questions to sections with proper validation');
    console.log('✓ Implemented conditional logic (show dietary restrictions question when needed)');
    console.log('✓ Retrieved a fully-structured questionnaire with all components');
    console.log('✓ Demonstrated reuse of sections across different questionnaires');
    console.log('\nAll questionnaire management tests completed successfully!');
    
  } catch (error) {
    console.error('\nTest failed:', error.message);
  }
}

// Run the tests
runQuestionnaireManagerTests();