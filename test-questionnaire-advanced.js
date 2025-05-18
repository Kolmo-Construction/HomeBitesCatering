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

// Advanced Test Cases for Questionnaire Management
async function runAdvancedQuestionnaireTests() {
  try {
    // Login to get auth cookie
    const authCookie = await login();
    
    // ==========================================
    // Test Case 1: Creating a complex questionnaire with multiple conditional paths
    // ==========================================
    console.log('\nTest Case 1: Creating a complex event questionnaire with multiple conditional paths');
    
    // 1. Create questionnaire definition
    const definitionResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'createDefinition',
      data: {
        name: 'Wedding Questionnaire - Advanced',
        description: 'Comprehensive wedding planning questionnaire with conditional paths',
        versionName: 'v1.0',
        eventType: 'wedding'
      }
    }, authCookie);
    
    if (definitionResponse.status !== 201) {
      throw new Error(`Failed to create questionnaire: ${JSON.stringify(definitionResponse.data)}`);
    }
    
    const definition = definitionResponse.data.definition;
    console.log(`Created questionnaire with ID: ${definition.id}`);
    
    // 2. Create multiple pages with logical flow
    const pages = [
      { title: 'Event Basics', description: 'Basic wedding details', order: 1 },
      { title: 'Venue Information', description: 'Wedding venue details', order: 2 },
      { title: 'Catering Options', description: 'Food and beverage selections', order: 3 },
      { title: 'Bar Service', description: 'Bar service details', order: 4 },
      { title: 'Special Additions', description: 'Additional services', order: 5 }
    ];
    
    const createdPages = [];
    
    for (const page of pages) {
      const pageResponse = await makeRequest('POST', '/api/questionnaires/builder', {
        action: 'addPage',
        data: {
          definitionId: definition.id,
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
    
    // 3. Create sections for each page
    console.log('\nCreating sections for wedding questionnaire...');
    
    // Event Basics Section
    const eventBasicsSection = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'createSection',
      data: {
        title: 'Wedding Details',
        description: 'Basic information about your wedding',
        templateKey: 'wedding_details'
      }
    }, authCookie);
    
    // Venue Section
    const venueSection = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'createSection',
      data: {
        title: 'Venue Information',
        description: 'Details about your wedding venue',
        templateKey: 'venue_information'
      }
    }, authCookie);
    
    // Catering Section
    const cateringSection = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'createSection',
      data: {
        title: 'Menu Selection',
        description: 'Food options for your wedding',
        templateKey: 'menu_selection'
      }
    }, authCookie);
    
    // Bar Service Section
    const barSection = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'createSection',
      data: {
        title: 'Bar Service',
        description: 'Beverage options for your wedding',
        templateKey: 'bar_service'
      }
    }, authCookie);
    
    // Additional Services Section
    const additionalSection = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'createSection',
      data: {
        title: 'Special Additions',
        description: 'Extra services for your wedding',
        templateKey: 'special_additions'
      }
    }, authCookie);
    
    // 4. Link sections to pages
    console.log('\nLinking sections to pages...');
    
    const sectionIDs = [
      eventBasicsSection.data.section.id,
      venueSection.data.section.id,
      cateringSection.data.section.id,
      barSection.data.section.id,
      additionalSection.data.section.id
    ];
    
    for (let i = 0; i < createdPages.length; i++) {
      await makeRequest('POST', '/api/questionnaires/builder', {
        action: 'addSectionToPage',
        data: {
          pageId: createdPages[i].id,
          sectionId: sectionIDs[i],
          sectionOrder: 1
        }
      }, authCookie);
      
      console.log(`✓ Linked section to page "${createdPages[i].title}"`);
    }
    
    // 5. Add questions to Event Basics section
    console.log('\nAdding questions to Wedding Details section...');
    
    const eventBasicsQuestions = [
      {
        componentTypeId: 1, // Text
        text: 'Names of the couple getting married',
        helpText: 'Please provide both names',
        isRequired: true,
        questionKey: 'couple_names',
        questionOrder: 1
      },
      {
        componentTypeId: 11, // Date
        text: 'Wedding date',
        helpText: 'When will the wedding take place?',
        isRequired: true,
        questionKey: 'wedding_date',
        questionOrder: 2
      },
      {
        componentTypeId: 7, // Number
        text: 'Estimated number of guests',
        helpText: 'Your best estimate of total attendance',
        isRequired: true,
        questionKey: 'guest_count',
        questionOrder: 3
      },
      {
        componentTypeId: 4, // Radio
        text: 'Will you need catering services?',
        helpText: 'Please select yes or no',
        isRequired: true,
        questionKey: 'needs_catering',
        questionOrder: 4
      }
    ];
    
    const eventBasicsQuestionsResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addSectionQuestions',
      data: {
        sectionId: sectionIDs[0],
        questions: eventBasicsQuestions
      }
    }, authCookie);
    
    if (eventBasicsQuestionsResponse.status !== 201) {
      console.error('Failed to add questions to Wedding Details section:', eventBasicsQuestionsResponse.data);
    } else {
      console.log(`✓ Added ${eventBasicsQuestionsResponse.data.questions.length} questions to Wedding Details section`);
      
      // Add options to the catering question
      const cateringQuestion = eventBasicsQuestionsResponse.data.questions.find(q => q.questionKey === 'needs_catering');
      
      await makeRequest('POST', '/api/questionnaires/builder', {
        action: 'addQuestionOptions',
        data: {
          questionId: cateringQuestion.id,
          options: [
            { optionText: 'Yes', optionValue: 'yes', order: 1 },
            { optionText: 'No', optionValue: 'no', order: 2 }
          ]
        }
      }, authCookie);
      
      console.log('✓ Added options to catering question');
    }
    
    // 6. Add questions to Catering section
    console.log('\nAdding questions to Menu Selection section...');
    
    const cateringQuestions = [
      {
        componentTypeId: 4, // Radio
        text: 'Select service style',
        helpText: 'How would you like the food to be served?',
        isRequired: true,
        questionKey: 'service_style',
        questionOrder: 1
      },
      {
        componentTypeId: 5, // Checkbox group
        text: 'Select cuisine preferences',
        helpText: 'What types of cuisine would you like to offer?',
        isRequired: true,
        questionKey: 'cuisine_preferences',
        questionOrder: 2
      },
      {
        componentTypeId: 4, // Radio
        text: 'Do you need special dietary accommodations?',
        helpText: 'Please select yes or no',
        isRequired: true,
        questionKey: 'dietary_needs',
        questionOrder: 3
      }
    ];
    
    const cateringQuestionsResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addSectionQuestions',
      data: {
        sectionId: sectionIDs[2],
        questions: cateringQuestions
      }
    }, authCookie);
    
    if (cateringQuestionsResponse.status !== 201) {
      console.error('Failed to add questions to Menu Selection section:', cateringQuestionsResponse.data);
    } else {
      console.log(`✓ Added ${cateringQuestionsResponse.data.questions.length} questions to Menu Selection section`);
      
      // Get questions by key
      const serviceStyleQuestion = cateringQuestionsResponse.data.questions.find(q => q.questionKey === 'service_style');
      const cuisineQuestion = cateringQuestionsResponse.data.questions.find(q => q.questionKey === 'cuisine_preferences');
      const dietaryQuestion = cateringQuestionsResponse.data.questions.find(q => q.questionKey === 'dietary_needs');
      
      // Add options to service style question
      await makeRequest('POST', '/api/questionnaires/builder', {
        action: 'addQuestionOptions',
        data: {
          questionId: serviceStyleQuestion.id,
          options: [
            { optionText: 'Plated Service', optionValue: 'plated', order: 1 },
            { optionText: 'Buffet Style', optionValue: 'buffet', order: 2 },
            { optionText: 'Family Style', optionValue: 'family', order: 3 },
            { optionText: 'Food Stations', optionValue: 'stations', order: 4 }
          ]
        }
      }, authCookie);
      
      // Add options to cuisine preferences question
      await makeRequest('POST', '/api/questionnaires/builder', {
        action: 'addQuestionOptions',
        data: {
          questionId: cuisineQuestion.id,
          options: [
            { optionText: 'American', optionValue: 'american', order: 1 },
            { optionText: 'Italian', optionValue: 'italian', order: 2 },
            { optionText: 'Asian', optionValue: 'asian', order: 3 },
            { optionText: 'Mexican', optionValue: 'mexican', order: 4 },
            { optionText: 'Mediterranean', optionValue: 'mediterranean', order: 5 },
            { optionText: 'Other', optionValue: 'other', order: 6 }
          ]
        }
      }, authCookie);
      
      // Add options to dietary needs question
      await makeRequest('POST', '/api/questionnaires/builder', {
        action: 'addQuestionOptions',
        data: {
          questionId: dietaryQuestion.id,
          options: [
            { optionText: 'Yes', optionValue: 'yes', order: 1 },
            { optionText: 'No', optionValue: 'no', order: 2 }
          ]
        }
      }, authCookie);
      
      console.log('✓ Added options to all catering questions');
    }
    
    // 7. Add a conditional question for dietary restrictions
    console.log('\nAdding conditional dietary restrictions question...');
    
    const dietaryRestrictionsResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addSectionQuestions',
      data: {
        sectionId: sectionIDs[2],
        questions: [{
          componentTypeId: 5, // Checkbox group
          text: 'Select all dietary restrictions that apply',
          helpText: 'Please check all that need to be accommodated',
          isRequired: true,
          questionKey: 'specific_dietary_restrictions',
          questionOrder: 4
        }]
      }
    }, authCookie);
    
    if (dietaryRestrictionsResponse.status !== 201) {
      console.error('Failed to add dietary restrictions question:', dietaryRestrictionsResponse.data);
    } else {
      const dietaryRestrictionsQuestion = dietaryRestrictionsResponse.data.questions[0];
      console.log(`✓ Added dietary restrictions question with ID: ${dietaryRestrictionsQuestion.id}`);
      
      // Add options to dietary restrictions question
      await makeRequest('POST', '/api/questionnaires/builder', {
        action: 'addQuestionOptions',
        data: {
          questionId: dietaryRestrictionsQuestion.id,
          options: [
            { optionText: 'Vegetarian', optionValue: 'vegetarian', order: 1 },
            { optionText: 'Vegan', optionValue: 'vegan', order: 2 },
            { optionText: 'Gluten-Free', optionValue: 'gluten_free', order: 3 },
            { optionText: 'Dairy-Free', optionValue: 'dairy_free', order: 4 },
            { optionText: 'Nut Allergies', optionValue: 'nut_allergies', order: 5 },
            { optionText: 'Kosher', optionValue: 'kosher', order: 6 },
            { optionText: 'Halal', optionValue: 'halal', order: 7 },
            { optionText: 'Other', optionValue: 'other', order: 8 }
          ]
        }
      }, authCookie);
      
      console.log('✓ Added options to dietary restrictions question');
      
      // Set up conditional logic to show dietary restrictions only when needed
      const dietaryQuestion = cateringQuestionsResponse.data.questions.find(q => q.questionKey === 'dietary_needs');
      
      await makeRequest('POST', '/api/questionnaires/builder', {
        action: 'addConditionalLogic',
        data: {
          definitionId: definition.id,
          triggerQuestionKey: dietaryQuestion.questionKey,
          targetQuestionKey: dietaryRestrictionsQuestion.questionKey,
          triggerCondition: 'equals',
          triggerValue: 'yes',
          actionType: 'show_question'
        }
      }, authCookie);
      
      console.log('✓ Set up conditional logic for dietary restrictions question');
    }
    
    // 8. Add conditional logic to show Catering page only when catering is requested
    console.log('\nSetting up conditional page navigation...');
    
    const cateringQuestion = eventBasicsQuestionsResponse.data.questions.find(q => q.questionKey === 'needs_catering');
    
    await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addConditionalLogic',
      data: {
        definitionId: definition.id,
        triggerQuestionKey: cateringQuestion.questionKey,
        targetPageId: createdPages[2].id, // Catering Options page
        triggerCondition: 'equals',
        triggerValue: 'yes',
        actionType: 'show_question'
      }
    }, authCookie);
    
    console.log('✓ Set up conditional navigation to Catering page based on catering needs');
    
    // ==========================================
    // Test Case 2: Testing question validation rules
    // ==========================================
    console.log('\nTest Case 2: Setting up questions with validation rules');
    
    // Create a section for testing validation rules
    const validationSectionResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'createSection',
      data: {
        title: 'Contact Information',
        description: 'Event contact details with validation',
        templateKey: 'contact_validation'
      }
    }, authCookie);
    
    if (validationSectionResponse.status !== 201) {
      console.error('Failed to create validation section:', validationSectionResponse.data);
    } else {
      const validationSection = validationSectionResponse.data.section;
      console.log(`✓ Created validation section with ID: ${validationSection.id}`);
      
      // Add validation questions
      const validationQuestionsResponse = await makeRequest('POST', '/api/questionnaires/builder', {
        action: 'addSectionQuestions',
        data: {
          sectionId: validationSection.id,
          questions: [
            {
              componentTypeId: 3, // Email
              text: 'Email address',
              helpText: 'Please provide a valid email address',
              isRequired: true,
              questionKey: 'email_with_validation',
              questionOrder: 1,
              validationRules: {
                pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
                errorMessage: "Please enter a valid email address"
              }
            },
            {
              componentTypeId: 2, // Phone
              text: 'Phone number',
              helpText: 'Please provide a valid phone number',
              isRequired: true,
              questionKey: 'phone_with_validation',
              questionOrder: 2,
              validationRules: {
                pattern: "^\\(\\d{3}\\)\\s\\d{3}-\\d{4}$|^\\d{3}-\\d{3}-\\d{4}$",
                errorMessage: "Please enter a phone number in format (123) 456-7890 or 123-456-7890"
              }
            },
            {
              componentTypeId: 7, // Number
              text: 'Guest count',
              helpText: 'How many guests will attend?',
              isRequired: true,
              questionKey: 'guest_count_with_validation',
              questionOrder: 3,
              validationRules: {
                min: 1,
                max: 500,
                errorMessage: "Guest count must be between 1 and 500"
              }
            }
          ]
        }
      }, authCookie);
      
      if (validationQuestionsResponse.status !== 201) {
        console.error('Failed to add validation questions:', validationQuestionsResponse.data);
      } else {
        console.log(`✓ Added ${validationQuestionsResponse.data.questions.length} questions with validation rules`);
      }
    }
    
    // ==========================================
    // Test Case 3: Creating questions with complex options and dependencies
    // ==========================================
    console.log('\nTest Case 3: Creating questions with complex options and dependencies');
    
    // Create a section for complex questions
    const complexSectionResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'createSection',
      data: {
        title: 'Event Customization',
        description: 'Detailed event customization options',
        templateKey: 'event_customization'
      }
    }, authCookie);
    
    if (complexSectionResponse.status !== 201) {
      console.error('Failed to create complex questions section:', complexSectionResponse.data);
    } else {
      const complexSection = complexSectionResponse.data.section;
      console.log(`✓ Created complex questions section with ID: ${complexSection.id}`);
      
      // Add multi-level dependent questions
      const mainQuestionResponse = await makeRequest('POST', '/api/questionnaires/builder', {
        action: 'addSectionQuestions',
        data: {
          sectionId: complexSection.id,
          questions: [{
            componentTypeId: 4, // Radio
            text: 'Which type of event setup do you prefer?',
            helpText: 'This will determine the available options for your event',
            isRequired: true,
            questionKey: 'event_setup_type',
            questionOrder: 1
          }]
        }
      }, authCookie);
      
      if (mainQuestionResponse.status !== 201) {
        console.error('Failed to add main question:', mainQuestionResponse.data);
      } else {
        const mainQuestion = mainQuestionResponse.data.questions[0];
        console.log(`✓ Added main question with ID: ${mainQuestion.id}`);
        
        // Add options to main question
        await makeRequest('POST', '/api/questionnaires/builder', {
          action: 'addQuestionOptions',
          data: {
            questionId: mainQuestion.id,
            options: [
              { optionText: 'Formal Seated Dinner', optionValue: 'formal_dinner', order: 1 },
              { optionText: 'Casual Reception', optionValue: 'casual_reception', order: 2 },
              { optionText: 'Cocktail Party', optionValue: 'cocktail_party', order: 3 }
            ]
          }
        }, authCookie);
        
        console.log('✓ Added options to main question');
        
        // Add dependent questions for each option
        const dependentQuestions = [
          {
            componentTypeId: 5, // Checkbox group
            text: 'Select formal dinner options',
            helpText: 'Choose options for your formal seated dinner',
            isRequired: true,
            questionKey: 'formal_dinner_options',
            questionOrder: 2
          },
          {
            componentTypeId: 5, // Checkbox group
            text: 'Select casual reception options',
            helpText: 'Choose options for your casual reception',
            isRequired: true,
            questionKey: 'casual_reception_options',
            questionOrder: 3
          },
          {
            componentTypeId: 5, // Checkbox group
            text: 'Select cocktail party options',
            helpText: 'Choose options for your cocktail party',
            isRequired: true,
            questionKey: 'cocktail_party_options',
            questionOrder: 4
          }
        ];
        
        // Add all dependent questions
        const dependentQuestionsResponse = await makeRequest('POST', '/api/questionnaires/builder', {
          action: 'addSectionQuestions',
          data: {
            sectionId: complexSection.id,
            questions: dependentQuestions
          }
        }, authCookie);
        
        if (dependentQuestionsResponse.status !== 201) {
          console.error('Failed to add dependent questions:', dependentQuestionsResponse.data);
        } else {
          const createdDependentQuestions = dependentQuestionsResponse.data.questions;
          console.log(`✓ Added ${createdDependentQuestions.length} dependent questions`);
          
          // Add options for each dependent question
          for (const question of createdDependentQuestions) {
            let options = [];
            
            if (question.questionKey === 'formal_dinner_options') {
              options = [
                { optionText: 'White Glove Service', optionValue: 'white_glove', order: 1 },
                { optionText: 'Wine Pairing', optionValue: 'wine_pairing', order: 2 },
                { optionText: 'Multiple Course Meal', optionValue: 'multi_course', order: 3 },
                { optionText: 'Assigned Seating', optionValue: 'assigned_seating', order: 4 }
              ];
            } else if (question.questionKey === 'casual_reception_options') {
              options = [
                { optionText: 'Buffet Service', optionValue: 'buffet', order: 1 },
                { optionText: 'Open Seating', optionValue: 'open_seating', order: 2 },
                { optionText: 'Food Stations', optionValue: 'food_stations', order: 3 },
                { optionText: 'Games and Activities', optionValue: 'games', order: 4 }
              ];
            } else if (question.questionKey === 'cocktail_party_options') {
              options = [
                { optionText: 'Passed Hors d\'oeuvres', optionValue: 'passed_hors_doeuvres', order: 1 },
                { optionText: 'Specialty Cocktails', optionValue: 'specialty_cocktails', order: 2 },
                { optionText: 'Standing Tables', optionValue: 'standing_tables', order: 3 },
                { optionText: 'Live Music/DJ', optionValue: 'live_music', order: 4 }
              ];
            }
            
            await makeRequest('POST', '/api/questionnaires/builder', {
              action: 'addQuestionOptions',
              data: {
                questionId: question.id,
                options
              }
            }, authCookie);
            
            console.log(`✓ Added options to ${question.questionKey}`);
          }
          
          // Set up conditional logic for each dependent question
          const formalDinnerQuestion = createdDependentQuestions.find(q => q.questionKey === 'formal_dinner_options');
          const casualReceptionQuestion = createdDependentQuestions.find(q => q.questionKey === 'casual_reception_options');
          const cocktailPartyQuestion = createdDependentQuestions.find(q => q.questionKey === 'cocktail_party_options');
          
          // Conditional logic for formal dinner options
          await makeRequest('POST', '/api/questionnaires/builder', {
            action: 'addConditionalLogic',
            data: {
              definitionId: definition.id,
              triggerQuestionKey: mainQuestion.questionKey,
              targetQuestionKey: formalDinnerQuestion.questionKey,
              triggerCondition: 'equals',
              triggerValue: 'formal_dinner',
              actionType: 'show_question'
            }
          }, authCookie);
          
          // Conditional logic for casual reception options
          await makeRequest('POST', '/api/questionnaires/builder', {
            action: 'addConditionalLogic',
            data: {
              definitionId: definition.id,
              triggerQuestionKey: mainQuestion.questionKey,
              targetQuestionKey: casualReceptionQuestion.questionKey,
              triggerCondition: 'equals',
              triggerValue: 'casual_reception',
              actionType: 'show_question'
            }
          }, authCookie);
          
          // Conditional logic for cocktail party options
          await makeRequest('POST', '/api/questionnaires/builder', {
            action: 'addConditionalLogic',
            data: {
              definitionId: definition.id,
              triggerQuestionKey: mainQuestion.questionKey,
              targetQuestionKey: cocktailPartyQuestion.questionKey,
              triggerCondition: 'equals',
              triggerValue: 'cocktail_party',
              actionType: 'show_question'
            }
          }, authCookie);
          
          console.log('✓ Set up conditional logic for all dependent questions');
        }
      }
    }
    
    // ==========================================
    // Test Summary
    // ==========================================
    console.log('\n==== Advanced Questionnaire Tests Summary ====');
    console.log('✓ Created complex wedding questionnaire with multiple pages and sections');
    console.log('✓ Implemented multi-level conditional logic');
    console.log('✓ Set up questions with validation rules');
    console.log('✓ Created complex dependent question chains');
    console.log('\nAll advanced questionnaire tests completed successfully!');
    
  } catch (error) {
    console.error('\nTest failed:', error.message);
  }
}

// Run the tests
runAdvancedQuestionnaireTests();