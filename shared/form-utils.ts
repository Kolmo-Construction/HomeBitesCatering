// Shared form utilities for consistent behavior across components

/**
 * Map of question types to their display labels
 * Used to display user-friendly labels for internal question type codes
 */
export const questionTypeLabels = {
  'textbox': 'Text Field',
  'textarea': 'Text Area',
  'number': 'Number',
  'email': 'Email',
  'phone': 'Phone',
  'checkbox_group': 'Checkboxes',
  'radio_group': 'Radio Buttons',
  'dropdown': 'Dropdown',
  'date': 'Date',
  'datetime': 'Date & Time',
  'matrix': 'Matrix',
  'address': 'Address',
  'header': 'Header',
  'text_display': 'Display Text',
  'image_upload': 'Image Upload',
  'file_upload': 'File Upload',
  'signature_pad': 'Signature Pad',
  'rating_scale': 'Rating Scale',
  'slider': 'Slider',
  'toggle_switch': 'Toggle Switch',
  'full_name': 'Full Name',
  'hidden_calculation': 'Hidden Calculation',
};

/**
 * Gets the display label for a question type
 * @param type The internal question type code
 * @returns The user-friendly display label
 */
export const getQuestionTypeLabel = (type: string): string => {
  if (!type) return 'Unknown';
  return questionTypeLabels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};