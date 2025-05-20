import { Request, Response } from "express";
import { db } from "./db";

/**
 * Clone a question from the library
 * This route creates a copy of an existing question with all its properties
 */
export async function cloneQuestion(req: Request, res: Response) {
  try {
    const questionId = parseInt(req.params.id);
    
    if (isNaN(questionId)) {
      return res.status(400).json({ message: "Invalid question ID" });
    }
    
    // 1. Fetch the original question
    const fetchOriginalSql = `SELECT * FROM question_library WHERE id = $1`;
    const originalResult = await db.execute(fetchOriginalSql, [questionId]);
    
    if (originalResult.rows.length === 0) {
      return res.status(404).json({ message: "Question not found" });
    }
    
    const originalQuestion = originalResult.rows[0];
    
    // 2. Generate a unique key for the cloned question
    const timestamp = Date.now();
    const clonedQuestionKey = `${originalQuestion.library_question_key}_clone_${timestamp}`;
    
    // 3. Create the cloned question
    const insertCloneSql = `
      INSERT INTO question_library 
      (library_question_key, default_text, question_type, default_metadata, default_options, category, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;
    
    const insertParams = [
      clonedQuestionKey,
      `${originalQuestion.default_text} (Copy)`,
      originalQuestion.question_type,
      originalQuestion.default_metadata,
      originalQuestion.default_options,
      originalQuestion.category
    ];
    
    const cloneResult = await db.execute(insertCloneSql, insertParams);
    const newQuestion = cloneResult.rows[0];
    
    // 4. If it's a matrix question, also clone the rows and columns
    if (originalQuestion.question_type === 'matrix') {
      // Clone matrix rows
      const fetchRowsSql = `SELECT * FROM library_matrix_rows WHERE library_question_id = $1`;
      const rowsResult = await db.execute(fetchRowsSql, [questionId]);
      
      for (const row of rowsResult.rows) {
        const insertRowSql = `
          INSERT INTO library_matrix_rows
          (library_question_id, row_key, label, price, default_metadata, row_order, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        `;
        
        await db.execute(insertRowSql, [
          newQuestion.id,
          row.row_key,
          row.label,
          row.price,
          row.default_metadata,
          row.row_order
        ]);
      }
      
      // Clone matrix columns
      const fetchColumnsSql = `SELECT * FROM library_matrix_columns WHERE library_question_id = $1`;
      const columnsResult = await db.execute(fetchColumnsSql, [questionId]);
      
      for (const column of columnsResult.rows) {
        const insertColumnSql = `
          INSERT INTO library_matrix_columns
          (library_question_id, column_key, header, cell_input_type, default_metadata, column_order, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        `;
        
        await db.execute(insertColumnSql, [
          newQuestion.id,
          column.column_key,
          column.header,
          column.cell_input_type,
          column.default_metadata,
          column.column_order
        ]);
      }
    }
    
    // 5. Return the newly created question
    return res.status(201).json({
      message: "Question cloned successfully",
      question: newQuestion
    });
    
  } catch (error) {
    console.error("Error cloning question:", error);
    return res.status(500).json({
      message: "Failed to clone question",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}