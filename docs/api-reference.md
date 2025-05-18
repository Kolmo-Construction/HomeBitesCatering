# Form Builder API Reference

This document provides a comprehensive reference for the Form Builder API endpoints, request/response formats, and usage examples.

## Base URL

All API endpoints are relative to the base URL of your installation: `http://your-domain.com/api`

## Authentication

Most endpoints require authentication. Include a valid session cookie obtained by logging in through the web interface.

## Error Handling

The API returns standard HTTP status codes:

- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Authentication required
- `404 Not Found` - Resource not found
- `409 Conflict` - Request could not be completed due to a conflict
- `500 Internal Server Error` - Server error

Error responses include a message describing the error:

```json
{
  "message": "Error message"
}
```

For validation errors, additional details may be provided:

```json
{
  "message": "Invalid form data",
  "errors": {
    "formTitle": {
      "_errors": ["Required"]
    }
  }
}
```

## Form Management

### List Forms

Retrieves all forms with pagination.

**Endpoint:** `GET /form-builder/forms`

**Query Parameters:**
- `page` (number, optional) - Page number (defaults to 1)
- `pageSize` (number, optional) - Items per page (defaults to 25)
- `status` (string, optional) - Filter by status (draft, published, archived)

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "formKey": "wedding-questionnaire",
      "formTitle": "Wedding Questionnaire",
      "description": "Comprehensive wedding planning questionnaire",
      "version": 1,
      "status": "published",
      "createdAt": "2025-05-10T15:30:00Z",
      "updatedAt": "2025-05-15T10:45:22Z"
    },
    ...
  ],
  "pagination": {
    "total": 42,
    "page": 1,
    "pageSize": 25,
    "totalPages": 2
  }
}
```

### Create Form

Creates a new form.

**Endpoint:** `POST /form-builder/forms`

**Request Body:**

```json
{
  "formKey": "wedding-questionnaire",
  "formTitle": "Wedding Questionnaire",
  "description": "Comprehensive wedding planning questionnaire",
  "status": "draft"
}
```

**Response:**

```json
{
  "id": 1,
  "formKey": "wedding-questionnaire",
  "formTitle": "Wedding Questionnaire",
  "description": "Comprehensive wedding planning questionnaire",
  "version": 1,
  "status": "draft",
  "createdAt": "2025-05-18T21:10:05.376Z",
  "updatedAt": "2025-05-18T21:10:05.376Z"
}
```

### Get Form

Retrieves a specific form by ID.

**Endpoint:** `GET /form-builder/forms/:id`

**Response:**

```json
{
  "id": 1,
  "formKey": "wedding-questionnaire",
  "formTitle": "Wedding Questionnaire",
  "description": "Comprehensive wedding planning questionnaire",
  "version": 1,
  "status": "draft",
  "createdAt": "2025-05-18T21:10:05.376Z",
  "updatedAt": "2025-05-18T21:10:05.376Z"
}
```

### Update Form

Updates an existing form.

**Endpoint:** `PUT /form-builder/forms/:id`

**Request Body:**

```json
{
  "formTitle": "Updated Wedding Questionnaire",
  "description": "Comprehensive wedding planning questionnaire with additional sections",
  "status": "draft"
}
```

**Response:**

```json
{
  "id": 1,
  "formKey": "wedding-questionnaire",
  "formTitle": "Updated Wedding Questionnaire",
  "description": "Comprehensive wedding planning questionnaire with additional sections",
  "version": 1,
  "status": "draft",
  "createdAt": "2025-05-18T21:10:05.376Z",
  "updatedAt": "2025-05-18T21:15:32.123Z"
}
```

### Delete Form

Deletes a form and all related pages, questions, and rules.

**Endpoint:** `DELETE /form-builder/forms/:id`

**Response:**

```json
{
  "success": true,
  "message": "Form deleted successfully"
}
```

## Page Management

### List Pages

Retrieves all pages for a specific form.

**Endpoint:** `GET /form-builder/forms/:formId/pages`

**Response:**

```json
[
  {
    "id": 1,
    "formId": 1,
    "pageTitle": "Contact Information",
    "pageOrder": 0,
    "description": "Basic contact details",
    "createdAt": "2025-05-18T21:10:11.787Z",
    "updatedAt": "2025-05-18T21:10:11.787Z"
  },
  {
    "id": 2,
    "formId": 1,
    "pageTitle": "Event Details",
    "pageOrder": 1,
    "description": "Information about your event",
    "createdAt": "2025-05-18T21:10:20.456Z",
    "updatedAt": "2025-05-18T21:10:20.456Z"
  }
]
```

### Create Page

Adds a new page to a form.

**Endpoint:** `POST /form-builder/forms/:formId/pages`

**Request Body:**

```json
{
  "pageTitle": "Contact Information",
  "pageOrder": 0,
  "description": "Basic contact details"
}
```

**Response:**

```json
{
  "id": 1,
  "formId": 1,
  "pageTitle": "Contact Information",
  "pageOrder": 0,
  "description": "Basic contact details",
  "createdAt": "2025-05-18T21:10:11.787Z",
  "updatedAt": "2025-05-18T21:10:11.787Z"
}
```

### Update Page

Updates an existing page.

**Endpoint:** `PUT /form-builder/forms/:formId/pages/:pageId`

**Request Body:**

```json
{
  "pageTitle": "Updated Contact Information",
  "description": "Updated description"
}
```

**Response:**

```json
{
  "id": 1,
  "formId": 1,
  "pageTitle": "Updated Contact Information",
  "pageOrder": 0,
  "description": "Updated description",
  "createdAt": "2025-05-18T21:10:11.787Z",
  "updatedAt": "2025-05-18T21:20:45.321Z"
}
```

### Delete Page

Removes a page and all its questions.

**Endpoint:** `DELETE /form-builder/forms/:formId/pages/:pageId`

**Response:**

```json
{
  "success": true,
  "message": "Page deleted successfully"
}
```

### Reorder Pages

Reorders multiple pages in a single operation.

**Endpoint:** `POST /form-builder/forms/:formId/pages/reorder`

**Request Body:**

```json
[
  {
    "pageId": 2,
    "newPageOrder": 0
  },
  {
    "pageId": 1,
    "newPageOrder": 1
  }
]
```

**Response:**

```json
{
  "success": true,
  "message": "Pages reordered successfully",
  "pages": [
    {
      "id": 2,
      "formId": 1,
      "pageTitle": "Event Details",
      "pageOrder": 0,
      "description": "Information about your event",
      "createdAt": "2025-05-18T21:10:20.456Z",
      "updatedAt": "2025-05-18T21:25:12.789Z"
    },
    {
      "id": 1,
      "formId": 1,
      "pageTitle": "Contact Information",
      "pageOrder": 1,
      "description": "Basic contact details",
      "createdAt": "2025-05-18T21:10:11.787Z",
      "updatedAt": "2025-05-18T21:25:12.789Z"
    }
  ]
}
```

## Question Management

### List Page Questions

Retrieves all questions for a specific page.

**Endpoint:** `GET /form-builder/pages/:pageId/questions`

**Response:**

```json
[
  {
    "id": 1,
    "formPageId": 1,
    "libraryQuestionId": 3,
    "displayOrder": 0,
    "displayTextOverride": "Your Full Name",
    "isRequiredOverride": true,
    "isHiddenOverride": null,
    "placeholderOverride": "Enter your full name",
    "helperTextOverride": null,
    "metadataOverrides": null,
    "optionsOverrides": null,
    "createdAt": "2025-05-18T21:09:58.149Z",
    "updatedAt": "2025-05-18T21:09:58.149Z",
    "libraryQuestion": {
      "id": 3,
      "libraryQuestionKey": "text_question_1",
      "defaultText": "What is your name?",
      "questionType": "textbox",
      "defaultMetadata": {
        "textType": "single",
        "minLength": 2,
        "maxLength": 100
      },
      "defaultOptions": null,
      "category": "personal",
      "createdAt": "2025-05-18T15:35:52.789Z",
      "updatedAt": "2025-05-18T15:35:52.789Z"
    }
  }
]
```

### Add Question to Page

Adds a library question to a page.

**Endpoint:** `POST /form-builder/pages/:pageId/questions`

**Request Body:**

```json
{
  "libraryQuestionId": 3,
  "displayOrder": 0,
  "displayTextOverride": "Your Full Name",
  "isRequiredOverride": true,
  "placeholderOverride": "Enter your full name"
}
```

**Response:**

```json
{
  "id": 1,
  "formPageId": 1,
  "libraryQuestionId": 3,
  "displayOrder": 0,
  "displayTextOverride": "Your Full Name",
  "isRequiredOverride": true,
  "isHiddenOverride": null,
  "placeholderOverride": "Enter your full name",
  "helperTextOverride": null,
  "metadataOverrides": null,
  "optionsOverrides": null,
  "createdAt": "2025-05-18T21:09:58.149Z",
  "updatedAt": "2025-05-18T21:09:58.149Z"
}
```

### Update Question Instance

Updates a question instance (overrides).

**Endpoint:** `PUT /form-builder/questions/:id`

**Request Body:**

```json
{
  "displayTextOverride": "Updated Question Text",
  "isRequiredOverride": false,
  "helperTextOverride": "This helps us contact you"
}
```

**Response:**

```json
{
  "id": 1,
  "formPageId": 1,
  "libraryQuestionId": 3,
  "displayOrder": 0,
  "displayTextOverride": "Updated Question Text",
  "isRequiredOverride": false,
  "isHiddenOverride": null,
  "placeholderOverride": "Enter your full name",
  "helperTextOverride": "This helps us contact you",
  "metadataOverrides": null,
  "optionsOverrides": null,
  "createdAt": "2025-05-18T21:09:58.149Z",
  "updatedAt": "2025-05-18T21:30:25.654Z"
}
```

### Remove Question from Page

Removes a question from a page.

**Endpoint:** `DELETE /form-builder/questions/:id`

**Response:**

```json
{
  "success": true,
  "message": "Question removed successfully"
}
```

### Reorder Questions

Reorders multiple questions on a page.

**Endpoint:** `POST /form-builder/pages/:pageId/questions/reorder`

**Request Body:**

```json
[
  {
    "questionId": 2,
    "newDisplayOrder": 0
  },
  {
    "questionId": 1,
    "newDisplayOrder": 1
  }
]
```

**Response:**

```json
{
  "success": true,
  "message": "Questions reordered successfully",
  "questions": [
    {
      "id": 2,
      "formPageId": 1,
      "libraryQuestionId": 4,
      "displayOrder": 0,
      "updatedAt": "2025-05-18T21:35:42.123Z"
    },
    {
      "id": 1,
      "formPageId": 1,
      "libraryQuestionId": 3,
      "displayOrder": 1,
      "updatedAt": "2025-05-18T21:35:42.123Z"
    }
  ]
}
```

## Question Library Management

### List Library Questions

Retrieves questions from the library with pagination and filtering.

**Endpoint:** `GET /form-builder/library-questions`

**Query Parameters:**
- `page` (number, optional) - Page number (defaults to 1)
- `pageSize` (number, optional) - Items per page (defaults to 25)
- `category` (string, optional) - Filter by category
- `questionType` (string, optional) - Filter by type

**Response:**

```json
{
  "data": [
    {
      "id": 2,
      "libraryQuestionKey": "matrix_question_1",
      "defaultText": "Please rate our services:",
      "questionType": "matrix",
      "defaultMetadata": null,
      "defaultOptions": null,
      "category": "feedback",
      "createdAt": "2025-05-18T15:33:22.764Z",
      "updatedAt": "2025-05-18T15:33:22.764Z"
    },
    {
      "id": 3,
      "libraryQuestionKey": "text_question_1",
      "defaultText": "What is your name?",
      "questionType": "textbox",
      "defaultMetadata": {
        "textType": "single",
        "minLength": 2,
        "maxLength": 100
      },
      "defaultOptions": null,
      "category": "personal",
      "createdAt": "2025-05-18T15:35:52.789Z",
      "updatedAt": "2025-05-18T15:35:52.789Z"
    }
  ],
  "pagination": {
    "total": 3,
    "page": 1,
    "pageSize": 25,
    "totalPages": 1
  }
}
```

### Get Library Question

Retrieves a specific library question by ID.

**Endpoint:** `GET /form-builder/library-questions/:id`

**Response:**

```json
{
  "id": 3,
  "libraryQuestionKey": "text_question_1",
  "defaultText": "What is your name?",
  "questionType": "textbox",
  "defaultMetadata": {
    "textType": "single",
    "minLength": 2,
    "maxLength": 100
  },
  "defaultOptions": null,
  "category": "personal",
  "createdAt": "2025-05-18T15:35:52.789Z",
  "updatedAt": "2025-05-18T15:35:52.789Z"
}
```

### Create Library Question

Creates a new question in the library.

**Endpoint:** `POST /form-builder/library-questions`

**Request Body:**

```json
{
  "libraryQuestionKey": "email_question_1",
  "defaultText": "What is your email address?",
  "questionType": "email",
  "defaultMetadata": {
    "isRequired": true,
    "validation": "email"
  },
  "category": "contact"
}
```

**Response:**

```json
{
  "id": 7,
  "libraryQuestionKey": "email_question_1",
  "defaultText": "What is your email address?",
  "questionType": "email",
  "defaultMetadata": {
    "isRequired": true,
    "validation": "email"
  },
  "defaultOptions": null,
  "category": "contact",
  "createdAt": "2025-05-18T21:40:12.456Z",
  "updatedAt": "2025-05-18T21:40:12.456Z"
}
```

### Update Library Question

Updates an existing library question.

**Endpoint:** `PUT /form-builder/library-questions/:id`

**Request Body:**

```json
{
  "defaultText": "Please provide your email address",
  "defaultMetadata": {
    "isRequired": true,
    "validation": "email",
    "errorMessage": "Please enter a valid email address"
  }
}
```

**Response:**

```json
{
  "id": 7,
  "libraryQuestionKey": "email_question_1",
  "defaultText": "Please provide your email address",
  "questionType": "email",
  "defaultMetadata": {
    "isRequired": true,
    "validation": "email",
    "errorMessage": "Please enter a valid email address"
  },
  "defaultOptions": null,
  "category": "contact",
  "createdAt": "2025-05-18T21:40:12.456Z",
  "updatedAt": "2025-05-18T21:45:30.789Z"
}
```

### Delete Library Question

Deletes a question from the library.

**Endpoint:** `DELETE /form-builder/library-questions/:id`

**Response:**

```json
{
  "message": "Question deleted successfully",
  "id": 7
}
```

## Conditional Logic

### List Form Rules

Retrieves all conditional logic rules for a form.

**Endpoint:** `GET /form-builder/forms/:formId/rules`

**Response:**

```json
[
  {
    "id": 1,
    "formId": 1,
    "triggerFormPageQuestionId": 5,
    "conditionType": "equals",
    "conditionValue": "yes",
    "actionType": "show_question",
    "executionOrder": 1,
    "createdAt": "2025-05-18T21:50:10.123Z",
    "updatedAt": "2025-05-18T21:50:10.123Z",
    "targets": [
      {
        "id": 1,
        "ruleId": 1,
        "targetFormPageQuestionId": 6,
        "createdAt": "2025-05-18T21:50:10.123Z",
        "updatedAt": "2025-05-18T21:50:10.123Z"
      }
    ]
  }
]
```

### Create Rule

Creates a new conditional logic rule.

**Endpoint:** `POST /form-builder/forms/:formId/rules`

**Request Body:**

```json
{
  "triggerFormPageQuestionId": 5,
  "conditionType": "equals",
  "conditionValue": "yes",
  "actionType": "show_question",
  "executionOrder": 1,
  "targets": [6, 7]
}
```

**Response:**

```json
{
  "id": 1,
  "formId": 1,
  "triggerFormPageQuestionId": 5,
  "conditionType": "equals",
  "conditionValue": "yes",
  "actionType": "show_question",
  "executionOrder": 1,
  "createdAt": "2025-05-18T21:50:10.123Z",
  "updatedAt": "2025-05-18T21:50:10.123Z",
  "targets": [
    {
      "id": 1,
      "ruleId": 1,
      "targetFormPageQuestionId": 6,
      "createdAt": "2025-05-18T21:50:10.123Z",
      "updatedAt": "2025-05-18T21:50:10.123Z"
    },
    {
      "id": 2,
      "ruleId": 1,
      "targetFormPageQuestionId": 7,
      "createdAt": "2025-05-18T21:50:10.123Z",
      "updatedAt": "2025-05-18T21:50:10.123Z"
    }
  ]
}
```

### Update Rule

Updates an existing conditional logic rule.

**Endpoint:** `PUT /form-builder/rules/:id`

**Request Body:**

```json
{
  "conditionType": "contains",
  "conditionValue": "outdoor",
  "targets": [6, 8]
}
```

**Response:**

```json
{
  "id": 1,
  "formId": 1,
  "triggerFormPageQuestionId": 5,
  "conditionType": "contains",
  "conditionValue": "outdoor",
  "actionType": "show_question",
  "executionOrder": 1,
  "createdAt": "2025-05-18T21:50:10.123Z",
  "updatedAt": "2025-05-18T21:55:45.678Z",
  "targets": [
    {
      "id": 1,
      "ruleId": 1,
      "targetFormPageQuestionId": 6,
      "createdAt": "2025-05-18T21:50:10.123Z",
      "updatedAt": "2025-05-18T21:50:10.123Z"
    },
    {
      "id": 3,
      "ruleId": 1,
      "targetFormPageQuestionId": 8,
      "createdAt": "2025-05-18T21:55:45.678Z",
      "updatedAt": "2025-05-18T21:55:45.678Z"
    }
  ]
}
```

### Delete Rule

Deletes a conditional logic rule.

**Endpoint:** `DELETE /form-builder/rules/:id`

**Response:**

```json
{
  "success": true,
  "message": "Rule deleted successfully"
}
```

## Form Submissions

### Get Form Definition

Retrieves the complete form definition for client-side rendering.

**Endpoint:** `GET /forms/:formKey/definition`

**Query Parameters:**
- `version` (number, optional) - Specific version to retrieve (defaults to latest published)

**Response:**

```json
{
  "form": {
    "id": 1,
    "formKey": "wedding-questionnaire",
    "formTitle": "Wedding Questionnaire",
    "description": "Comprehensive wedding planning questionnaire",
    "version": 1
  },
  "pages": [
    {
      "id": 1,
      "pageTitle": "Contact Information",
      "pageOrder": 0,
      "description": "Basic contact details",
      "questions": [
        {
          "id": 1,
          "questionId": "1_3",
          "type": "textbox",
          "text": "Your Full Name",
          "isRequired": true,
          "isHidden": false,
          "placeholder": "Enter your full name",
          "helperText": null,
          "metadata": {
            "textType": "single",
            "minLength": 2,
            "maxLength": 100
          },
          "options": null
        }
      ]
    }
  ],
  "rules": [
    {
      "ruleId": 1,
      "questionKey": "1_5",
      "triggerFormPageQuestionId": 5,
      "conditionType": "contains", 
      "conditionValue": "outdoor",
      "actionType": "show_question",
      "targets": ["1_6", "1_8"]
    }
  ]
}
```

### Submit Form Response

Submits a completed form response.

**Endpoint:** `POST /forms/:formKey/submit`

**Request Body:**

```json
{
  "version": 1,
  "responses": {
    "1_3": "John Smith",
    "1_4": "john.smith@example.com",
    "1_5": "outdoor garden wedding",
    "1_6": "150"
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Form submitted successfully",
  "submissionId": 42
}
```

### Validate Form Response

Validates form responses without submitting.

**Endpoint:** `POST /forms/:formKey/validate`

**Request Body:**

```json
{
  "version": 1,
  "responses": {
    "1_3": "John Smith",
    "1_4": "not-a-valid-email",
    "1_5": "outdoor garden wedding",
    "1_6": "150"
  }
}
```

**Response:**

```json
{
  "valid": false,
  "errors": {
    "1_4": "Please enter a valid email address"
  }
}
```

## Utilities

### Search Library Questions

Searches the question library with more advanced filtering.

**Endpoint:** `GET /form-builder/library-questions/search`

**Query Parameters:**
- `q` (string, required) - Search term
- `types` (string, optional) - Comma-separated list of question types
- `categories` (string, optional) - Comma-separated list of categories

**Response:**

```json
{
  "results": [
    {
      "id": 3,
      "libraryQuestionKey": "text_question_1",
      "defaultText": "What is your name?",
      "questionType": "textbox",
      "category": "personal"
    },
    {
      "id": 7,
      "libraryQuestionKey": "email_question_1",
      "defaultText": "Please provide your email address",
      "questionType": "email",
      "category": "contact"
    }
  ],
  "count": 2
}
```

### Generate Form Key

Generates a unique form key based on a title.

**Endpoint:** `GET /form-builder/generate-key`

**Query Parameters:**
- `title` (string, required) - Form title to base the key on

**Response:**

```json
{
  "formKey": "wedding-questionnaire-2025"
}
```

## Versioning

This API documentation covers version 1.0 of the Form Builder API. Future updates may include additional endpoints and parameters.