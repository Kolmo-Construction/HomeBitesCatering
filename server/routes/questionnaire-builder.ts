import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import {
  questionnaireDefinitions,
  questionnairePages,
  questionnaireQuestions,
  questionnaireQuestionOptions,
  questionnaireConditionalLogic
} from '../../shared/schema';
import { 
  questionnaireComponentTypes,
  insertQuestionnaireComponentType
} from '../../shared/schema-component-types';
import {
  questionnaireSections,
  questionnairePageSections,
  questionnaireSectionQuestions,
  insertQuestionnaireSection,
  insertQuestionnairePageSection,
  insertQuestionnaireSectionQuestion
} from '../../shared/schema-sections';

// Validation schema for the builder API
export const formBuilderSchema = z.object({
  action: z.enum([
    'createDefinition',
    'addPage',
    'addQuestions',
    'updatePage',
    'updateQuestion',
    'deletePage',
    'deleteQuestion',
    'addConditionalLogic',
    'updateConditionalLogic',
    'deleteConditionalLogic',
    'getFullQuestionnaire',
    'createSection',
    'addSectionQuestions',
    'updateSection',
    'deleteSection',
    'addSectionToPage',
    'removeSectionFromPage',
    'registerComponentType',
    'listComponentTypes',
    'addQuestionOptions',
    'deleteQuestionOption'
  ]),
  data: z.record(z.any())
});

// Main handler function for the builder API
export async function handleBuilderApiRequest(req: Request, res: Response) {
  try {
    console.log('Form Builder API received request with action:', req.body.action);
    
    // Validate the request structure
    const { action, data } = formBuilderSchema.parse(req.body);
    
    // Process based on the action parameter
    switch (action) {
      case 'createDefinition': {
        return await handleCreateDefinition(data, res);
      }
      
      case 'addPage': {
        return await handleAddPage(data, res);
      }
      
      case 'addQuestions': {
        return await handleAddQuestions(data, res);
      }
      
      case 'createSection': {
        return await handleCreateSection(data, res);
      }
      
      case 'addSectionQuestions': {
        return await handleAddSectionQuestions(data, res);
      }
      
      case 'addSectionToPage': {
        return await handleAddSectionToPage(data, res);
      }
      
      case 'registerComponentType': {
        return await handleRegisterComponentType(data, res);
      }
      
      case 'listComponentTypes': {
        return await handleListComponentTypes(data, res);
      }
      
      case 'getFullQuestionnaire': {
        return await handleGetFullQuestionnaire(data, res);
      }
      
      default:
        return res.status(400).json({
          success: false,
          message: `Unknown action: ${action}. Please check the documentation for supported actions.`
        });
    }
  } catch (error) {
    console.error('Error in form builder API:', error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error processing form builder request',
      error: error.message
    });
  }
}

// Handler functions for each action

async function handleCreateDefinition(data, res) {
  // Create a new questionnaire definition
  const definitionData = {
    versionName: data.versionName,
    description: data.description || null,
    isActive: data.isActive !== undefined ? data.isActive : false
  };
  
  const [definition] = await db.insert(questionnaireDefinitions)
    .values(definitionData)
    .returning();
  
  return res.status(201).json({
    success: true,
    message: 'Questionnaire definition created successfully',
    definition
  });
}

async function handleAddPage(data, res) {
  // Validate required fields
  if (!data.definitionId) {
    return res.status(400).json({
      success: false,
      message: 'definitionId is required'
    });
  }
  
  // Check if definition exists
  const [definition] = await db.select()
    .from(questionnaireDefinitions)
    .where(eq(questionnaireDefinitions.id, data.definitionId));
  
  if (!definition) {
    return res.status(404).json({
      success: false,
      message: 'Questionnaire definition not found'
    });
  }
  
  // Create a new page
  const pageData = {
    definitionId: data.definitionId,
    title: data.title,
    order: data.order || 1
  };
  
  const [page] = await db.insert(questionnairePages)
    .values(pageData)
    .returning();
  
  return res.status(201).json({
    success: true,
    message: 'Page added successfully',
    page
  });
}

async function handleAddQuestions(data, res) {
  // Validate required fields
  if (!data.pageId) {
    return res.status(400).json({
      success: false,
      message: 'pageId is required'
    });
  }
  
  if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'questions array is required and must not be empty'
    });
  }
  
  // Check if page exists
  const [page] = await db.select()
    .from(questionnairePages)
    .where(eq(questionnairePages.id, data.pageId));
  
  if (!page) {
    return res.status(404).json({
      success: false,
      message: 'Page not found'
    });
  }
  
  // Add questions
  const questionPromises = data.questions.map(async (question) => {
    const questionData = {
      pageId: data.pageId,
      questionText: question.questionText,
      questionKey: question.questionKey,
      questionType: question.questionType,
      order: question.order || 1,
      isRequired: question.isRequired !== undefined ? question.isRequired : false,
      placeholderText: question.placeholderText || null,
      helpText: question.helpText || null,
      validationRules: question.validationRules || null
    };
    
    const [insertedQuestion] = await db.insert(questionnaireQuestions)
      .values(questionData)
      .returning();
    
    // If the question has options, add them
    if (question.options && Array.isArray(question.options) && question.options.length > 0) {
      const optionPromises = question.options.map(async (option, index) => {
        const optionData = {
          questionId: insertedQuestion.id,
          optionText: option.optionText,
          optionValue: option.optionValue || option.optionText.toLowerCase().replace(/\s+/g, '_'),
          order: option.order || index + 1,
          defaultSelectionIndicator: option.defaultSelectionIndicator || null,
          relatedMenuItemId: option.relatedMenuItemId || null
        };
        
        const [insertedOption] = await db.insert(questionnaireQuestionOptions)
          .values(optionData)
          .returning();
        
        return insertedOption;
      });
      
      const options = await Promise.all(optionPromises);
      return { ...insertedQuestion, options };
    }
    
    return insertedQuestion;
  });
  
  const questions = await Promise.all(questionPromises);
  
  return res.status(201).json({
    success: true,
    message: 'Questions added successfully',
    questions
  });
}

async function handleCreateSection(data, res) {
  // Validate required fields
  if (!data.title || !data.templateKey) {
    return res.status(400).json({
      success: false,
      message: 'title and templateKey are required'
    });
  }
  
  // Create a new section
  const sectionData = insertQuestionnaireSection.parse({
    title: data.title,
    description: data.description || null,
    templateKey: data.templateKey
  });
  
  const [section] = await db.insert(questionnaireSections)
    .values(sectionData)
    .returning();
  
  return res.status(201).json({
    success: true,
    message: 'Section created successfully',
    section
  });
}

async function handleAddSectionQuestions(data, res) {
  // Validate required fields
  if (!data.sectionId) {
    return res.status(400).json({
      success: false,
      message: 'sectionId is required'
    });
  }
  
  if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'questions array is required and must not be empty'
    });
  }
  
  // Check if section exists
  const [section] = await db.select()
    .from(questionnaireSections)
    .where(eq(questionnaireSections.id, data.sectionId));
  
  if (!section) {
    return res.status(404).json({
      success: false,
      message: 'Section not found'
    });
  }
  
  // Create questions for the section template
  // These are standalone questions not tied to a specific page yet
  const questionPromises = data.questions.map(async (question) => {
    const questionData = {
      pageId: null, // These questions aren't tied to a page yet
      questionText: question.questionText,
      questionKey: question.questionKey,
      questionType: question.questionType,
      order: question.order || 1,
      isRequired: question.isRequired !== undefined ? question.isRequired : false,
      placeholderText: question.placeholderText || null,
      helpText: question.helpText || null,
      validationRules: question.validationRules || null
    };
    
    const [insertedQuestion] = await db.insert(questionnaireQuestions)
      .values(questionData)
      .returning();
    
    // Add association between question and section
    const sectionQuestionData = insertQuestionnaireSectionQuestion.parse({
      sectionId: data.sectionId,
      questionId: insertedQuestion.id,
      questionOrder: question.order || 1
    });
    
    await db.insert(questionnaireSectionQuestions)
      .values(sectionQuestionData);
    
    // If the question has options, add them
    if (question.options && Array.isArray(question.options) && question.options.length > 0) {
      const optionPromises = question.options.map(async (option, index) => {
        const optionData = {
          questionId: insertedQuestion.id,
          optionText: option.optionText,
          optionValue: option.optionValue || option.optionText.toLowerCase().replace(/\s+/g, '_'),
          order: option.order || index + 1,
          defaultSelectionIndicator: option.defaultSelectionIndicator || null,
          relatedMenuItemId: option.relatedMenuItemId || null
        };
        
        const [insertedOption] = await db.insert(questionnaireQuestionOptions)
          .values(optionData)
          .returning();
        
        return insertedOption;
      });
      
      const options = await Promise.all(optionPromises);
      return { ...insertedQuestion, options };
    }
    
    return insertedQuestion;
  });
  
  const questions = await Promise.all(questionPromises);
  
  return res.status(201).json({
    success: true,
    message: 'Section questions added successfully',
    questions
  });
}

async function handleAddSectionToPage(data, res) {
  // Validate required fields
  if (!data.pageId || !data.sectionId) {
    return res.status(400).json({
      success: false,
      message: 'pageId and sectionId are required'
    });
  }
  
  // Check if page and section exist
  const [page] = await db.select()
    .from(questionnairePages)
    .where(eq(questionnairePages.id, data.pageId));
  
  if (!page) {
    return res.status(404).json({
      success: false,
      message: 'Page not found'
    });
  }
  
  const [section] = await db.select()
    .from(questionnaireSections)
    .where(eq(questionnaireSections.id, data.sectionId));
  
  if (!section) {
    return res.status(404).json({
      success: false,
      message: 'Section not found'
    });
  }
  
  // Add section to page
  const pageSectionData = insertQuestionnairePageSection.parse({
    pageId: data.pageId,
    sectionId: data.sectionId,
    sectionOrder: data.sectionOrder || 1
  });
  
  const [pageSection] = await db.insert(questionnairePageSections)
    .values(pageSectionData)
    .returning();
  
  // Get questions for this section
  const sectionQuestions = await db.select()
    .from(questionnaireSectionQuestions)
    .where(eq(questionnaireSectionQuestions.sectionId, data.sectionId))
    .orderBy(questionnaireSectionQuestions.questionOrder);
  
  // For each section question, create a page-specific copy
  for (const sectionQuestion of sectionQuestions) {
    // Get the template question details
    const [templateQuestion] = await db.select()
      .from(questionnaireQuestions)
      .where(eq(questionnaireQuestions.id, sectionQuestion.questionId));
    
    if (templateQuestion) {
      // Create a copy of the question for this page
      const pageQuestionData = {
        pageId: data.pageId,
        questionText: templateQuestion.questionText,
        questionKey: templateQuestion.questionKey,
        questionType: templateQuestion.questionType,
        order: templateQuestion.order,
        isRequired: templateQuestion.isRequired,
        placeholderText: templateQuestion.placeholderText,
        helpText: templateQuestion.helpText,
        validationRules: templateQuestion.validationRules
      };
      
      const [pageQuestion] = await db.insert(questionnaireQuestions)
        .values(pageQuestionData)
        .returning();
      
      // Copy any options if the question has them
      const templateOptions = await db.select()
        .from(questionnaireQuestionOptions)
        .where(eq(questionnaireQuestionOptions.questionId, templateQuestion.id))
        .orderBy(questionnaireQuestionOptions.order);
      
      if (templateOptions.length > 0) {
        for (const option of templateOptions) {
          await db.insert(questionnaireQuestionOptions)
            .values({
              questionId: pageQuestion.id,
              optionText: option.optionText,
              optionValue: option.optionValue,
              order: option.order,
              defaultSelectionIndicator: option.defaultSelectionIndicator,
              relatedMenuItemId: option.relatedMenuItemId
            });
        }
      }
    }
  }
  
  return res.status(201).json({
    success: true,
    message: 'Section added to page successfully',
    pageSection
  });
}

async function handleRegisterComponentType(data, res) {
  // Validate required fields
  if (!data.typeKey || !data.componentCategory || !data.displayName) {
    return res.status(400).json({
      success: false,
      message: 'typeKey, componentCategory, and displayName are required'
    });
  }
  
  // Check if component type already exists
  const [existingType] = await db.select()
    .from(questionnaireComponentTypes)
    .where(eq(questionnaireComponentTypes.typeKey, data.typeKey));
  
  if (existingType) {
    return res.status(409).json({
      success: false,
      message: `Component type with key '${data.typeKey}' already exists`
    });
  }
  
  // Create a new component type
  const componentTypeData = insertQuestionnaireComponentType.parse({
    typeKey: data.typeKey,
    componentCategory: data.componentCategory,
    displayName: data.displayName,
    description: data.description || null,
    configSchema: data.configSchema || null,
    isActive: data.isActive !== undefined ? data.isActive : true
  });
  
  const [componentType] = await db.insert(questionnaireComponentTypes)
    .values(componentTypeData)
    .returning();
  
  return res.status(201).json({
    success: true,
    message: 'Component type registered successfully',
    componentType
  });
}

async function handleListComponentTypes(data, res) {
  // Filter by category if provided
  let query = db.select().from(questionnaireComponentTypes);
  
  if (data.category) {
    query = query.where(eq(questionnaireComponentTypes.componentCategory, data.category));
  }
  
  // Only return active types by default
  if (data.includeInactive !== true) {
    query = query.where(eq(questionnaireComponentTypes.isActive, true));
  }
  
  const componentTypes = await query.orderBy(questionnaireComponentTypes.displayName);
  
  return res.status(200).json({
    success: true,
    componentTypes
  });
}

async function handleGetFullQuestionnaire(data, res) {
  // Validate required fields
  if (!data.definitionId) {
    return res.status(400).json({
      success: false,
      message: 'definitionId is required'
    });
  }
  
  // Get questionnaire definition
  const [definition] = await db.select()
    .from(questionnaireDefinitions)
    .where(eq(questionnaireDefinitions.id, data.definitionId));
  
  if (!definition) {
    return res.status(404).json({
      success: false,
      message: 'Questionnaire definition not found'
    });
  }
  
  // Get pages for this definition
  const pages = await db.select()
    .from(questionnairePages)
    .where(eq(questionnairePages.definitionId, data.definitionId))
    .orderBy(questionnairePages.order);
  
  // For each page, get its sections and questions
  const pagesWithSectionsAndQuestions = [];
  
  for (const page of pages) {
    // Get sections for this page
    const pageSections = await db.select()
      .from(questionnairePageSections)
      .where(eq(questionnairePageSections.pageId, page.id))
      .orderBy(questionnairePageSections.sectionOrder);
    
    const sectionsWithDetails = [];
    
    for (const pageSection of pageSections) {
      // Get section details
      const [section] = await db.select()
        .from(questionnaireSections)
        .where(eq(questionnaireSections.id, pageSection.sectionId));
      
      if (section) {
        sectionsWithDetails.push({
          ...section,
          sectionOrder: pageSection.sectionOrder
        });
      }
    }
    
    // Get direct questions for this page (not part of a section)
    const questions = await db.select()
      .from(questionnaireQuestions)
      .where(eq(questionnaireQuestions.pageId, page.id))
      .orderBy(questionnaireQuestions.order);
    
    // For each question, get its options if applicable
    const questionsWithOptions = [];
    
    for (const question of questions) {
      if (
        question.questionType === 'select' || 
        question.questionType === 'radio' || 
        question.questionType === 'checkbox_group' ||
        question.questionType === 'checkbox'
      ) {
        const options = await db.select()
          .from(questionnaireQuestionOptions)
          .where(eq(questionnaireQuestionOptions.questionId, question.id))
          .orderBy(questionnaireQuestionOptions.order);
        
        questionsWithOptions.push({
          ...question,
          options
        });
      } else {
        questionsWithOptions.push({
          ...question,
          options: []
        });
      }
    }
    
    pagesWithSectionsAndQuestions.push({
      ...page,
      sections: sectionsWithDetails,
      questions: questionsWithOptions
    });
  }
  
  // Get conditional logic rules
  const conditionalLogic = await db.select()
    .from(questionnaireConditionalLogic)
    .where(eq(questionnaireConditionalLogic.definitionId, data.definitionId));
  
  return res.status(200).json({
    success: true,
    message: 'Full questionnaire retrieved successfully',
    questionnaire: {
      definition,
      pages: pagesWithSectionsAndQuestions,
      conditionalLogic
    }
  });
}