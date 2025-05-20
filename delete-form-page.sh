#!/bin/bash

# Script to delete a page from a form
# Usage: ./delete-form-page.sh PAGE_ID

# API endpoint and cookie file
API_BASE_URL="http://localhost:5000/api/form-builder"
COOKIE_FILE="cookie.txt" # Ensure this file exists and contains valid cookies

# Check if the page ID was provided
if [ -z "$1" ]; then
  echo "Error: No page ID provided."
  echo "Usage: ./delete-form-page.sh PAGE_ID"
  exit 1
fi

PAGE_ID=$1

# Confirm deletion
echo "You are about to delete page with ID: $PAGE_ID"
read -p "Are you sure you want to continue? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "Operation canceled."
  exit 0
fi

# Perform the deletion
echo "Deleting page with ID: $PAGE_ID..."
RESPONSE=$(curl -X DELETE "$API_BASE_URL/pages/$PAGE_ID" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -w "\n%{http_code}")

# Extract HTTP status code
HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')

# Check if the deletion was successful
if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 204 ]; then
  echo "Page successfully deleted."
  echo "Response: $RESPONSE_BODY"
else
  echo "Failed to delete page. HTTP Status: $HTTP_STATUS"
  echo "Response: $RESPONSE_BODY"
fi