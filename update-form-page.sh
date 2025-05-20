#!/bin/bash

# Script to update a page in a form
# Usage: ./update-form-page.sh PAGE_ID PAGE_TITLE PAGE_DESCRIPTION PAGE_ORDER

# API endpoint and cookie file
API_BASE_URL="http://localhost:5000/api/form-builder"
COOKIE_FILE="cookie.txt" # Ensure this file exists and contains valid cookies

# Check if all required parameters were provided
if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ] || [ -z "$4" ]; then
  echo "Error: Missing required parameters."
  echo "Usage: ./update-form-page.sh PAGE_ID PAGE_TITLE PAGE_DESCRIPTION PAGE_ORDER"
  exit 1
fi

PAGE_ID=$1
PAGE_TITLE=$2
PAGE_DESCRIPTION=$3
PAGE_ORDER=$4

# Create JSON payload
JSON_PAYLOAD=$(cat <<EOF
{
  "pageTitle": "$PAGE_TITLE",
  "description": "$PAGE_DESCRIPTION",
  "pageOrder": $PAGE_ORDER
}
EOF
)

# Perform the update
echo "Updating page with ID: $PAGE_ID..."
RESPONSE=$(curl -X PATCH "$API_BASE_URL/pages/$PAGE_ID" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d "$JSON_PAYLOAD" \
  -w "\n%{http_code}")

# Extract HTTP status code
HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')

# Check if the update was successful
if [ "$HTTP_STATUS" -eq 200 ]; then
  echo "Page successfully updated."
  echo "Response: $RESPONSE_BODY"
else
  echo "Failed to update page. HTTP Status: $HTTP_STATUS"
  echo "Response: $RESPONSE_BODY"
fi