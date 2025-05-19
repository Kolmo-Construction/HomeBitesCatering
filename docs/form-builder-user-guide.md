# Form Builder User Guide

## Introduction

Welcome to the Catering Management Platform's Form Builder! This powerful tool allows you to create custom forms with various question types, conditional logic, and dynamic options to collect exactly the information you need from your clients.

This guide will walk you through:
- Available question types
- How to configure question settings
- Setting up option selections
- Creating rules and conditional logic
- Managing pages and question order

## Question Types

The Form Builder supports various question types to collect different kinds of information:

### Text Input Types

| Type | Description | Best Used For |
|------|-------------|--------------|
| **Textbox** | A single line of text | Names, short answers, product codes |
| **Textarea** | Multiple lines of text | Comments, descriptions, detailed feedback |
| **Email** | Validates email format | Contact information, account creation |
| **Phone** | Formats and validates phone numbers | Contact information |
| **Number** | Accepts only numerical values | Quantities, ratings, ages |
| **Date** | Date picker with calendar | Event dates, birthdays, deadlines |
| **Datetime** | Date and time picker | Appointment scheduling, event timing |

### Selection Types

| Type | Description | Best Used For |
|------|-------------|--------------|
| **Checkbox Group** | Multiple choice selection | "Select all that apply" questions |
| **Radio Group** | Single choice from multiple options | Exclusive choices, preferences |
| **Dropdown** | Space-saving single choice | Long lists of options, categories |

### Special Types

| Type | Description | Best Used For |
|------|-------------|--------------|
| **Matrix** | Grid of questions with the same response options | Rating multiple items on the same scale |
| **Address** | Structured address input | Location information, shipping details |
| **File Upload** | Allows users to attach files | Documents, images, supporting materials |
| **Full Name** | Structured name input with prefix, first, middle, last | Complete contact information |

## Question Configuration

Each question can be configured with several settings:

### Basic Settings

| Setting | Description |
|---------|-------------|
| **Display Text** | The question text shown to users |
| **Helper Text** | Additional instructions or context displayed below the question |
| **Placeholder** | Example text that appears in the input field when empty |
| **Required** | Toggles whether the question must be answered |
| **Hidden** | Toggles whether the question is visible (useful with conditional logic) |

### Advanced Settings

For specific question types, additional settings may be available:

- **Checkbox Group / Radio Group / Dropdown**:
  - Option labels and values
  - Option ordering
  - Maximum/minimum selections (for Checkbox Group)
  
- **Matrix**:
  - Row labels (questions)
  - Column labels (answer options)
  - Scale type (e.g., 1-5, Yes/No, satisfaction scale)

- **Number**:
  - Minimum and maximum values
  - Step size (increments)

- **Date / Datetime**:
  - Date range restrictions
  - Format preferences

## Working with Option Selections

The Form Builder offers powerful tools for creating and managing option selections for Checkbox Groups, Radio Groups, and Dropdowns.

### Adding Options

1. Select a question that supports options (Checkbox Group, Radio Group, or Dropdown)
2. Navigate to the "Options" tab in the question editor
3. Toggle "Override Options" to customize the option list
4. Click "Add Option" to add a new option
5. Provide both a label (what the user sees) and a value (what gets stored in the database)

### Modifying Options

1. Edit the label or value for any option by clicking on the respective fields
2. Delete an option by clicking the trash icon next to it
3. Reorder options by dragging them into the desired sequence using the handle icon

### Option Best Practices

- **Labels vs. Values**: The label is what appears to the user, while the value is used for data processing. Values should be consistent and machine-friendly (e.g., no spaces, lowercase).
- **Default Options**: Consider which option should be selected by default, if any
- **Comprehensive Choices**: Ensure your option set covers all possible answers users might want to provide
- **Other Option**: Consider adding an "Other" option with a text field for unanticipated responses

### Matrix Question Configuration

Matrix questions work differently than standard option questions:

1. Define the matrix rows (the sub-questions)
2. Define the matrix columns (the answer scale/options)
3. The matrix options cannot be directly modified on a per-form basis
4. To change a matrix, you need to modify it in the Question Library

## Creating Form Rules and Conditional Logic

Form rules allow you to create dynamic forms that change based on user responses.

### Setting Up Conditional Logic

1. Select the target question you want to show/hide
2. Toggle the "Rules" tab in the question editor
3. Click "Add Rule"
4. Configure the rule components:
   - **If**: Select the source question whose answer will trigger the rule
   - **Operator**: Choose the condition (equals, not equals, contains, greater than, etc.)
   - **Value**: Set the specific answer that triggers the rule
   - **Then**: Choose the action (show or hide the target question)
5. For multiple conditions, add additional rules and specify whether ALL or ANY conditions must be met

### Rule Examples

- Show address questions only if "Shipping required" is checked
- Show allergy-related questions only if "Dietary restrictions" is selected
- Hide payment method questions if "Invoice me later" is selected
- Show additional details field if rating is below a certain threshold

### Best Practices for Rules

- Keep conditional logic simple and intuitive for users
- Test your form thoroughly to ensure all rule combinations work as expected
- Consider the user experience when questions appear or disappear
- Use "defaulting" effectively to pre-populate common answers

## Managing Pages and Question Order

Forms can be organized into multiple pages for better user experience and logical grouping.

### Creating and Managing Pages

1. Click "Add Page" in the form editor to create a new page
2. Give each page a descriptive title that indicates its purpose
3. Add a page description to provide context for users
4. Drag pages in the sidebar to reorder them

### Organizing Questions

1. Add questions to a page by selecting from the library or creating new ones
2. Drag questions within a page to reorder them
3. Move questions between pages by dragging them to the desired page

### Page and Question Ordering Best Practices

- Group related questions together on the same page
- Place simple, easy-to-answer questions at the beginning
- Put more complex or sensitive questions later in the form
- Consider the logical flow of information gathering
- Limit the number of questions per page to prevent overwhelming users
- Use page titles and descriptions to provide clear guidance

## Submitting and Testing Forms

Before publishing your form:

1. Use the Preview mode to see how your form will appear to users
2. Test all conditional logic paths to ensure questions appear/hide correctly
3. Submit test responses to verify data is being collected as expected
4. Check the form on different devices (desktop, tablet, mobile) to ensure responsive design
5. Get feedback from colleagues on the clarity and usability of your form

## Tips for Effective Forms

- **Keep it concise**: Only ask for information you actually need
- **Be clear**: Use simple language and specific questions
- **Organize logically**: Group related questions together
- **Provide context**: Use helper text to explain why you're asking for certain information
- **Use appropriate question types**: Choose the best format for each piece of information
- **Test thoroughly**: Ensure all paths through your form work as expected
- **Consider accessibility**: Make sure your form can be used by people with disabilities