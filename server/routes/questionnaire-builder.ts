import { Request, Response } from 'express';
import { db } from '../db';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import {
  componentTypes,
  questionnaireDefinitions,
  questionnairePages,
  questionnaireSections,
  questionnaireQuestions,
  questionnaireQuestionOptions,
  pageSections,
  sectionQuestions,
  conditionalLogic,
  insertComponentTypeSchema,
  insertQuestionnaireDefinitionSchema,
  insertQuestionnairePageSchema,
  insertQuestionnaireSectionSchema,
  insertQuestionnaireQuestionSchema,
  insertSectionQuestionSchema,
  insertPageSectionSchema,
  insertConditionalLogicSchema
} from '../../shared/schema-questionnaire';

// Action schemas
const registerComponentTypeSchema = z.object({
  typeKey: z.string(),
  componentCategory: z.string(),
  displayName: z.string(),
  description: z.string().optional(),
  configSchema: z.any().optional(),
  isActive: z.boolean().default(true)
});

const createSectionSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  templateKey: z.string(),
  metadata: z.any().optional()
});

const addSectionQuestionsSchema = z.object({
  sectionId: z.number(),
  questions: z.array(z.object({
    componentTypeId: z.number().optional(),
    text: z.string(),
    helpText: z.string().optional(),
    placeholderText: z.string().optional(),
    isRequired: z.boolean().optional(),
    validationRules: z.any().optional(),
    defaultValue: z.any().optional(),
    questionOrder: z.number()
  }))
});

const createDefinitionSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  versionName: z.string(),
  eventType: z.enum(['corporate', 'wedding', 'engagement', 'birthday', 'private_party', 'food_truck']),
  isActive: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  metadata: z.any().optional()
});

const addPageSchema = z.object({
  definitionId: z.number(),
  title: z.string(),
  description: z.string().optional(),
  order: z.number(),
  isConditional: z.boolean().optional(),
  conditionLogic: z.any().optional(),
  metadata: z.any().optional()
});

const addSectionToPageSchema = z.object({
  pageId: z.number(),
  sectionId: z.number(),
  sectionOrder: z.number(),
  isConditional: z.boolean().optional(),
  conditionLogic: z.any().optional()
});

const addQuestionSchema = z.object({
  componentTypeId: z.number().optional(),
  text: z.string(),
  helpText: z.string().optional(),
  placeholderText: z.string().optional(),
  isRequired: z.boolean().optional(),
  validationRules: z.any().optional(),
  defaultValue: z.any().optional(),
  metadata: z.any().optional()
});

const addQuestionOptionsSchema = z.object({
  questionId: z.number(),
  options: z.array(z.object({
    optionText: z.string(),
    optionValue: z.string().optional(),
    order: z.number(),
    isDefault: z.boolean().optional(),
    metadata: z.any().optional()
  }))
});

const addConditionalLogicSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  targetType: z.string(),
  targetId: z.number(),
  conditionType: z.enum([
    'equals', 'not_equals', 'contains', 'greater_than', 
    'less_than', 'in_list', 'not_in_list', 'is_empty', 
    'is_not_empty', 'custom'
  ]),
  sourceType: z.string(),
  sourceId: z.string(),
  conditionValue: z.any(),
  actionType: z.enum(['show', 'hide', 'require', 'skip_to', 'set_value', 'custom']),
  actionValue: z.any(),
  priority: z.number().optional(),
  isActive: z.boolean().optional()
});

// Main request handler
export const handleBuilderApi = async (req: Request, res: Response) => {
  const { action, data } = req.body;

  console.log(`Form Builder API received request with action: ${action}`);

  try {
    switch (action) {
      case 'registerComponentType':
        return await handleRegisterComponentType(res, data);
      case 'listComponentTypes':
        return await handleListComponentTypes(res);
      case 'createSection':
        return await handleCreateSection(res, data);
      case 'listSections':
        return await handleListSections(res);
      case 'addSectionQuestions':
        return await handleAddSectionQuestions(res, data);
      case 'createDefinition':
        return await handleCreateDefinition(res, data);
      case 'listDefinitions':
        return await handleListDefinitions(res);
      case 'addPage':
        return await handleAddPage(res, data);
      case 'addSectionToPage':
        return await handleAddSectionToPage(res, data);
      case 'addQuestion':
        return await handleAddQuestion(res, data);
      case 'listQuestions':
        return await handleListQuestions(res);
      case 'addQuestionOptions':
        return await handleAddQuestionOptions(res, data);
      case 'addConditionalLogic':
        return await handleAddConditionalLogic(res, data);
      case 'getFullQuestionnaire':
        return await handleGetFullQuestionnaire(res, data);
      default:
        return res.status(400).json({
          success: false,
          message: `Unknown action: ${action}`
        });
    }
  } catch (error) {
    console.error('Error in form builder API:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error processing form builder request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Handler functions for each action
async function handleRegisterComponentType(res: Response, data: any) {
  const validationResult = registerComponentTypeSchema.safeParse(data);
  
  if (!validationResult.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid component type data',
      errors: validationResult.error.errors
    });
  }
  
  const componentTypeData = validationResult.data;
  
  // Check if component type already exists
  const existingComponent = await db.select()
    .from(componentTypes)
    .where(eq(componentTypes.typeKey, componentTypeData.typeKey));
  
  if (existingComponent.length > 0) {
    return res.status(409).json({
      success: false,
      message: 'Component type already exists',
      componentType: existingComponent[0]
    });
  }
  
  // Create new component type
  const [newComponentType] = await db.insert(componentTypes)
    .values({
      typeKey: componentTypeData.typeKey,
      componentCategory: componentTypeData.componentCategory,
      displayName: componentTypeData.displayName,
      description: componentTypeData.description,
      configSchema: componentTypeData.configSchema,
      isActive: componentTypeData.isActive
    })
    .returning();
  
  return res.status(201).json({
    success: true,
    message: 'Component type created successfully',
    componentType: newComponentType
  });
}

async function handleListComponentTypes(res: Response) {
  const allComponentTypes = await db.select()
    .from(componentTypes)
    .orderBy(componentTypes.id);
  
  return res.status(200).json({
    success: true,
    componentTypes: allComponentTypes
  });
}

async function handleCreateSection(res: Response, data: any) {
  const validationResult = createSectionSchema.safeParse(data);
  
  if (!validationResult.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid section data',
      errors: validationResult.error.errors
    });
  }
  
  const sectionData = validationResult.data;
  
  // Check if section with template key already exists
  const existingSection = await db.select()
    .from(questionnaireSections)
    .where(eq(questionnaireSections.templateKey, sectionData.templateKey));
  
  if (existingSection.length > 0) {
    return res.status(409).json({
      success: false,
      message: 'Section with this template key already exists',
      section: existingSection[0]
    });
  }
  
  // Create new section
  const [newSection] = await db.insert(questionnaireSections)
    .values({
      title: sectionData.title,
      description: sectionData.description,
      templateKey: sectionData.templateKey,
      metadata: sectionData.metadata
    })
    .returning();
  
  return res.status(201).json({
    success: true,
    message: 'Section created successfully',
    section: newSection
  });
}

async function handleListSections(res: Response) {
  const allSections = await db.select()
    .from(questionnaireSections)
    .orderBy(questionnaireSections.id);
  
  return res.status(200).json({
    success: true,
    sections: allSections
  });
}

async function handleAddSectionQuestions(res: Response, data: any) {
  const validationResult = addSectionQuestionsSchema.safeParse(data);
  
  if (!validationResult.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid section questions data',
      errors: validationResult.error.errors
    });
  }
  
  const { sectionId, questions } = validationResult.data;
  
  // Check if section exists
  const [section] = await db.select()
    .from(questionnaireSections)
    .where(eq(questionnaireSections.id, sectionId));
  
  if (!section) {
    return res.status(404).json({
      success: false,
      message: 'Section not found'
    });
  }
  
  // Insert each question and link to section
  const createdQuestions = [];
  
  for (const question of questions) {
    // Create the question
    const [newQuestion] = await db.insert(questionnaireQuestions)
      .values({
        componentTypeId: question.componentTypeId,
        text: question.text,
        helpText: question.helpText,
        placeholderText: question.placeholderText,
        isRequired: question.isRequired,
        validationRules: question.validationRules,
        defaultValue: question.defaultValue,
        questionType: 'custom', // Default to custom when using component type
        order: question.questionOrder // Use the question order here
      })
      .returning();
    
    // Link question to section
    await db.insert(sectionQuestions)
      .values({
        sectionId,
        questionId: newQuestion.id,
        questionOrder: question.questionOrder
      });
    
    createdQuestions.push(newQuestion);
  }
  
  return res.status(201).json({
    success: true,
    message: 'Section questions added successfully',
    questions: createdQuestions
  });
}

async function handleCreateDefinition(res: Response, data: any) {
  const validationResult = createDefinitionSchema.safeParse(data);
  
  if (!validationResult.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid questionnaire definition data',
      errors: validationResult.error.errors
    });
  }
  
  const definitionData = validationResult.data;
  
  // Create new definition
  const [newDefinition] = await db.insert(questionnaireDefinitions)
    .values({
      name: definitionData.name,
      description: definitionData.description,
      versionName: definitionData.versionName,
      eventType: definitionData.eventType,
      isActive: definitionData.isActive,
      isPublished: definitionData.isPublished
    })
    .returning();
  
  return res.status(201).json({
    success: true,
    message: 'Questionnaire definition created successfully',
    definition: newDefinition
  });
}

async function handleListDefinitions(res: Response) {
  const allDefinitions = await db.select()
    .from(questionnaireDefinitions)
    .orderBy(questionnaireDefinitions.id);
  
  return res.status(200).json({
    success: true,
    definitions: allDefinitions
  });
}

async function handleAddPage(res: Response, data: any) {
  const validationResult = addPageSchema.safeParse(data);
  
  if (!validationResult.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid page data',
      errors: validationResult.error.errors
    });
  }
  
  const pageData = validationResult.data;
  
  // Check if definition exists
  const [definition] = await db.select()
    .from(questionnaireDefinitions)
    .where(eq(questionnaireDefinitions.id, pageData.definitionId));
  
  if (!definition) {
    return res.status(404).json({
      success: false,
      message: 'Questionnaire definition not found'
    });
  }
  
  // Create new page
  const [newPage] = await db.insert(questionnairePages)
    .values({
      definitionId: pageData.definitionId,
      title: pageData.title,
      description: pageData.description,
      order: pageData.order,
      isConditional: pageData.isConditional,
      conditionLogic: pageData.conditionLogic,
      metadata: pageData.metadata
    })
    .returning();
  
  return res.status(201).json({
    success: true,
    message: 'Page added successfully',
    page: newPage
  });
}

async function handleAddSectionToPage(res: Response, data: any) {
  const validationResult = addSectionToPageSchema.safeParse(data);
  
  if (!validationResult.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid page-section data',
      errors: validationResult.error.errors
    });
  }
  
  const { pageId, sectionId, sectionOrder, isConditional, conditionLogic } = validationResult.data;
  
  if (!pageId || !sectionId) {
    return res.status(400).json({
      success: false,
      message: 'pageId and sectionId are required'
    });
  }
  
  // Check if page and section exist
  const [page] = await db.select()
    .from(questionnairePages)
    .where(eq(questionnairePages.id, pageId));
  
  if (!page) {
    return res.status(404).json({
      success: false,
      message: 'Page not found'
    });
  }
  
  const [section] = await db.select()
    .from(questionnaireSections)
    .where(eq(questionnaireSections.id, sectionId));
  
  if (!section) {
    return res.status(404).json({
      success: false,
      message: 'Section not found'
    });
  }
  
  // Check if relationship already exists
  const existingRelation = await db.select()
    .from(pageSections)
    .where(
      and(
        eq(pageSections.pageId, pageId),
        eq(pageSections.sectionId, sectionId)
      )
    );
  
  if (existingRelation.length > 0) {
    return res.status(409).json({
      success: false,
      message: 'This section is already added to this page',
      pageSection: existingRelation[0]
    });
  }
  
  // Create page-section relationship
  const [newPageSection] = await db.insert(pageSections)
    .values({
      pageId,
      sectionId,
      sectionOrder,
      isConditional,
      conditionLogic
    })
    .returning();
  
  return res.status(201).json({
    success: true,
    message: 'Section added to page successfully',
    pageSection: newPageSection
  });
}

async function handleAddQuestion(res: Response, data: any) {
  const validationResult = addQuestionSchema.safeParse(data);
  
  if (!validationResult.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid question data',
      errors: validationResult.error.errors
    });
  }
  
  const questionData = validationResult.data;
  
  // Create new question
  const [newQuestion] = await db.insert(questionnaireQuestions)
    .values({
      componentTypeId: questionData.componentTypeId,
      text: questionData.text,
      helpText: questionData.helpText,
      placeholderText: questionData.placeholderText,
      isRequired: questionData.isRequired,
      validationRules: questionData.validationRules,
      defaultValue: questionData.defaultValue,
      metadata: questionData.metadata,
      questionType: 'custom' // Default to custom when using component type
    })
    .returning();
  
  return res.status(201).json({
    success: true,
    message: 'Question created successfully',
    question: newQuestion
  });
}

async function handleListQuestions(res: Response) {
  const allQuestions = await db.select()
    .from(questionnaireQuestions)
    .orderBy(questionnaireQuestions.id);
  
  return res.status(200).json({
    success: true,
    questions: allQuestions
  });
}

async function handleAddQuestionOptions(res: Response, data: any) {
  const validationResult = addQuestionOptionsSchema.safeParse(data);
  
  if (!validationResult.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid question options data',
      errors: validationResult.error.errors
    });
  }
  
  const { questionId, options } = validationResult.data;
  
  // Check if question exists
  const [question] = await db.select()
    .from(questionnaireQuestions)
    .where(eq(questionnaireQuestions.id, questionId));
  
  if (!question) {
    return res.status(404).json({
      success: false,
      message: 'Question not found'
    });
  }
  
  // Insert options
  const createdOptions = [];
  
  for (const option of options) {
    const [newOption] = await db.insert(questionnaireQuestionOptions)
      .values({
        questionId,
        optionText: option.optionText,
        optionValue: option.optionValue,
        order: option.order,
        isDefault: option.isDefault,
        metadata: option.metadata
      })
      .returning();
    
    createdOptions.push(newOption);
  }
  
  return res.status(201).json({
    success: true,
    message: 'Question options added successfully',
    options: createdOptions
  });
}

async function handleAddConditionalLogic(res: Response, data: any) {
  const validationResult = addConditionalLogicSchema.safeParse(data);
  
  if (!validationResult.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid conditional logic data',
      errors: validationResult.error.errors
    });
  }
  
  const logicData = validationResult.data;
  
  // Create conditional logic
  const [newLogic] = await db.insert(conditionalLogic)
    .values({
      name: logicData.name,
      description: logicData.description,
      targetType: logicData.targetType,
      targetId: logicData.targetId,
      conditionType: logicData.conditionType,
      sourceType: logicData.sourceType,
      sourceId: logicData.sourceId,
      conditionValue: logicData.conditionValue,
      actionType: logicData.actionType,
      actionValue: logicData.actionValue,
      priority: logicData.priority,
      isActive: logicData.isActive
    })
    .returning();
  
  return res.status(201).json({
    success: true,
    message: 'Conditional logic added successfully',
    conditionalLogic: newLogic
  });
}

async function handleGetFullQuestionnaire(res: Response, data: any) {
  const { definitionId } = data;
  
  if (!definitionId) {
    return res.status(400).json({
      success: false,
      message: 'definitionId is required'
    });
  }
  
  // Get the questionnaire definition
  const [definition] = await db.select()
    .from(questionnaireDefinitions)
    .where(eq(questionnaireDefinitions.id, definitionId));
  
  if (!definition) {
    return res.status(404).json({
      success: false,
      message: 'Questionnaire definition not found'
    });
  }
  
  // Get all pages for this definition
  const pages = await db.select()
    .from(questionnairePages)
    .where(eq(questionnairePages.definitionId, definitionId))
    .orderBy(questionnairePages.order);
  
  // For each page, get all sections
  const pagesWithSections = [];
  
  for (const page of pages) {
    // Get page-section relationships
    const pageSectionRelations = await db.select()
      .from(pageSections)
      .where(eq(pageSections.pageId, page.id))
      .orderBy(pageSections.sectionOrder);
    
    const sectionsWithQuestions = [];
    
    // For each relationship, get the section and its questions
    for (const relation of pageSectionRelations) {
      // Get section
      const [section] = await db.select()
        .from(questionnaireSections)
        .where(eq(questionnaireSections.id, relation.sectionId));
      
      if (section) {
        // Get section-question relationships
        const sectionQuestionRelations = await db.select()
          .from(sectionQuestions)
          .where(eq(sectionQuestions.sectionId, section.id))
          .orderBy(sectionQuestions.questionOrder);
        
        const questionsWithOptions = [];
        
        // For each relationship, get the question and its options
        for (const sqRelation of sectionQuestionRelations) {
          // Get question
          const [question] = await db.select()
            .from(questionnaireQuestions)
            .where(eq(questionnaireQuestions.id, sqRelation.questionId));
          
          if (question) {
            // Get question options
            const options = await db.select()
              .from(questionnaireQuestionOptions)
              .where(eq(questionnaireQuestionOptions.questionId, question.id))
              .orderBy(questionnaireQuestionOptions.order);
            
            // Get conditional logic for this question
            const logic = await db.select()
              .from(conditionalLogic)
              .where(
                and(
                  eq(conditionalLogic.targetType, 'question'),
                  eq(conditionalLogic.targetId, question.id)
                )
              );
            
            questionsWithOptions.push({
              ...question,
              options,
              conditionalLogic: logic
            });
          }
        }
        
        // Get conditional logic for this section
        const sectionLogic = await db.select()
          .from(conditionalLogic)
          .where(
            and(
              eq(conditionalLogic.targetType, 'section'),
              eq(conditionalLogic.targetId, section.id)
            )
          );
        
        sectionsWithQuestions.push({
          ...section,
          relationDetails: relation,
          questions: questionsWithOptions,
          conditionalLogic: sectionLogic
        });
      }
    }
    
    // Get conditional logic for this page
    const pageLogic = await db.select()
      .from(conditionalLogic)
      .where(
        and(
          eq(conditionalLogic.targetType, 'page'),
          eq(conditionalLogic.targetId, page.id)
        )
      );
    
    pagesWithSections.push({
      ...page,
      sections: sectionsWithQuestions,
      conditionalLogic: pageLogic
    });
  }
  
  // Build full questionnaire object
  const fullQuestionnaire = {
    ...definition,
    pages: pagesWithSections
  };
  
  return res.status(200).json({
    success: true,
    message: 'Full questionnaire retrieved successfully',
    questionnaire: fullQuestionnaire
  });
}