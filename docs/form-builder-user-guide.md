# Form Builder User Guide

Welcome to the Form Builder system! This guide will help you create, manage, and publish dynamic forms for your clients.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating Your First Form](#creating-your-first-form)
3. [Working with Pages](#working-with-pages)
4. [Adding Questions](#adding-questions)
5. [Customizing Questions](#customizing-questions)
6. [Using the Question Library](#using-the-question-library)
7. [Setting Up Conditional Logic](#setting-up-conditional-logic)
8. [Previewing Your Form](#previewing-your-form)
9. [Publishing and Sharing](#publishing-and-sharing)
10. [Frequently Asked Questions](#frequently-asked-questions)

## Getting Started

### Accessing the Form Builder

1. Log in to your account
2. From the dashboard, click on the "Forms" option in the sidebar
3. This will take you to the Form Manager where you can see all your existing forms

### Understanding the Interface

The Form Builder has three main components:

1. **Form Manager** - Where you can see and manage all your forms
2. **Form Editor** - Where you design individual forms
3. **Form Preview** - Where you can test how your form will look to clients

## Creating Your First Form

### Step 1: Start a New Form

1. From the Form Manager, click the "+ New Form" button
2. Fill in the basic details:
   - **Form Key**: A unique identifier (no spaces, used in URLs)
   - **Form Title**: The name clients will see
   - **Description**: Optional details about the form's purpose
   - **Status**: Start with "Draft" while building

### Step 2: Save Your Form

Click "Create" to generate your new form. You'll be automatically taken to the Form Editor where you can start designing.

## Working with Pages

Forms are divided into pages to make them easier for clients to complete. Think of pages as sections of your form.

### Adding a New Page

1. In the Form Editor, look at the left panel where pages are listed
2. Click the "+ Add Page" button
3. Enter:
   - **Page Title**: What clients will see at the top of the page
   - **Description**: Optional text explaining the page's purpose
4. Click "Create" to add the page

### Organizing Pages

- **Reorder Pages**: Drag and drop pages in the left panel to change their order
- **Edit a Page**: Click the page title, then click the edit (pencil) icon
- **Delete a Page**: Click the trash icon next to a page (be careful - this will remove all questions on that page!)

## Adding Questions

Once you have created pages, you can add questions to each page.

### Adding Questions from the Library

1. Select the page where you want to add a question
2. In the left panel, switch to the "Question Library" tab
3. Browse or search for questions by type or category
4. Click a question to see its details
5. Click "Add to Page" to place it on your current page

### Organizing Questions

- **Reorder Questions**: Drag and drop questions on the canvas to change their order
- **Remove a Question**: Click the trash icon on a question to remove it from the page (this does not delete it from the library)

## Customizing Questions

One of the powerful features of the Form Builder is the ability to customize library questions for each form.

### Question Overrides

When you select a question on the canvas, the right panel shows settings you can override:

1. **Basic Tab**:
   - **Display Text**: Change the question wording
   - **Required**: Make the question mandatory or optional
   - **Hidden**: Hide the question initially (useful with conditional logic)
   - **Placeholder**: Text that appears before the client enters an answer
   - **Helper Text**: Additional instructions that appear below the question

2. **Options Tab** (for multiple choice questions):
   - Modify the available choices
   - Change option labels
   - Add new options specific to this form

3. **Advanced Tab**:
   - Validation rules
   - Special formatting
   - Question-specific settings

### How Overrides Work

When you customize a question for a specific form:
- The original question in the library remains unchanged
- Your customizations apply only to this specific form
- If the library question is updated later, your overrides will be preserved

## Using the Question Library

The Question Library is a collection of pre-defined questions you can use across multiple forms.

### Finding Questions

1. In the left panel of the Form Editor, click the "Question Library" tab
2. Use the search box to find questions by keyword
3. Use the type filter to show only certain question types
4. Use the category filter to show questions by category

### Question Types

The system supports many types of questions:

- **Text Fields**: For names, email addresses, phone numbers, etc.
- **Text Areas**: For longer responses
- **Single Choice**: Radio buttons or dropdowns
- **Multiple Choice**: Checkboxes
- **Date and Time**: Calendar date pickers
- **Numeric**: For number inputs with validation
- **Matrix**: Grid-style questions with rows and columns
- **File Upload**: Allow clients to upload documents or images
- **Display Elements**: Headers, instructions, or images (not actual questions)

## Setting Up Conditional Logic

Conditional logic allows you to create dynamic forms that change based on how clients answer questions.

### Creating a Rule

1. Select a question on your form that will trigger the rule
2. In the right panel, go to the "Logic" tab
3. Click "Add Rule"
4. Set up your rule:
   - **Condition**: When the answer is equal to, contains, greater than, etc.
   - **Value**: The specific answer that triggers the rule
   - **Action**: What happens when the condition is met
   - **Target**: Which question(s) or page(s) are affected

### Example Rules

- **Show/Hide**: "If 'Do you have pets?' is answered 'Yes', then show 'What kind of pets?'"
- **Required/Optional**: "If 'Event Type' is 'Wedding', then make 'Wedding Date' required"
- **Page Navigation**: "If 'Budget Range' is 'Over $5000', then show the premium options page"

### Testing Logic

Always use the Preview feature to test your conditional logic before publishing!

## Previewing Your Form

The Preview feature lets you see and test your form exactly as clients will experience it.

### Using Preview Mode

1. While in the Form Editor, click the "Preview" button in the top right
2. A preview of your form will open in a new dialog
3. Complete the form as if you were a client
4. Test all pathways through your conditional logic
5. Click "Close Preview" to return to editing

### Preview Features

- Navigate between pages using the "Next" and "Back" buttons
- See validation messages for required fields
- Experience conditional logic in real-time

## Publishing and Sharing

When your form is ready for clients to use, you'll need to publish it.

### Publishing a Form

1. From the Form Manager, find your form
2. Click the "Publish" button (or update the status in the form settings)
3. This creates a new version of your form that clients can access

### Sharing with Clients

Each published form has a unique link you can share:

1. From the Form Manager, find your published form
2. Click "Share" to see the public link
3. Copy this link to send to clients or embed in emails

### Tracking Submissions

When clients complete your form:

1. Go to the Form Manager
2. Click on "Submissions" for the relevant form
3. View all completed responses
4. Export data as needed for further processing

## Frequently Asked Questions

### Can I edit a form after publishing it?

Yes! You can make changes to a published form, but you'll need to publish a new version for those changes to be visible to clients. The system maintains version history so existing submissions remain associated with the correct version.

### What happens if I delete a question from the library?

If you delete a question from the library, it will remain in any forms where it's already being used, but you won't be able to add it to new forms.

### Can clients save their progress and return later?

Yes, the system supports saving progress if the client is logged in or provides an email address for a secure link.

### How do I create a duplicated form?

In the Form Manager, click the "Duplicate" button next to any form. This creates an exact copy that you can modify.

### How many questions can I add to a single form?

There's no strict limit, but for the best client experience, we recommend keeping forms concise and breaking longer forms into multiple pages.

### What if I need a custom question type?

Contact your system administrator to request additions to the Question Library.

### Can I import questions from another form?

Yes! When adding questions to a page, you can switch to the "Existing Forms" tab to import questions that you've used in other forms.

---

For additional support, please contact your system administrator or the support team.