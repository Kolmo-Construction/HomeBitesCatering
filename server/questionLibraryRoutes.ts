import type { Express, Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "./db";

// Define validation schemas with Zod for API requests
const questionLibrarySchema = z.object({
  libraryQuestionKey: z.string().min(1).max(255),
  defaultText: z.string().min(1),
  questionType: z.enum([
    'header', 'text_display', 'textbox', 'textarea', 'email', 'phone', 'number',
    'datetime', 'time', 'checkbox_group', 'radio_group', 'dropdown',
    'full_name', 'address', 'matrix',
    'image_upload', 'file_upload', 'signature_pad', 'rating_scale', 'slider',
    'toggle_switch', 'location_picker', 'tag_select', 'date_range_picker', 'stepper_input'
  ]),
  defaultMetadata: z.any().optional(),
  defaultOptions: z.any().optional(),
  category: z.string().optional()
});

const matrixRowSchema = z.object({
  rowKey: z.string().min(1).max(255),
  label: z.string().min(1),
  price: z.string().optional(),
  defaultMetadata: z.any().optional(),
  rowOrder: z.number().int().optional()
});

const matrixColumnSchema = z.object({
  columnKey: z.string().min(1).max(255),
  header: z.string().min(1),
  cellInputType: z.string().min(1),
  defaultMetadata: z.any().optional(),
  columnOrder: z.number().int().optional()
});

// Helper to handle errors consistently
const handleError = (err: any, res: Response) => {
  console.error("Error in question library routes:", err);
  
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

// Register all question library routes
export const registerQuestionLibraryRoutes = (app: Express) => {
  
  // Create a new library question
  app.post('/api/form-builder/library-questions', async (req: Request, res: Response) => {
    try {
      const validatedData = questionLibrarySchema.parse(req.body);
      
      // Execute the raw SQL directly since we're having schema compatibility issues
      const createQuestionSql = `
        INSERT INTO question_library 
        (library_question_key, default_text, question_type, default_metadata, default_options, category, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING *
      `;
      
      const questionValues = [
        validatedData.libraryQuestionKey,
        validatedData.defaultText,
        validatedData.questionType,
        validatedData.defaultMetadata ? JSON.stringify(validatedData.defaultMetadata) : null,
        validatedData.defaultOptions ? JSON.stringify(validatedData.defaultOptions) : null,
        validatedData.category || null
      ];
      
      const result = await db.execute(createQuestionSql, questionValues);
      const newQuestion = result.rows[0];
      
      // Handle matrix rows and columns if provided
      if (validatedData.questionType === 'matrix') {
        // Extract matrix rows and columns if provided
        const matrixRows = req.body.matrixRows || [];
        const matrixColumns = req.body.matrixColumns || [];
        
        // Insert rows if any
        if (matrixRows.length > 0) {
          for (let i = 0; i < matrixRows.length; i++) {
            const row = matrixRows[i];
            const validatedRow = matrixRowSchema.parse(row);
            
            const createRowSql = `
              INSERT INTO library_matrix_rows
              (library_question_id, row_key, label, price, default_metadata, row_order, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            `;
            
            const rowValues = [
              newQuestion.id,
              validatedRow.rowKey,
              validatedRow.label,
              validatedRow.price || null,
              validatedRow.defaultMetadata ? JSON.stringify(validatedRow.defaultMetadata) : null,
              validatedRow.rowOrder || i
            ];
            
            await db.execute(createRowSql, rowValues);
          }
        }
        
        // Insert columns if any
        if (matrixColumns.length > 0) {
          for (let i = 0; i < matrixColumns.length; i++) {
            const column = matrixColumns[i];
            const validatedColumn = matrixColumnSchema.parse(column);
            
            const createColumnSql = `
              INSERT INTO library_matrix_columns
              (library_question_id, column_key, header, cell_input_type, default_metadata, column_order, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            `;
            
            const columnValues = [
              newQuestion.id,
              validatedColumn.columnKey,
              validatedColumn.header,
              validatedColumn.cellInputType,
              validatedColumn.defaultMetadata ? JSON.stringify(validatedColumn.defaultMetadata) : null,
              validatedColumn.columnOrder || i
            ];
            
            await db.execute(createColumnSql, columnValues);
          }
        }
      }
      
      // Get the complete question with its details
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
      
      // Build query based on filters
      let querySql = 'SELECT * FROM question_library';
      let countSql = 'SELECT COUNT(*) FROM question_library';
      const queryParams: any[] = [];
      
      if (category) {
        querySql += ' WHERE category = $1';
        countSql += ' WHERE category = $1';
        queryParams.push(category);
      }
      
      // Add pagination
      querySql += ' ORDER BY id LIMIT $' + (queryParams.length + 1) + ' OFFSET $' + (queryParams.length + 2);
      queryParams.push(pageSize, offset);
      
      // Execute queries
      const [questionsResult, countResult] = await Promise.all([
        db.execute(querySql, queryParams),
        db.execute(countSql, category ? [category] : [])
      ]);
      
      const questions = questionsResult.rows;
      const totalCount = parseInt(countResult.rows[0].count, 10);
      
      return res.status(200).json({
        data: questions,
        pagination: {
          total: totalCount,
          page,
          pageSize,
          totalPages: Math.ceil(totalCount / pageSize)
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
      
      // Validate the input data
      const validatedData = questionLibrarySchema.parse(req.body);
      
      // Check if the question exists
      const checkSql = 'SELECT * FROM question_library WHERE id = $1';
      const checkResult = await db.execute(checkSql, [id]);
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      // Update the question
      const updateSql = `
        UPDATE question_library
        SET library_question_key = $1,
            default_text = $2,
            question_type = $3,
            default_metadata = $4,
            default_options = $5,
            category = $6,
            updated_at = NOW()
        WHERE id = $7
        RETURNING *
      `;
      
      const updateValues = [
        validatedData.libraryQuestionKey,
        validatedData.defaultText,
        validatedData.questionType,
        validatedData.defaultMetadata ? JSON.stringify(validatedData.defaultMetadata) : null,
        validatedData.defaultOptions ? JSON.stringify(validatedData.defaultOptions) : null,
        validatedData.category || null,
        id
      ];
      
      await db.execute(updateSql, updateValues);
      
      // Handle matrix rows and columns updates if applicable
      if (validatedData.questionType === 'matrix') {
        // Matrix rows update
        if (req.body.matrixRows) {
          // First delete existing rows for this question
          await db.execute('DELETE FROM library_matrix_rows WHERE library_question_id = $1', [id]);
          
          // Then insert the new rows
          const matrixRows = req.body.matrixRows || [];
          if (matrixRows.length > 0) {
            for (let i = 0; i < matrixRows.length; i++) {
              const row = matrixRows[i];
              const validatedRow = matrixRowSchema.parse(row);
              
              const createRowSql = `
                INSERT INTO library_matrix_rows
                (library_question_id, row_key, label, price, default_metadata, row_order, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
              `;
              
              const rowValues = [
                id,
                validatedRow.rowKey,
                validatedRow.label,
                validatedRow.price || null,
                validatedRow.defaultMetadata ? JSON.stringify(validatedRow.defaultMetadata) : null,
                validatedRow.rowOrder || i
              ];
              
              await db.execute(createRowSql, rowValues);
            }
          }
        }
        
        // Matrix columns update
        if (req.body.matrixColumns) {
          // First delete existing columns for this question
          await db.execute('DELETE FROM library_matrix_columns WHERE library_question_id = $1', [id]);
          
          // Then insert the new columns
          const matrixColumns = req.body.matrixColumns || [];
          if (matrixColumns.length > 0) {
            for (let i = 0; i < matrixColumns.length; i++) {
              const column = matrixColumns[i];
              const validatedColumn = matrixColumnSchema.parse(column);
              
              const createColumnSql = `
                INSERT INTO library_matrix_columns
                (library_question_id, column_key, header, cell_input_type, default_metadata, column_order, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
              `;
              
              const columnValues = [
                id,
                validatedColumn.columnKey,
                validatedColumn.header,
                validatedColumn.cellInputType,
                validatedColumn.defaultMetadata ? JSON.stringify(validatedColumn.defaultMetadata) : null,
                validatedColumn.columnOrder || i
              ];
              
              await db.execute(createColumnSql, columnValues);
            }
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
      
      // Check if the question exists
      const checkSql = 'SELECT * FROM question_library WHERE id = $1';
      const checkResult = await db.execute(checkSql, [id]);
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      // Delete the question (cascading will automatically delete matrix rows and columns)
      await db.execute('DELETE FROM question_library WHERE id = $1', [id]);
      
      return res.status(200).json({
        message: "Question deleted successfully",
        id
      });
    } catch (err) {
      return handleError(err, res);
    }
  });
};

// Helper function to get a question with all related details
async function getQuestionWithDetails(id: number) {
  // Get the base question
  const questionSql = 'SELECT * FROM question_library WHERE id = $1';
  const questionResult = await db.execute(questionSql, [id]);
  
  if (questionResult.rows.length === 0) {
    return null;
  }
  
  const question = questionResult.rows[0];
  
  // If it's a matrix question, get rows and columns
  if (question.question_type === 'matrix') {
    // Get rows
    const rowsSql = 'SELECT * FROM library_matrix_rows WHERE library_question_id = $1 ORDER BY row_order';
    const rowsResult = await db.execute(rowsSql, [id]);
    
    // Get columns
    const columnsSql = 'SELECT * FROM library_matrix_columns WHERE library_question_id = $1 ORDER BY column_order';
    const columnsResult = await db.execute(columnsSql, [id]);
    
    // Return the full question with its matrix components
    return {
      ...question,
      matrixRows: rowsResult.rows,
      matrixColumns: columnsResult.rows
    };
  }
  
  return question;
}