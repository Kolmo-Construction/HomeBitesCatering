# Form Builder API Documentation

This document provides details about the API endpoints for the dynamic form builder system. The form builder allows creating questionnaires with conditional logic and reusable question libraries.

## Base URL

All API endpoints are prefixed with `/api/form-builder`.

## Authentication

All API endpoints require authentication. Make sure you include the authentication cookie in your requests.

## API Overview

The Form Builder API consists of four main components:

1. **Forms API** - Manage overall form definitions
2. **Form Pages API** - Manage pages within forms
3. **Form Page Questions API** - Manage question instances on pages
4. **Form Rules API** - Manage conditional logic for questions and pages

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