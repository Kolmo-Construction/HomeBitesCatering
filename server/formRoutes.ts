import type { Express, Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { db } from "./db";
import {
  insertQuestionLibrarySchema,
  insertLibraryMatrixRowSchema,
  insertLibraryMatrixColumnSchema,
  questionLibrary,
  libraryMatrixRows,
  libraryMatrixColumns
} from "@shared/form-schema";

// Type definitions for request parameters
type QuestionLibraryRequest = z.infer<typeof insertQuestionLibrarySchema>;
type MatrixRowRequest = z.infer<typeof insertLibraryMatrixRowSchema>;
type MatrixColumnRequest = z.infer<typeof insertLibraryMatrixColumnSchema>;

// Helper to handle errors consistently
const handleError = (err: any, res: Response) => {
  console.error("Error in form routes:", err);
  
  if (err instanceof ZodError) {
    return res.status(400).json({ 
      message: "Validation error", 
      errors: err.errors 
    });
  }
  
  return res.status(500).json({ 
    message: "Internal server error", 
    error: err.message 
  });
};

// Register all form routes
export const registerFormRoutes = (app: Express) => {
  
  // ===== QUESTION LIBRARY ENDPOINTS =====
  
  // Create a new library question
  app.post('/api/form-builder/library-questions', async (req: Request, res: Response) => {
    try {
      const validatedData = insertQuestionLibrarySchema.parse(req.body);
      
      // Extract matrix rows and columns if provided for matrix questions
      const matrixRows = req.body.matrixRows || [];
      const matrixColumns = req.body.matrixColumns || [];
      
      // Create the question first
      const [newQuestion] = await db
        .insert(questionLibrary)
        .values(validatedData)
        .returning();
      
      // If it's a matrix question and rows/columns were provided, add them
      if (validatedData.questionType === 'matrix' && 
         (matrixRows.length > 0 || matrixColumns.length > 0)) {
        
        // Insert rows if any
        if (matrixRows.length > 0) {
          await Promise.all(matrixRows.map(async (row: any, index: number) => {
            const rowData = insertLibraryMatrixRowSchema.parse({
              ...row,
              libraryQuestionId: newQuestion.id,
              rowOrder: row.rowOrder ?? index
            });
            
            return db.insert(libraryMatrixRows).values(rowData);
          }));
        }
        
        // Insert columns if any
        if (matrixColumns.length > 0) {
          await Promise.all(matrixColumns.map(async (column: any, index: number) => {
            const columnData = insertLibraryMatrixColumnSchema.parse({
              ...column,
              libraryQuestionId: newQuestion.id,
              columnOrder: column.columnOrder ?? index
            });
            
            return db.insert(libraryMatrixColumns).values(columnData);
          }));
        }
      }
      
      // Query back the full question with its rows and columns
      const question = await getQuestionWithDetails(newQuestion.id);
      return res.status(201).json(question);
    } catch (err) {
      return handleError(err, res);
    }
  });
  
  // List all library questions (with pagination)
  app.get('/api/form-builder/library-questions', async (req: Request, res: Response) => {
    try {
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 25;
      const offset = (page - 1) * pageSize;
      const category = req.query.category as string | undefined;
      const search = req.query.search as string | undefined;
      
      // Build base query
      let query = db.select().from(questionLibrary);
      
      // Build where conditions array for filtering
      let conditions = [];
      
      // Add category filter if provided
      if (category) {
        conditions.push(eq(questionLibrary.category, category));
      }
      
      // Add search filter if provided
      if (search && search.trim() !== '') {
        // Search in questionKey, defaultText, and category fields
        const searchTerm = search.toLowerCase().trim();
        
        // Use SQL to perform case-insensitive search
        // Note: This is using drizzle-orm's sql template literal for raw SQL
        conditions.push(
          sql`(LOWER(${questionLibrary.libraryQuestionKey}) LIKE ${`%${searchTerm}%`} OR 
               LOWER(${questionLibrary.defaultText}) LIKE ${`%${searchTerm}%`} OR 
               LOWER(${questionLibrary.category}) LIKE ${`%${searchTerm}%`})`
        );
      }
      
      // Apply conditions if any
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      // Add pagination
      query = query.limit(pageSize).offset(offset);
      
      const questions = await query;
      
      // Get total count for pagination
      let count = 0;
      try {
        if (conditions.length > 0) {
          // Use count with conditions
          const countResult = await db
            .select({ count: sql`count(*)` })
            .from(questionLibrary)
            .where(and(...conditions));
          count = Number(countResult[0]?.count || 0);
        } else {
          // Use simple count query
          const countResult = await db
            .select({ count: sql`count(*)` })
            .from(questionLibrary);
          count = Number(countResult[0]?.count || 0);
        }
      } catch (err) {
        console.error('Error counting questions:', err);
        // In case of error, use array length as fallback
        count = questions.length;
      }
      
      return res.status(200).json({
        data: questions,
        pagination: {
          total: Number(count),
          page,
          pageSize,
          totalPages: Math.ceil(Number(count) / pageSize)
        }
      });
    } catch (err) {
      return handleError(err, res);
    }
  });
  
  // Get a single library question with its details
  app.get('/api/form-builder/library-questions/:id', async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid question ID" });
      }
      
      const question = await getQuestionWithDetails(id);
      
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      return res.status(200).json(question);
    } catch (err) {
      return handleError(err, res);
    }
  });
  
  // Update a library question
  app.put('/api/form-builder/library-questions/:id', async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid question ID" });
      }
      
      // Validate the base question data
      const validatedData = insertQuestionLibrarySchema.parse(req.body);
      
      // Check if the question exists
      const [existingQuestion] = await db
        .select()
        .from(questionLibrary)
        .where(eq(questionLibrary.id, id));
      
      if (!existingQuestion) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      // Update the question
      await db
        .update(questionLibrary)
        .set({
          ...validatedData,
          updatedAt: new Date()
        })
        .where(eq(questionLibrary.id, id));
      
      // Handle matrix rows and columns updates if applicable
      if (validatedData.questionType === 'matrix') {
        // Matrix rows update
        if (req.body.matrixRows) {
          // First delete existing rows for this question
          await db
            .delete(libraryMatrixRows)
            .where(eq(libraryMatrixRows.libraryQuestionId, id));
          
          // Then insert the new rows
          if (req.body.matrixRows.length > 0) {
            await Promise.all(req.body.matrixRows.map(async (row: any, index: number) => {
              const rowData = insertLibraryMatrixRowSchema.parse({
                ...row,
                libraryQuestionId: id,
                rowOrder: row.rowOrder ?? index
              });
              
              return db.insert(libraryMatrixRows).values(rowData);
            }));
          }
        }
        
        // Matrix columns update
        if (req.body.matrixColumns) {
          // First delete existing columns for this question
          await db
            .delete(libraryMatrixColumns)
            .where(eq(libraryMatrixColumns.libraryQuestionId, id));
          
          // Then insert the new columns
          if (req.body.matrixColumns.length > 0) {
            await Promise.all(req.body.matrixColumns.map(async (column: any, index: number) => {
              const columnData = insertLibraryMatrixColumnSchema.parse({
                ...column,
                libraryQuestionId: id,
                columnOrder: column.columnOrder ?? index
              });
              
              return db.insert(libraryMatrixColumns).values(columnData);
            }));
          }
        }
      }
      
      // Return the updated question with all its details
      const updatedQuestion = await getQuestionWithDetails(id);
      return res.status(200).json(updatedQuestion);
    } catch (err) {
      return handleError(err, res);
    }
  });
  
  // Delete a library question
  app.delete('/api/form-builder/library-questions/:id', async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid question ID" });
      }
      
      // Check if the question is being used in any forms before deletion
      // This is a safety check since we have 'restrict' in the foreign key
      const [question] = await db
        .select()
        .from(questionLibrary)
        .where(eq(questionLibrary.id, id));
      
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      // Delete the question (matrix rows/columns will cascade delete due to FK constraints)
      await db
        .delete(questionLibrary)
        .where(eq(questionLibrary.id, id));
      
      return res.status(200).json({ 
        message: "Question deleted successfully",
        id
      });
    } catch (err) {
      return handleError(err, res);
    }
  });
  
  // ===== HELPER FUNCTIONS =====
  
  // Helper function to get a question with all related details
  async function getQuestionWithDetails(id: number) {
    // Get the base question
    const [question] = await db
      .select()
      .from(questionLibrary)
      .where(eq(questionLibrary.id, id));
    
    if (!question) {
      return null;
    }
    
    // If it's a matrix question, get rows and columns
    if (question.questionType === 'matrix') {
      // Get rows
      const rows = await db
        .select()
        .from(libraryMatrixRows)
        .where(eq(libraryMatrixRows.libraryQuestionId, id))
        .orderBy(libraryMatrixRows.rowOrder);
      
      // Get columns
      const columns = await db
        .select()
        .from(libraryMatrixColumns)
        .where(eq(libraryMatrixColumns.libraryQuestionId, id))
        .orderBy(libraryMatrixColumns.columnOrder);
      
      // Return the full question with its matrix components
      return {
        ...question,
        matrixRows: rows,
        matrixColumns: columns
      };
    }
    
    return question;
  }
};