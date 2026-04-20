#!/bin/bash

# API endpoint and cookie file
API_ENDPOINT_URL="http://localhost:5000/api/form-builder/library-questions"
COOKIE_FILE="cookie.txt" # Ensure this file exists and contains valid cookies

# Question configuration
QUESTION_KEY="example_radio_question"
QUESTION_TEXT="Select an option:"
QUESTION_TYPE="radio_group"
QUESTION_CATEGORY="general_info"

# Prepare options as JSON array
OPTIONS_JSON="["
OPTIONS_JSON+="\"Option 1 - First choice description\","
OPTIONS_JSON+="\"Option 2 - Second choice description\","
OPTIONS_JSON+="\"Option 3 - Third choice description\","
OPTIONS_JSON+="\"Option 4 - Fourth choice description\""
OPTIONS_JSON+="]"

# Create the full JSON payload
JSON_PAYLOAD=$(cat <<EOF
{
  "libraryQuestionKey": "$QUESTION_KEY",
  "defaultText": "$QUESTION_TEXT",
  "questionType": "$QUESTION_TYPE",
  "category": "$QUESTION_CATEGORY",
  "defaultOptions": $OPTIONS_JSON
}
EOF
)

# Send the request
echo "Creating radio button question: $QUESTION_TEXT"
curl -X POST "$API_ENDPOINT_URL" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d "$JSON_PAYLOAD"

echo -e "\n\nDone! The question has been created."