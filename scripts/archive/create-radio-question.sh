#!/bin/bash

# Command to create a question with radio button options
curl -X POST "http://localhost:5000/api/form-builder/library-questions" \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d '{
    "libraryQuestionKey": "example_radio_options",
    "defaultText": "Select an option:",
    "questionType": "radio_group",
    "category": "menu_info",
    "defaultOptions": [
      "Option 1 - Some description",
      "Option 2 - Another description",
      "Option 3 - Final description"
    ]
  }'

# Example output will look like:
# {
#   "id": 65,
#   "libraryQuestionKey": "example_radio_options",
#   "defaultText": "Select an option:",
#   "questionType": "radio_group",
#   "defaultMetadata": null,
#   "defaultOptions": [
#     "Option 1 - Some description",
#     "Option 2 - Another description",
#     "Option 3 - Final description"
#   ],
#   "category": "menu_info",
#   "createdAt": "2025-05-20T04:52:33.740Z",
#   "updatedAt": "2025-05-20T04:52:33.740Z"
# }