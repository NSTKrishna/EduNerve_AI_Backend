#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000/api"
TOKEN=""

echo -e "${YELLOW}=== EduNerve AI Backend Testing ===${NC}\n"

# Test 1: Register User
echo -e "${YELLOW}1. Testing User Registration...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@edunerve.com",
    "password": "SecurePass123!",
    "name": "Test User",
    "role": "Full Stack Developer",
    "experience": "2 years",
    "skills": ["React", "Node.js", "MongoDB"]
  }')

if echo "$REGISTER_RESPONSE" | grep -q "token"; then
    echo -e "${GREEN}✓ Registration successful${NC}"
    TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    echo "Token: ${TOKEN:0:50}..."
else
    echo -e "${RED}✗ Registration failed${NC}"
    echo "$REGISTER_RESPONSE"
fi

echo ""

# Test 2: Login
echo -e "${YELLOW}2. Testing User Login...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@edunerve.com",
    "password": "SecurePass123!"
  }')

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    echo -e "${GREEN}✓ Login successful${NC}"
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
else
    echo -e "${RED}✗ Login failed${NC}"
    echo "$LOGIN_RESPONSE"
fi

echo ""

# Test 3: Get Profile
echo -e "${YELLOW}3. Testing Get Profile (Protected Route)...${NC}"
PROFILE_RESPONSE=$(curl -s -X GET $API_URL/auth/profile \
  -H "Authorization: Bearer $TOKEN")

if echo "$PROFILE_RESPONSE" | grep -q "email"; then
    echo -e "${GREEN}✓ Profile fetch successful${NC}"
    echo "$PROFILE_RESPONSE" | head -n 5
else
    echo -e "${RED}✗ Profile fetch failed${NC}"
    echo "$PROFILE_RESPONSE"
fi

echo ""

# Test 4: Get Resources
echo -e "${YELLOW}4. Testing Get Resources...${NC}"
RESOURCES_RESPONSE=$(curl -s -X GET "$API_URL/resources?topic=React")

if echo "$RESOURCES_RESPONSE" | grep -q "resources"; then
    echo -e "${GREEN}✓ Resources fetch successful${NC}"
    RESOURCE_COUNT=$(echo "$RESOURCES_RESPONSE" | grep -o '"id"' | wc -l)
    echo "Found $RESOURCE_COUNT React resources"
else
    echo -e "${RED}✗ Resources fetch failed${NC}"
    echo "$RESOURCES_RESPONSE"
fi

echo ""

# Test 5: Search Resources
echo -e "${YELLOW}5. Testing Resource Search...${NC}"
SEARCH_RESPONSE=$(curl -s -X GET "$API_URL/resources/search?q=hooks")

if echo "$SEARCH_RESPONSE" | grep -q "resources"; then
    echo -e "${GREEN}✓ Resource search successful${NC}"
    SEARCH_COUNT=$(echo "$SEARCH_RESPONSE" | grep -o '"id"' | wc -l)
    echo "Found $SEARCH_COUNT results for 'hooks'"
else
    echo -e "${RED}✗ Resource search failed${NC}"
    echo "$SEARCH_RESPONSE"
fi

echo ""

# Test 6: Start Interview
echo -e "${YELLOW}6. Testing Start Interview...${NC}"
INTERVIEW_RESPONSE=$(curl -s -X POST $API_URL/start-interview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "role": "Frontend Developer",
    "interviewType": "technical",
    "technologies": ["React", "JavaScript", "CSS"]
  }')

if echo "$INTERVIEW_RESPONSE" | grep -q "interviewId"; then
    echo -e "${GREEN}✓ Interview start successful${NC}"
    INTERVIEW_ID=$(echo "$INTERVIEW_RESPONSE" | grep -o '"interviewId":"[^"]*' | cut -d'"' -f4)
    echo "Interview ID: $INTERVIEW_ID"
else
    echo -e "${RED}✗ Interview start failed${NC}"
    echo "$INTERVIEW_RESPONSE"
fi

echo ""

echo -e "${GREEN}=== Testing Complete ===${NC}"
echo -e "\n${YELLOW}Note: To test interview completion with AI feedback, you need to:"
echo "1. Conduct an actual interview with VAPI"
echo "2. Call POST /api/complete with the interview ID and transcript"
echo -e "This will trigger AI analysis and resource recommendations${NC}"
