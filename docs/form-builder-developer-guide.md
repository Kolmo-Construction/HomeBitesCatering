# Form Builder Developer Documentation

## System Architecture

The Form Builder is a comprehensive, database-driven dynamic form creation system that enables the creation, management, and rendering of complex forms with conditional logic. The system follows a modular architecture divided into several key components:

### Database Schema

The form builder utilizes a PostgreSQL database with the following core tables:

1. **Question Library (`question_library`)**
   - Central repository of all question templates
   - Questions are defined once and can be reused across multiple forms
   - Supports various question types: text, dropdown, checkbox, radio, matrix, etc.
   - Contains default values, validation rules, and presentation details

2. **Forms (`forms`)**
   - Top-level container that represents a complete questionnaire
   - Contains metadata like title, description, status, and versioning
   - Forms can be in various states: draft, published, archived

3. **Form Pages (`form_pages`)**
   - Subdivision of forms into logical sections
   - Contains page title, description, and ordering information
   - Pages are ordered sequentially using the `pageOrder` field

4. **Form Page Questions (`form_page_questions`)**
   - Maps library questions to specific pages within a form
   - Contains question display order and instance-specific overrides
   - Allows customization of library questions in the context of a specific form

5. **Matrix-specific tables**
   - `library_matrix_rows` and `library_matrix_columns` for complex grid-style questions
   - Manages row/column definitions, labels, and input types

6. **Conditional Logic (`form_rules` and `form_rule_targets`)**
   - Defines dynamic behavior based on user responses
   - Supports showing/hiding questions, marking as required, or navigating to pages
   - Uses a trigger-condition-action model for rule execution

### Backend API Structure

The API follows a RESTful design with the following main endpoints:

#### Question Library Management
```
GET    /api/form-builder/library-questions         - List questions with pagination
POST   /api/form-builder/library-questions         - Create a new library question
GET    /api/form-builder/library-questions/:id     - Get question details
PUT    /api/form-builder/library-questions/:id     - Update a library question
DELETE /api/form-builder/library-questions/:id     - Delete a question
```

#### Form Management
```
GET    /api/form-builder/forms                     - List all forms
POST   /api/form-builder/forms                     - Create a new form
GET    /api/form-builder/forms/:id                 - Get form details
PUT    /api/form-builder/forms/:id                 - Update form details
DELETE /api/form-builder/forms/:id                 - Delete a form
```

#### Page Management
```
GET    /api/form-builder/forms/:formId/pages       - List pages for a form
POST   /api/form-builder/forms/:formId/pages       - Add a page to a form
GET    /api/form-builder/pages/:id                 - Get page details
PUT    /api/form-builder/forms/:formId/pages/:id   - Update a page
DELETE /api/form-builder/forms/:formId/pages/:id   - Delete a page
POST   /api/form-builder/forms/:formId/pages/reorder - Reorder pages
```

#### Question Instance Management
```
GET    /api/form-builder/pages/:pageId/questions   - List questions on a page
POST   /api/form-builder/pages/:pageId/questions   - Add a question to a page
PUT    /api/form-builder/questions/:id             - Update question instance
DELETE /api/form-builder/questions/:id             - Remove question from page
POST   /api/form-builder/pages/:pageId/questions/reorder - Reorder questions
```

#### Conditional Logic
```
GET    /api/form-builder/forms/:formId/rules       - List rules for a form
POST   /api/form-builder/forms/:formId/rules       - Create a rule
PUT    /api/form-builder/rules/:id                 - Update a rule
DELETE /api/form-builder/rules/:id                 - Delete a rule
```

### Front-end Components

The Form Builder UI is built with React and organized into several key components:

1. **FormManager** - Lists all forms and provides options to create, edit, or delete forms
2. **FormEditor** - Main editor interface with three panels:
   - Left panel: Page list and question library
   - Center panel: Canvas for arranging questions
   - Right panel: Settings panel for form/page/question properties
3. **QuestionSettingsPanel** - Tabbed interface for configuring question properties
4. **LibraryQuestionsList** - Searchable list of available question templates
5. **FormPreview** - Interactive preview showing how the form will appear to end users

## Implementation Details

### Creating Forms

Forms are the top-level container in the system. Each form has basic properties:

```typescript
// Form creation payload
{
  "formKey": "unique-form-identifier",  // Used in URLs and API calls
  "formTitle": "Customer Feedback Form",
  "description": "Gather feedback from our customers",
  "status": "draft"  // draft, published, archived
}
```

- Forms maintain a version number that increments when published
- `formKey` must be unique across the system

### Managing Pages

Pages divide forms into logical sections. Page creation requires:

```typescript
// Page creation payload
{
  "pageTitle": "Contact Information",
  "pageOrder": 0,  // Determines the sequence
  "description": "Please provide your contact details"
}
```

- The `pageOrder` must be unique within a form
- When reordering pages, the system will update all affected pages

### Adding Questions from Library

Questions are first created in the library, then added to forms:

```typescript
// Creating a library question
{
  "libraryQuestionKey": "customer_name",
  "defaultText": "What is your name?",
  "questionType": "textbox",
  "defaultMetadata": { "maxLength": 100 },
  "category": "personal"
}

// Adding to a page
{
  "libraryQuestionId": 123,
  "displayOrder": 0,
  "displayTextOverride": "Your Full Name"  // Optional override
}
```

### Question Type-Specific Properties

Different question types have specific metadata structures:

1. **Text Inputs**
   ```json
   {
     "textType": "single", // single, multi, email, phone, number
     "minLength": 0,
     "maxLength": 100,
     "regex": null
   }
   ```

2. **Choice Questions**
   ```json
   {
     "options": [
       { "value": "option1", "label": "First Option" },
       { "value": "option2", "label": "Second Option" }
     ],
     "allowOther": false,
     "minSelections": 1,
     "maxSelections": 1
   }
   ```

3. **Matrix Questions**
   ```
   Matrix questions use the separate tables for rows and columns
   Each cell represents the intersection of a row and column
   ```

## Implementing Overrides

One of the key features is the ability to override library question properties within a specific form:

```typescript
// Question instance with overrides
{
  "libraryQuestionId": 123,
  "displayTextOverride": "Custom question text for this form",
  "isRequiredOverride": true,  // Override the default required status
  "isHiddenOverride": false,
  "placeholderOverride": "Enter your answer here",
  "helperTextOverride": "This helps us contact you",
  "metadataOverrides": { "maxLength": 50 },  // Override specific metadata
  "optionsOverrides": [  // Replace or modify options for choice questions
    { "value": "custom1", "label": "Custom Option 1" }
  ]
}
```

- Any override field set to null will fall back to the library default
- For matrix questions, you can selectively enable/disable specific rows or columns

## Conditional Logic Implementation

The conditional logic system uses a rule-based approach:

```typescript
// Example rule
{
  "formId": 1,
  "triggerFormPageQuestionId": 123,  // Question that triggers the rule
  "conditionType": "equals",  // equals, not_equals, contains, greater_than, etc.
  "conditionValue": "yes",
  "actionType": "show_question",  // show_question, hide_question, make_required, etc.
  "executionOrder": 1  // Determines rule precedence
}
```

- Each rule has one or more targets (affected questions)
- Rules can reference other rules to create complex logic chains
- Frontend evaluates rules in real-time during form completion

## Form Preview and Rendering

The preview functionality uses the same components as the public-facing form renderer:

1. Load the complete form definition including pages, questions, and rules
2. Assemble questions with proper overrides applied
3. Initialize form state with default values
4. Set up rule evaluation and state management
5. Render the form with proper navigation between pages

## Handling Form Submissions

Form submissions are processed in multiple stages:

1. Client-side validation against question rules and constraints
2. Server-side validation for security
3. Storage of responses with references to the specific form version
4. Optional processing hooks for integration with other systems

## Technical Considerations

### Database Transactions

Use transactions for operations that affect multiple tables to ensure data consistency:

```typescript
// Example transaction pattern
await db.$transaction(async (trx) => {
  // Create the main entity
  const [newEntity] = await trx.insert(table).values(data).returning();
  
  // Add related entities
  for (const related of relatedItems) {
    await trx.insert(relatedTable).values({
      parentId: newEntity.id,
      ...related
    });
  }
  
  return newEntity;
});
```

### Performance Optimization

1. Use indexes on frequently queried fields:
   - `formId` and `pageOrder` in `form_pages`
   - `formPageId` and `displayOrder` in `form_page_questions`

2. Consider caching form definitions for published forms:
   - Redis or similar caching for active forms
   - Cache invalidation on form updates

3. Batch question loading to reduce database queries:
   - Load all questions for a page in a single query
   - Include matrix rows/columns in the same query when possible

### Security Considerations

1. Validate all inputs, especially when importing question options
2. Implement role-based access control for form editing
3. Consider rate limiting for form submission endpoints
4. Sanitize user inputs when displaying in forms

## Debugging Tips

1. **Common Issues:**
   - Field name mismatches between frontend and backend (e.g., `title` vs `pageTitle`)
   - Unique constraint violations when reordering (check existing values first)
   - Missing related records (e.g., matrix rows/columns)

2. **Useful SQL Queries for Debugging:**
   ```sql
   -- Check form structure
   SELECT f.id, f.form_title, COUNT(fp.id) AS page_count
   FROM forms f
   LEFT JOIN form_pages fp ON f.id = fp.form_id
   GROUP BY f.id;
   
   -- Check question placement
   SELECT fp.page_title, COUNT(fpq.id) AS question_count
   FROM form_pages fp
   LEFT JOIN form_page_questions fpq ON fp.id = fpq.form_page_id
   WHERE fp.form_id = :formId
   GROUP BY fp.id, fp.page_title
   ORDER BY fp.page_order;
   ```

3. **Transaction Logging:**
   - Enable query logging during development
   - Add audit fields for tracking who created/modified records

## Development Workflow

1. Start with library question design
2. Create base form structure and pages
3. Add questions to pages with minimal overrides
4. Test form navigation and basic layout
5. Implement conditional logic
6. Test full form with simulated data
7. Verify form submission and data storage