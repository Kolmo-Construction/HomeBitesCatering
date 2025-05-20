import { Request, Response } from "express";
import { db } from "./db";

/**
 * Fixed question cloning function that addresses the parameter issue
 * Uses parameterized queries to prevent SQL injection and handle special characters
 */
export async function fixedCloneQuestion(req: Request, res: Response) {
  try {
    console.log("Fixed clone endpoint called with ID:", req.params.id);
    
    const questionId = parseInt(req.params.id);
    if (isNaN(questionId)) {
      return res.status(400).json({ message: "Invalid question ID" });
    }
    
    // 1. Fetch the original question using parameterized query
    const fetchSql = `SELECT * FROM question_library WHERE id = $1`;
    console.log("Executing fetch query with ID:", questionId);
    
    const originalResult = await db.execute(fetchSql, [questionId]);
    if (!originalResult || !originalResult.rows || originalResult.rows.length === 0) {
      return res.status(404).json({ message: "Question not found" });
    }
    
    const originalQuestion = originalResult.rows[0];
    console.log("Found original question:", originalQuestion.id);
    
    // 2. Create a clone with a unique key
    const timestamp = Date.now();
    const originalKey = originalQuestion.library_question_key || '';
    const originalText = originalQuestion.default_text || '';
    const clonedKey = `${originalKey}_clone_${timestamp}`;
    const clonedText = `${originalText} (Copy)`;
    
    // 3. Insert the cloned question using parameterized query
    const insertSql = `
      INSERT INTO question_library 
      (library_question_key, default_text, question_type, default_metadata, default_options, category, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;
    
    // Prepare parameters safely
    const insertParams = [
      clonedKey,
      clonedText,
      originalQuestion.question_type,
      originalQuestion.default_metadata,
      originalQuestion.default_options,
      originalQuestion.category
    ];
    
    console.log("Executing insert with params:", insertParams.map((p, i) => 
      `$${i+1}: ${typeof p === 'object' ? 'Object' : p}`).join(', '));
    
    const insertResult = await db.execute(insertSql, insertParams);
    const newQuestion = insertResult.rows[0];
    
    console.log("Successfully created clone with ID:", newQuestion.id);
    
    // 4. If it's a matrix question, also clone the related data
    if (originalQuestion.question_type === 'matrix') {
      try {
        // Matrix rows
        const rowsSql = `SELECT * FROM library_matrix_rows WHERE library_question_id = $1`;
        const rowsResult = await db.execute(rowsSql, [questionId]);
        
        for (const row of rowsResult.rows) {
          const insertRowSql = `
            INSERT INTO library_matrix_rows 
            (library_question_id, row_key, label, price, default_metadata, row_order, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          `;
          
          const rowParams = [
            newQuestion.id,
            row.row_key,
            row.label,
            row.price,
            row.default_metadata,
            row.row_order || 0
          ];
          
          await db.execute(insertRowSql, rowParams);
        }
        
        // Matrix columns
        const columnsSql = `SELECT * FROM library_matrix_columns WHERE library_question_id = $1`;
        const columnsResult = await db.execute(columnsSql, [questionId]);
        
        for (const column of columnsResult.rows) {
          const insertColSql = `
            INSERT INTO library_matrix_columns 
            (library_question_id, column_key, header, cell_input_type, default_metadata, column_order, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          `;
          
          const columnParams = [
            newQuestion.id,
            column.column_key,
            column.header,
            column.cell_input_type,
            column.default_metadata,
            column.column_order || 0
          ];
          
          await db.execute(insertColSql, columnParams);
        }
      } catch (matrixError) {
        console.error("Matrix data cloning error:", matrixError);
        // Continue since we already have the base question
      }
    }
    
    // 5. Return success
    return res.status(201).json({
      message: "Question cloned successfully",
      question: newQuestion
    });
    
  } catch (error) {
    console.error("Error in fixed clone question:", error);
    return res.status(500).json({
      message: "Failed to clone question",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}