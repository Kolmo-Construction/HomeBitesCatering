import { Request, Response } from "express";
import { db } from "./db";

/**
 * Clone a question from the library
 * This route creates a copy of an existing question with all its properties
 */
export async function cloneQuestion(req: Request, res: Response) {
  try {
    console.log("Clone question endpoint called with params:", req.params);
    
    const questionId = parseInt(req.params.id);
    
    if (isNaN(questionId)) {
      console.log("Invalid question ID received:", req.params.id);
      return res.status(400).json({ message: "Invalid question ID" });
    }
    
    console.log("Attempting to clone question with ID:", questionId);
    
    // 1. Fetch the original question
    const fetchOriginalSql = `SELECT * FROM question_library WHERE id = $1`;
    
    console.log("Executing query to fetch original question:", fetchOriginalSql);
    console.log("With params:", [questionId]);
    
    let originalResult;
    try {
      originalResult = await db.execute(fetchOriginalSql, [questionId]);
      console.log("Original question query result rows:", originalResult.rows.length);
    } catch (fetchError) {
      console.error("Error fetching original question:", fetchError);
      return res.status(500).json({ 
        message: "Database error while fetching question", 
        error: fetchError instanceof Error ? fetchError.message : "Unknown error" 
      });
    }
    
    if (!originalResult || originalResult.rows.length === 0) {
      console.log("Question not found with ID:", questionId);
      return res.status(404).json({ message: "Question not found" });
    }
    
    const originalQuestion = originalResult.rows[0];
    console.log("Original question found:", { 
      id: originalQuestion.id,
      key: originalQuestion.library_question_key,
      type: originalQuestion.question_type 
    });
    
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
    
    // Handle properties with safe access
    const originalText = originalQuestion.default_text || '';
    const questionType = originalQuestion.question_type || 'textbox';
    
    console.log("Creating cloned question with key:", clonedQuestionKey);
    
    const insertParams = [
      clonedQuestionKey,
      `${originalText} (Copy)`,
      questionType,
      originalQuestion.default_metadata,
      originalQuestion.default_options,
      originalQuestion.category
    ];
    
    console.log("Clone insert params:", JSON.stringify(insertParams));
    
    let cloneResult;
    try {
      cloneResult = await db.execute(insertCloneSql, insertParams);
      console.log("Clone created successfully, new ID:", cloneResult.rows[0]?.id);
    } catch (insertError) {
      console.error("Error creating clone:", insertError);
      return res.status(500).json({ 
        message: "Database error while creating clone", 
        error: insertError instanceof Error ? insertError.message : "Unknown database error" 
      });
    }
    const newQuestion = cloneResult.rows[0];
    
    // 4. If it's a matrix question, also clone the rows and columns
    if (originalQuestion.question_type === 'matrix') {
      console.log("Cloning matrix-specific data for question:", newQuestion.id);
      
      try {
        // Clone matrix rows
        const fetchRowsSql = `SELECT * FROM library_matrix_rows WHERE library_question_id = $1`;
        console.log("Fetching matrix rows with query:", fetchRowsSql, [questionId]);
        
        const rowsResult = await db.execute(fetchRowsSql, [questionId]);
        console.log(`Found ${rowsResult.rows.length} matrix rows to clone`);
        
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
        console.log("Fetching matrix columns with query:", fetchColumnsSql, [questionId]);
        
        const columnsResult = await db.execute(fetchColumnsSql, [questionId]);
        console.log(`Found ${columnsResult.rows.length} matrix columns to clone`);
        
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
      } catch (matrixError) {
        console.error("Error cloning matrix data:", matrixError);
        // We'll continue anyway since the base question was created
        console.log("Continuing despite matrix cloning error");
      }
    }
    
    // 5. Return the newly created question
    console.log("Clone operation complete, returning success response");
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