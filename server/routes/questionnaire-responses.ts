import { Request, Response } from 'express';
import { db } from '../db';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import {
  questionnaireDefinitions,
  questionnaireQuestions
} from '../../shared/schema-questionnaire';
import {
  questionnaireSubmissions,
  questionResponses,
  insertQuestionnaireSubmissionSchema,
  insertQuestionResponseSchema
} from '../../shared/schema-responses';

// Schemas for validation
const submitResponseSchema = z.object({
  definitionId: z.number().int().positive(),
  submitterName: z.string().min(1, { message: "Name is required" }),
  submitterEmail: z.string().email({ message: "Valid email is required" }),
  submitterPhone: z.string().optional(),
  eventDate: z.string().optional(), // Will convert to Date
  eventType: z.string().min(1, { message: "Event type is required" }),
  additionalNotes: z.string().optional(),
  responses: z.record(z.string(), z.any())
});

const getSubmissionSchema = z.object({
  submissionId: z.string().uuid()
});

const updateSubmissionStatusSchema = z.object({
  submissionId: z.string().uuid(),
  status: z.enum(['submitted', 'in_review', 'approved', 'rejected'])
});

// Main handler for questionnaire response routes
export const handleResponsesApi = async (req: Request, res: Response) => {
  const { action, data } = req.body;

  console.log(`Questionnaire Responses API received request with action: ${action}`);

  try {
    switch (action) {
      case 'submitResponse':
        return await handleSubmitResponse(res, data);
      case 'getSubmission':
        return await handleGetSubmission(res, data);
      case 'getSubmissions':
        return await handleGetSubmissions(res);
      case 'updateSubmissionStatus':
        return await handleUpdateSubmissionStatus(res, data);
      default:
        return res.status(400).json({
          success: false,
          message: `Unknown action: ${action}`
        });
    }
  } catch (error) {
    console.error('Error in questionnaire responses API:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error processing questionnaire responses request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Handle submission of a questionnaire response
async function handleSubmitResponse(res: Response, data: any) {
  const validationResult = submitResponseSchema.safeParse(data);
  
  if (!validationResult.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid submission data',
      errors: validationResult.error.errors
    });
  }
  
  const submissionData = validationResult.data;
  
  // Check if the questionnaire definition exists
  const [definition] = await db.select()
    .from(questionnaireDefinitions)
    .where(eq(questionnaireDefinitions.id, submissionData.definitionId));
  
  if (!definition) {
    return res.status(404).json({
      success: false,
      message: 'Questionnaire definition not found'
    });
  }
  
  // Begin a transaction to ensure both submission and responses are saved
  try {
    const result = await db.transaction(async (tx) => {
      // 1. Create the submission record
      const [newSubmission] = await tx.insert(questionnaireSubmissions)
        .values({
          definitionId: submissionData.definitionId,
          submitterName: submissionData.submitterName,
          submitterEmail: submissionData.submitterEmail,
          submitterPhone: submissionData.submitterPhone,
          eventDate: submissionData.eventDate ? new Date(submissionData.eventDate) : null,
          eventType: submissionData.eventType,
          additionalNotes: submissionData.additionalNotes,
          status: 'submitted'
        })
        .returning();
      
      // 2. Get all questions for the questionnaire to validate responses
      const questions = await tx.select({
        id: questionnaireQuestions.id,
        questionKey: questionnaireQuestions.questionKey,
        questionType: questionnaireQuestions.questionType
      })
      .from(questionnaireQuestions)
      .where(eq(questionnaireQuestions.questionKey, submissionData.responses));
      
      // Create a map of question keys to question objects for easy lookup
      const questionMap = questions.reduce((map, question) => {
        map[question.questionKey] = question;
        return map;
      }, {} as Record<string, typeof questions[0]>);
      
      // 3. Process and save each response
      const responsePromises = Object.entries(submissionData.responses).map(async ([key, value]) => {
        const question = questionMap[key];
        
        // Skip if no corresponding question found
        if (!question) {
          console.warn(`Question with key ${key} not found. Skipping response.`);
          return null;
        }
        
        // Determine which value field to use based on question type
        let responseValues: Partial<typeof questionResponses.$inferInsert> = {
          submissionId: newSubmission.id,
          questionId: question.id,
          questionKey: key
        };
        
        // Set the appropriate value field based on question type
        switch (question.questionType) {
          case 'number':
            responseValues.numberValue = typeof value === 'number' ? value : Number(value);
            break;
          case 'checkbox':
          case 'radio':
          case 'select':
          case 'matrix_single':
          case 'matrix_multiple':
            responseValues.jsonValue = value;
            break;
          case 'boolean':
            responseValues.booleanValue = Boolean(value);
            break;
          case 'date':
            responseValues.dateValue = value ? new Date(value) : null;
            break;
          default: // text, email, etc.
            responseValues.textValue = String(value);
            break;
        }
        
        // Insert the response
        const [newResponse] = await tx.insert(questionResponses)
          .values(responseValues)
          .returning();
        
        return newResponse;
      });
      
      // Wait for all responses to be inserted
      const savedResponses = await Promise.all(responsePromises);
      
      return {
        submission: newSubmission,
        responses: savedResponses.filter(Boolean) // Filter out null values
      };
    });
    
    return res.status(201).json({
      success: true,
      message: 'Questionnaire response submitted successfully',
      submissionId: result.submission.id,
      submissionDate: result.submission.submissionDate
    });
  } catch (error) {
    console.error('Transaction error in submitResponse:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save questionnaire response',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Get a specific submission with all its responses
async function handleGetSubmission(res: Response, data: any) {
  const validationResult = getSubmissionSchema.safeParse(data);
  
  if (!validationResult.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid submission ID',
      errors: validationResult.error.errors
    });
  }
  
  const { submissionId } = validationResult.data;
  
  // Fetch the submission
  const [submission] = await db.select()
    .from(questionnaireSubmissions)
    .where(eq(questionnaireSubmissions.id, submissionId));
  
  if (!submission) {
    return res.status(404).json({
      success: false,
      message: 'Submission not found'
    });
  }
  
  // Fetch all responses for this submission
  const responses = await db.select()
    .from(questionResponses)
    .where(eq(questionResponses.submissionId, submissionId));
  
  return res.status(200).json({
    success: true,
    submission,
    responses
  });
}

// Get all submissions (with pagination)
async function handleGetSubmissions(res: Response) {
  // In a real app, add pagination and filtering here
  const submissions = await db.select()
    .from(questionnaireSubmissions)
    .orderBy(questionnaireSubmissions.submissionDate);
  
  return res.status(200).json({
    success: true,
    submissions
  });
}

// Update the status of a submission
async function handleUpdateSubmissionStatus(res: Response, data: any) {
  const validationResult = updateSubmissionStatusSchema.safeParse(data);
  
  if (!validationResult.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status update data',
      errors: validationResult.error.errors
    });
  }
  
  const { submissionId, status } = validationResult.data;
  
  // Check if the submission exists
  const [submission] = await db.select()
    .from(questionnaireSubmissions)
    .where(eq(questionnaireSubmissions.id, submissionId));
  
  if (!submission) {
    return res.status(404).json({
      success: false,
      message: 'Submission not found'
    });
  }
  
  // Update the status
  const [updatedSubmission] = await db.update(questionnaireSubmissions)
    .set({
      status,
      lastUpdated: new Date()
    })
    .where(eq(questionnaireSubmissions.id, submissionId))
    .returning();
  
  return res.status(200).json({
    success: true,
    message: 'Submission status updated successfully',
    submission: updatedSubmission
  });
}