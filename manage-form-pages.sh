#!/bin/bash

# Form Pages Management Script
# A comprehensive tool for managing form pages

# API endpoint and cookie file
API_BASE_URL="http://localhost:5000/api/form-builder"
COOKIE_FILE="cookie.txt" # Ensure this file exists and contains valid cookies

# Colors for better user experience
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to show usage instructions
show_usage() {
  echo -e "${BLUE}Form Pages Management Tool${NC}"
  echo 
  echo "Usage:"
  echo "  $0 list <form_id>                  - List all pages in a form"
  echo "  $0 add <form_id> <title> <desc> <order> - Add a new page to a form"
  echo "  $0 update <page_id> <title> <desc> <order> - Update an existing page"
  echo "  $0 delete <page_id>                - Delete a page"
  echo
  echo "Examples:"
  echo "  $0 list 12                         - List all pages in form ID 12"
  echo "  $0 add 12 \"Menu Selection\" \"Choose your menu\" 5 - Add a new page"
  echo "  $0 update 35 \"Food Options\" \"Select your food\" 6 - Update page ID 35"
  echo "  $0 delete 35                       - Delete page ID 35"
}

# Function to list pages
list_pages() {
  if [ -z "$1" ]; then
    echo -e "${RED}Error: No form ID provided.${NC}"
    return 1
  fi
  
  FORM_ID=$1
  echo -e "${YELLOW}Fetching pages for form ID: $FORM_ID...${NC}"
  
  RESPONSE=$(curl -s -X GET "$API_BASE_URL/forms/$FORM_ID/pages" \
    -H "Content-Type: application/json" \
    -b "$COOKIE_FILE")
  
  # Check if response is valid JSON
  if ! echo "$RESPONSE" | jq . >/dev/null 2>&1; then
    echo -e "${RED}Failed to fetch pages or invalid response.${NC}"
    echo "$RESPONSE"
    return 1
  fi
  
  # Display pages in a formatted table
  echo -e "${GREEN}Pages for Form ID: $FORM_ID${NC}"
  echo "--------------------------------------------"
  echo -e "ID\tOrder\tTitle\t\tDescription"
  echo "--------------------------------------------"
  
  echo "$RESPONSE" | jq -r '.[] | "\(.id)\t\(.pageOrder)\t\(.pageTitle)\t\(.description)"'
}

# Function to add a page
add_page() {
  if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ] || [ -z "$4" ]; then
    echo -e "${RED}Error: Missing required parameters.${NC}"
    echo "Usage: $0 add <form_id> <title> <desc> <order>"
    return 1
  fi
  
  FORM_ID=$1
  PAGE_TITLE=$2
  PAGE_DESC=$3
  PAGE_ORDER=$4
  
  JSON_PAYLOAD=$(cat <<EOF
{
  "pageTitle": "$PAGE_TITLE",
  "description": "$PAGE_DESC",
  "pageOrder": $PAGE_ORDER
}
EOF
)
  
  echo -e "${YELLOW}Adding new page to form ID: $FORM_ID...${NC}"
  RESPONSE=$(curl -s -X POST "$API_BASE_URL/forms/$FORM_ID/pages" \
    -H "Content-Type: application/json" \
    -b "$COOKIE_FILE" \
    -d "$JSON_PAYLOAD")
  
  # Check if response is valid JSON
  if ! echo "$RESPONSE" | jq . >/dev/null 2>&1; then
    echo -e "${RED}Failed to add page or invalid response.${NC}"
    echo "$RESPONSE"
    return 1
  fi
  
  NEW_PAGE_ID=$(echo "$RESPONSE" | jq -r '.id')
  if [ "$NEW_PAGE_ID" != "null" ]; then
    echo -e "${GREEN}Successfully added page with ID: $NEW_PAGE_ID${NC}"
    echo "$RESPONSE" | jq .
  else
    echo -e "${RED}Failed to add page.${NC}"
    echo "$RESPONSE" | jq .
  fi
}

# Function to update a page
update_page() {
  if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ] || [ -z "$4" ]; then
    echo -e "${RED}Error: Missing required parameters.${NC}"
    echo "Usage: $0 update <page_id> <title> <desc> <order>"
    return 1
  fi
  
  PAGE_ID=$1
  PAGE_TITLE=$2
  PAGE_DESC=$3
  PAGE_ORDER=$4
  
  JSON_PAYLOAD=$(cat <<EOF
{
  "pageTitle": "$PAGE_TITLE",
  "description": "$PAGE_DESC",
  "pageOrder": $PAGE_ORDER
}
EOF
)
  
  echo -e "${YELLOW}Updating page ID: $PAGE_ID...${NC}"
  RESPONSE=$(curl -s -X PATCH "$API_BASE_URL/pages/$PAGE_ID" \
    -H "Content-Type: application/json" \
    -b "$COOKIE_FILE" \
    -d "$JSON_PAYLOAD")
  
  # Check if response is valid JSON
  if ! echo "$RESPONSE" | jq . >/dev/null 2>&1; then
    echo -e "${RED}Failed to update page or invalid response.${NC}"
    echo "$RESPONSE"
    return 1
  fi
  
  UPDATED_PAGE_ID=$(echo "$RESPONSE" | jq -r '.id')
  if [ "$UPDATED_PAGE_ID" != "null" ]; then
    echo -e "${GREEN}Successfully updated page ID: $UPDATED_PAGE_ID${NC}"
    echo "$RESPONSE" | jq .
  else
    echo -e "${RED}Failed to update page.${NC}"
    echo "$RESPONSE" | jq .
  fi
}

# Function to delete a page
delete_page() {
  if [ -z "$1" ]; then
    echo -e "${RED}Error: No page ID provided.${NC}"
    echo "Usage: $0 delete <page_id>"
    return 1
  fi
  
  PAGE_ID=$1
  
  # Confirm deletion
  echo -e "${YELLOW}You are about to delete page with ID: $PAGE_ID${NC}"
  read -p "Are you sure you want to continue? (y/n): " CONFIRM
  
  if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo -e "${BLUE}Operation canceled.${NC}"
    return 0
  fi
  
  echo -e "${YELLOW}Deleting page ID: $PAGE_ID...${NC}"
  RESPONSE=$(curl -s -X DELETE "$API_BASE_URL/pages/$PAGE_ID" \
    -H "Content-Type: application/json" \
    -b "$COOKIE_FILE" \
    -w "\n%{http_code}")
  
  # Extract HTTP status code
  HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
  RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 204 ]; then
    echo -e "${GREEN}Successfully deleted page ID: $PAGE_ID${NC}"
    echo "Response: $RESPONSE_BODY"
  else
    echo -e "${RED}Failed to delete page. HTTP Status: $HTTP_STATUS${NC}"
    echo "Response: $RESPONSE_BODY"
  fi
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: This script requires 'jq' to be installed.${NC}"
    echo "Please install jq using: apt-get install jq"
    exit 1
fi

# Main script logic
case "$1" in
  list)
    list_pages "$2"
    ;;
  add)
    add_page "$2" "$3" "$4" "$5"
    ;;
  update)
    update_page "$2" "$3" "$4" "$5"
    ;;
  delete)
    delete_page "$2"
    ;;
  *)
    show_usage
    ;;
esac