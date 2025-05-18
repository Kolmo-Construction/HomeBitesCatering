# Form Builder API Documentation

This document provides details about the API endpoints for the dynamic form builder system. The form builder allows creating questionnaires with conditional logic and reusable question libraries.

## Base URL

All API endpoints are prefixed with `/api/form-builder`.

## Authentication

All API endpoints require authentication. Make sure you include the authentication cookie in your requests.

## API Overview

The Form Builder API consists of five main components:

1. **Forms API** - Manage overall form definitions
2. **Form Pages API** - Manage pages within forms
3. **Form Page Questions API** - Manage question instances on pages
4. **Form Rules API** - Manage conditional logic for questions and pages
5. **Resolved Form API** - Get fully resolved form definitions ready for rendering

## 1. Forms API

Manage the overall form structures (e.g., "Wedding Quote Form").

### Create a Form

```
POST /api/form-builder/forms
```

**Request Body:**
```json
{
  "formKey": "wedding_questionnaire",
  "formTitle": "Wedding Questionnaire",
  "description": "Form for gathering wedding details from clients",
  "version": 1,
  "status": "draft" // One of: draft, published, archived, template
}
```

**Response:**
```json
{
  "id": 1,
  "formKey": "wedding_questionnaire",
  "formTitle": "Wedding Questionnaire",
  "description": "Form for gathering wedding details from clients",
  "version": 1,
  "status": "draft",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

### List Forms

```
GET /api/form-builder/forms
```

**Query Parameters:**
- `status` (optional) - Filter by status (draft, published, archived, template)
- `page` (optional, default: 1) - Page number for pagination
- `limit` (optional, default: 10) - Number of items per page

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "formKey": "wedding_questionnaire",
      "formTitle": "Wedding Questionnaire",
      "description": "Form for gathering wedding details from clients",
      "version": 1,
      "status": "draft",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### Get Form by ID

```
GET /api/form-builder/forms/:id
```

**Response:**
```json
{
  "id": 1,
  "formKey": "wedding_questionnaire",
  "formTitle": "Wedding Questionnaire",
  "description": "Form for gathering wedding details from clients",
  "version": 1,
  "status": "draft",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

### Get Form by Key and Version

```
GET /api/form-builder/forms/key/:formKey/version/:version
```

**Response:**
```json
{
  "id": 1,
  "formKey": "wedding_questionnaire",
  "formTitle": "Wedding Questionnaire",
  "description": "Form for gathering wedding details from clients",
  "version": 1,
  "status": "draft",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

### Update Form

```
PUT /api/form-builder/forms/:id
```

**Request Body:**
```json
{
  "formTitle": "Updated Wedding Questionnaire",
  "description": "Updated form for gathering wedding details",
  "status": "published"
}
```

**Response:**
```json
{
  "id": 1,
  "formKey": "wedding_questionnaire",
  "formTitle": "Updated Wedding Questionnaire",
  "description": "Updated form for gathering wedding details",
  "version": 1,
  "status": "published",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

### Delete Form

```
DELETE /api/form-builder/forms/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Form deleted successfully"
}
```

> Note: Deleting a form with existing submissions is not allowed. Consider changing its status to "archived" instead.

## 2. Form Pages API

Manage pages within a form.

### Create a Page

```
POST /api/form-builder/forms/:formId/pages
```

**Request Body:**
```json
{
  "pageTitle": "Basic Information",
  "pageOrder": 0,
  "description": "Collect basic wedding information"
}
```

**Response:**
```json
{
  "id": 1,
  "formId": 1,
  "pageTitle": "Basic Information",
  "pageOrder": 0,
  "description": "Collect basic wedding information",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

### List Pages for a Form

```
GET /api/form-builder/forms/:formId/pages
```

**Response:**
```json
[
  {
    "id": 1,
    "formId": 1,
    "pageTitle": "Basic Information",
    "pageOrder": 0,
    "description": "Collect basic wedding information",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "id": 2,
    "formId": 1,
    "pageTitle": "Venue Information",
    "pageOrder": 1,
    "description": "Collect venue details",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
]
```

### Update a Page

```
PUT /api/form-builder/forms/:formId/pages/:pageId
```

**Request Body:**
```json
{
  "pageTitle": "Updated Basic Information",
  "description": "Updated description"
}
```

**Response:**
```json
{
  "id": 1,
  "formId": 1,
  "pageTitle": "Updated Basic Information",
  "pageOrder": 0,
  "description": "Updated description",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

### Delete a Page

```
DELETE /api/form-builder/forms/:formId/pages/:pageId
```

**Response:**
```json
{
  "success": true,
  "message": "Page deleted successfully"
}
```

### Reorder Pages

```
POST /api/form-builder/forms/:formId/pages/reorder
```

**Request Body:**
```json
[
  {
    "pageId": 1,
    "newPageOrder": 1
  },
  {
    "pageId": 2,
    "newPageOrder": 0
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
      "pageTitle": "Venue Information",
      "pageOrder": 0,
      "description": "Collect venue details",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    },
    {
      "id": 1,
      "formId": 1,
      "pageTitle": "Basic Information",
      "pageOrder": 1,
      "description": "Collect basic wedding information",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

## 3. Form Page Questions API

Manage the instances of library questions placed on form pages.

### Add a Question to a Page

```
POST /api/form-builder/pages/:pageId/questions
```

**Request Body:**
```json
{
  "libraryQuestionId": 1,
  "displayOrder": 0,
  "displayTextOverride": "What is the couple's names?",
  "helperTextOverride": "Please provide both names"
}
```

**Response:**
```json
{
  "id": 1,
  "formPageId": 1,
  "libraryQuestionId": 1,
  "displayOrder": 0,
  "displayTextOverride": "What is the couple's names?",
  "helperTextOverride": "Please provide both names",
  "isRequiredOverride": null,
  "isHiddenOverride": null,
  "placeholderOverride": null,
  "metadataOverrides": null,
  "optionsOverrides": null,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

### List Questions for a Page

```
GET /api/form-builder/pages/:pageId/questions
```

**Response:**
```json
[
  {
    "id": 1,
    "formPageId": 1,
    "libraryQuestionId": 1,
    "displayOrder": 0,
    "questionType": "text",
    "displayText": "What is the couple's names?",
    "isRequired": true,
    "isHidden": false,
    "placeholder": "Enter your full name",
    "helperText": "Please provide both names",
    "metadata": {
      "textType": "short"
    },
    "options": null,
    "validationRules": null,
    "overrides": {
      "displayTextOverride": "What is the couple's names?",
      "helperTextOverride": "Please provide both names",
      "isRequiredOverride": null,
      "isHiddenOverride": null,
      "placeholderOverride": null,
      "metadataOverrides": null,
      "optionsOverrides": null
    }
  }
]
```

### Update a Question

```
PUT /api/form-builder/pages/:pageId/questions/:questionId
```

**Request Body:**
```json
{
  "displayTextOverride": "Updated question text",
  "isRequiredOverride": false
}
```

**Response:**
```json
{
  "id": 1,
  "formPageId": 1,
  "libraryQuestionId": 1,
  "displayOrder": 0,
  "displayTextOverride": "Updated question text",
  "helperTextOverride": "Please provide both names",
  "isRequiredOverride": false,
  "isHiddenOverride": null,
  "placeholderOverride": null,
  "metadataOverrides": null,
  "optionsOverrides": null,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

### Delete a Question

```
DELETE /api/form-builder/pages/:pageId/questions/:questionId
```

**Response:**
```json
{
  "success": true,
  "message": "Question deleted successfully"
}
```

### Reorder Questions

```
POST /api/form-builder/pages/:pageId/questions/reorder
```

**Request Body:**
```json
[
  {
    "questionInstanceId": 1,
    "newDisplayOrder": 1
  },
  {
    "questionInstanceId": 2,
    "newDisplayOrder": 0
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
      "libraryQuestionId": 2,
      "displayOrder": 0,
      "displayTextOverride": null,
      "helperTextOverride": null,
      "isRequiredOverride": null,
      "isHiddenOverride": null,
      "placeholderOverride": null,
      "metadataOverrides": null,
      "optionsOverrides": null,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    },
    {
      "id": 1,
      "formPageId": 1,
      "libraryQuestionId": 1,
      "displayOrder": 1,
      "displayTextOverride": "Updated question text",
      "helperTextOverride": "Please provide both names",
      "isRequiredOverride": false,
      "isHiddenOverride": null,
      "placeholderOverride": null,
      "metadataOverrides": null,
      "optionsOverrides": null,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

## 4. Form Rules API

Manage conditional logic rules for a form.

### Create a Rule

```
POST /api/form-builder/forms/:formId/rules
```

**Request Body:**
```json
{
  "triggerFormPageQuestionId": 3,
  "conditionType": "is_selected_option_value",
  "conditionValue": "outdoor",
  "actionType": "show",
  "ruleDescription": "Show guest count question if venue is outdoor",
  "executionOrder": 0,
  "targets": [
    {
      "targetType": "question",
      "targetId": 4
    }
  ]
}
```

**Response:**
```json
{
  "id": 1,
  "formId": 1,
  "triggerFormPageQuestionId": 3,
  "conditionType": "is_selected_option_value",
  "conditionValue": "outdoor",
  "actionType": "show",
  "ruleDescription": "Show guest count question if venue is outdoor",
  "executionOrder": 0,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "targets": [
    {
      "id": 1,
      "ruleId": 1,
      "targetType": "question",
      "targetId": 4,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

### List Rules for a Form

```
GET /api/form-builder/forms/:formId/rules
```

**Response:**
```json
[
  {
    "id": 1,
    "formId": 1,
    "triggerFormPageQuestionId": 3,
    "conditionType": "is_selected_option_value",
    "conditionValue": "outdoor",
    "actionType": "show",
    "ruleDescription": "Show guest count question if venue is outdoor",
    "executionOrder": 0,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "targets": [
      {
        "id": 1,
        "ruleId": 1,
        "targetType": "question",
        "targetId": 4,
        "createdAt": "2025-01-01T00:00:00.000Z"
      }
    ]
  }
]
```

### Update a Rule

```
PUT /api/form-builder/forms/:formId/rules/:ruleId
```

**Request Body:**
```json
{
  "conditionValue": "indoor",
  "ruleDescription": "Updated rule description",
  "targets": [
    {
      "targetType": "question",
      "targetId": 4
    },
    {
      "targetType": "question",
      "targetId": 5
    }
  ]
}
```

**Response:**
```json
{
  "id": 1,
  "formId": 1,
  "triggerFormPageQuestionId": 3,
  "conditionType": "is_selected_option_value",
  "conditionValue": "indoor",
  "actionType": "show",
  "ruleDescription": "Updated rule description",
  "executionOrder": 0,
  "targets": [
    {
      "id": 2,
      "ruleId": 1,
      "targetType": "question",
      "targetId": 4,
      "createdAt": "2025-01-01T00:00:00.000Z"
    },
    {
      "id": 3,
      "ruleId": 1,
      "targetType": "question",
      "targetId": 5,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

### Delete a Rule

```
DELETE /api/form-builder/forms/:formId/rules/:ruleId
```

**Response:**
```json
{
  "success": true,
  "message": "Rule deleted successfully"
}
```

## 5. Resolved Form API

Fetch a complete, ready-to-render form definition that merges library questions with instance-specific overrides.

### Get Resolved Form Definition

```
GET /api/form-builder/forms/:formKey/versions/:versionNumber/render
```

This endpoint assembles a complete form definition ready for client-side rendering.

## 6. Form Submission API

Submit and validate filled-out forms from clients.

### Submit a Form

```
POST /api/form-builder/forms/:formKey/versions/:versionNumber/submit
```

This endpoint receives, validates, and stores a form submission from a client.

**URL Parameters:**
- `formKey` - The unique key identifier for the form (e.g., "wedding_questionnaire")
- `versionNumber` - The version number of the form to submit

**Request Body:**
```json
{
  "clientId": 5,             // Optional: ID of the client making the submission
  "opportunityId": 12,       // Optional: ID of the related opportunity
  "rawLeadId": null,         // Optional: ID of a raw lead this submission is for
  "answers": {
    "1": "John and Sarah",   // The key is the questionInstanceId, value varies by question type
    "2": "email@example.com",
    "3": ["option1", "option3"],  // For checkbox questions (multiple selections)
    "4": "option2",         // For radio/select questions (single selection)
    "5": 150,               // For number questions
    "6": "2025-06-15",      // For date questions
    "7": {                  // For matrix questions
      "row1_col1": "value1",
      "row1_col2": "value2",
      "row2_col1": "value3"
    }
  }
}
```

**Response:**
```json
{
  "message": "Form submitted successfully",
  "submissionId": 42,
  "submission": {
    "id": 42,
    "formId": 1,
    "formVersion": 3,
    "clientId": 5,
    "opportunityId": 12,
    "rawLeadId": null,
    "status": "completed",
    "submittedAt": "2025-05-18T16:45:00.000Z",
    "createdAt": "2025-05-18T16:45:00.000Z",
    "updatedAt": "2025-05-18T16:45:00.000Z"
  }
}
```

**Error Response (Validation Failed):**
```json
{
  "message": "Validation failed",
  "errors": {
    "1": "This field is required",
    "3": "Please select at least 2 options",
    "4": "Please select a valid option"
  }
}
```

**Notes:**
- The endpoint first fetches the complete form definition to validate submitted answers.
- Validation is performed for each answer based on question type and requirements.
- All answers are stored in a transaction to ensure data integrity.
- The response includes the created submission record with its ID.
- Validation errors are returned with specific messages for each invalid field.

## Question Library Integration

The Form Builder API works closely with the Question Library API. You need to create questions in the question library first before you can add them to form pages.

For more information on the Question Library API, please refer to the Question Library API documentation.

## Next Steps

Now that you have learned about the Form Builder API, you can use it to create dynamic questionnaires for your catering management system. The API allows for a fully customizable form building experience with conditional logic, a variety of question types, and a reusable question library.

For testing these endpoints, you can use the included test scripts in the project root, such as `test-form-builder-api.js` and `test-form-submission.js`.
              },
              {
                "id": 2,
                "key": "rating_2",
                "label": "2 - Fair",
                "displayOrder": 1
              },
              {
                "id": 3,
                "key": "rating_3",
                "label": "3 - Average",
                "displayOrder": 2
              },
              {
                "id": 4,
                "key": "rating_4",
                "label": "4 - Good",
                "displayOrder": 3
              },
              {
                "id": 5,
                "key": "rating_5",
                "label": "5 - Excellent",
                "displayOrder": 4
              }
            ]
          }
        }
      ]
    }
  ],
  "rules": [
    {
      "ruleId": 1,
      "triggerFormPageQuestionId": 3,
      "conditionType": "is_selected_option_value",
      "conditionValue": "outdoor",
      "actionType": "show",
      "ruleDescription": "Show guest count question if venue is outdoor",
      "executionOrder": 0,
      "targets": [
        {
          "targetId": 4,
          "targetType": "question"
        }
      ]
    }
  ]
}
```

**Notes:**
- This endpoint returns a published form by default. It filters for forms with status "published".
- Every question in the response is fully resolved with all defaults and overrides merged.
- Matrix questions include the full structure of their rows and columns.
- All rules and their targets are included for the client to apply conditional logic.

## Question Library Integration

The Form Builder API works closely with the Question Library API. You need to create questions in the question library first before you can add them to form pages.

For more information on the Question Library API, please refer to the Question Library API documentation.

## Error Handling

All endpoints return appropriate HTTP status codes:

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