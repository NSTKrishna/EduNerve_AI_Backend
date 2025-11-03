# EduNerve AI - API Documentation

## Overview
Complete authentication system with AI-powered interview feedback and personalized learning recommendations.

## Table of Contents
- [Authentication](#authentication)
- [Interview Management](#interview-management)
- [Resources](#resources)
- [Quiz](#quiz)

---

## Authentication

### Register User
**POST** `/api/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "role": "Full Stack Developer",
  "experience": "2 years",
  "skills": ["React", "Node.js", "MongoDB"]
}
```

**Response (200):**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "Full Stack Developer",
    "experience": "2 years",
    "skills": ["React", "Node.js", "MongoDB"]
  }
}
```

**Errors:**
- `400` - Missing required fields
- `409` - Email already exists

---

### Login
**POST** `/api/auth/login`

Authenticate user and get JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "Full Stack Developer"
  }
}
```

**Errors:**
- `400` - Missing email or password
- `401` - Invalid credentials

---

### Get Profile
**GET** `/api/auth/profile`

Get current user profile with recent interviews and quiz results.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "id": "uuid-here",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "Full Stack Developer",
  "experience": "2 years",
  "skills": ["React", "Node.js", "MongoDB"],
  "interviews": [
    {
      "id": "interview-uuid",
      "role": "Frontend Developer",
      "status": "completed",
      "overallScore": 85,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "quizResults": [
    {
      "id": "quiz-uuid",
      "topic": "React",
      "score": 90,
      "completedAt": "2024-01-14T15:20:00Z"
    }
  ]
}
```

**Errors:**
- `401` - Unauthorized (missing or invalid token)

---

### Update Profile
**PUT** `/api/auth/profile`

Update user profile information.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "name": "John Updated",
  "role": "Senior Full Stack Developer",
  "experience": "3 years",
  "skills": ["React", "Node.js", "MongoDB", "Docker"]
}
```

**Response (200):**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "name": "John Updated",
    "role": "Senior Full Stack Developer",
    "experience": "3 years",
    "skills": ["React", "Node.js", "MongoDB", "Docker"]
  }
}
```

---

## Interview Management

### Start Interview
**POST** `/api/start-interview`

Generate AI interview questions and create interview record.

**Headers (Optional):**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "role": "Frontend Developer",
  "interviewType": "technical",
  "technologies": ["React", "JavaScript", "CSS"]
}
```

**Response (200):**
```json
{
  "interviewId": "uuid-here",
  "message": "Interview started successfully",
  "prompt": "You are conducting a technical interview for a Frontend Developer position..."
}
```

---

### Complete Interview
**POST** `/api/complete`

Submit interview transcript and get AI-powered feedback with resource recommendations.

**Request Body:**
```json
{
  "interviewId": "uuid-here",
  "transcript": [
    {
      "role": "assistant",
      "content": "What is React hooks?",
      "timestamp": "2024-01-15T10:00:00Z"
    },
    {
      "role": "user",
      "content": "Hooks are functions that let you use state...",
      "timestamp": "2024-01-15T10:01:00Z"
    }
  ]
}
```

**Response (200):**
```json
{
  "message": "Interview completed successfully",
  "interviewId": "uuid-here",
  "feedback": {
    "technicalScore": 85,
    "communicationScore": 90,
    "problemSolvingScore": 80,
    "overallScore": 85,
    "strengths": [
      "Strong understanding of React fundamentals",
      "Clear communication skills"
    ],
    "weakAreas": [
      "Advanced React patterns",
      "Performance optimization"
    ],
    "detailedFeedback": "The candidate demonstrated solid knowledge of React basics...",
    "aiAnalysis": {
      "technicalDepth": "Good foundational knowledge...",
      "communicationClarity": "Explained concepts clearly..."
    }
  },
  "recommendations": [
    {
      "id": "rec-uuid",
      "category": "documentation",
      "topic": "React Advanced Patterns",
      "title": "React Official Docs - Advanced Guides",
      "url": "https://react.dev/learn/advanced-guides",
      "description": "Deep dive into advanced React patterns",
      "priority": 10
    }
  ]
}
```

---

### Get Interview Details
**GET** `/api/:interviewId`

Retrieve specific interview with feedback and recommendations.

**Response (200):**
```json
{
  "id": "uuid-here",
  "role": "Frontend Developer",
  "interviewType": "technical",
  "technologies": ["React", "JavaScript"],
  "status": "completed",
  "transcript": [...],
  "feedback": "Detailed feedback text...",
  "technicalScore": 85,
  "communicationScore": 90,
  "problemSolvingScore": 80,
  "overallScore": 85,
  "weakAreas": ["Advanced patterns"],
  "strengths": ["Clear communication"],
  "recommendations": [...]
}
```

---

### Get User Interview History
**GET** `/api/user/history`

Get all interviews for authenticated user.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "interviews": [
    {
      "id": "uuid",
      "role": "Frontend Developer",
      "status": "completed",
      "overallScore": 85,
      "createdAt": "2024-01-15T10:00:00Z",
      "recommendations": [
        {
          "category": "video",
          "topic": "React Hooks",
          "title": "Advanced React Hooks Tutorial"
        }
      ]
    }
  ]
}
```

---

## Resources

### Get Resources
**GET** `/api/resources`

Fetch learning resources with optional filters.

**Query Parameters:**
- `topic` - Filter by topic (e.g., "React", "Node.js")
- `category` - Filter by category ("documentation", "video", "article", "course")
- `difficulty` - Filter by difficulty ("beginner", "intermediate", "advanced")
- `subtopic` - Filter by subtopic

**Example:**
```
GET /api/resources?topic=React&difficulty=intermediate
```

**Response (200):**
```json
{
  "resources": [
    {
      "id": "uuid",
      "category": "documentation",
      "topic": "React",
      "subtopic": "Hooks",
      "title": "React Official Documentation - Hooks",
      "url": "https://react.dev/reference/react/hooks",
      "description": "Complete guide to React Hooks",
      "difficulty": "intermediate",
      "tags": ["react", "hooks", "frontend"]
    }
  ]
}
```

---

### Search Resources
**GET** `/api/resources/search`

Full-text search across resources.

**Query Parameters:**
- `q` - Search query (required)

**Example:**
```
GET /api/resources/search?q=react hooks
```

**Response (200):**
```json
{
  "resources": [...],
  "count": 5
}
```

---

### Add Resource
**POST** `/api/resources`

Add a new learning resource.

**Request Body:**
```json
{
  "category": "video",
  "topic": "React",
  "subtopic": "Performance",
  "title": "React Performance Optimization",
  "url": "https://youtube.com/watch?v=example",
  "description": "Learn to optimize React apps",
  "difficulty": "advanced",
  "tags": ["react", "performance", "optimization"]
}
```

**Response (201):**
```json
{
  "message": "Resource added successfully",
  "resource": {...}
}
```

---

### Bulk Add Resources
**POST** `/api/resources/bulk`

Add multiple resources at once.

**Request Body:**
```json
{
  "resources": [
    {
      "category": "article",
      "topic": "JavaScript",
      "title": "ES6 Features",
      "url": "https://example.com",
      "description": "Modern JavaScript features"
    },
    {
      "category": "video",
      "topic": "Node.js",
      "title": "Node.js Crash Course",
      "url": "https://youtube.com/watch?v=example",
      "description": "Quick Node.js tutorial"
    }
  ]
}
```

**Response (201):**
```json
{
  "message": "Successfully added 2 resources",
  "count": 2
}
```

---

## Quiz

### Generate Quiz
**POST** `/api/generate-quiz`

Generate AI-powered quiz questions.

**Request Body:**
```json
{
  "topic": "React Hooks",
  "difficulty": "intermediate",
  "numberOfQuestions": 10
}
```

**Response (200):**
```json
{
  "questions": [
    {
      "question": "What is the purpose of useEffect?",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A"
    }
  ]
}
```

---

### Save Quiz Result
**POST** `/api/save-quiz-result`

Save quiz completion data.

**Headers (Optional):**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "topic": "React Hooks",
  "difficulty": "intermediate",
  "score": 85,
  "totalQuestions": 10,
  "correctAnswers": 8
}
```

**Response (200):**
```json
{
  "message": "Quiz result saved successfully",
  "result": {
    "id": "uuid",
    "topic": "React Hooks",
    "score": 85
  }
}
```

---

## Authentication Flow

1. **Register**: `POST /api/auth/register` → Get JWT token
2. **Login**: `POST /api/auth/login` → Get JWT token
3. **Use Token**: Include in `Authorization: Bearer <token>` header for protected routes
4. **Token Expiry**: Tokens expire after 7 days

---

## Interview Flow with AI Feedback

1. **User registers/logs in** → Receive JWT token
2. **Start interview**: `POST /api/start-interview` → Get interview ID and AI prompt
3. **Conduct interview** → VAPI handles conversation
4. **Complete interview**: `POST /api/complete` with transcript
5. **AI analyzes transcript** → Generates:
   - Performance scores (technical, communication, problem-solving, overall)
   - Strengths and weak areas
   - Detailed feedback (200-300 words)
   - Personalized resource recommendations
6. **User views feedback** → `GET /api/:interviewId`
7. **User accesses recommended resources** → `GET /api/resources?topic=<weak_area>`

---

## Database Schema

### User
- `id` (UUID)
- `email` (unique)
- `password` (hashed with bcrypt)
- `name`, `role`, `experience`
- `skills` (array)
- Relations: interviews[], quizResults[]

### Interview
- `id` (UUID)
- `userId` (FK to User)
- `role`, `interviewType`, `technologies`
- `status` (pending/in-progress/completed)
- `transcript` (JSON)
- `aiAnalysis` (JSON)
- `feedback` (text)
- `technicalScore`, `communicationScore`, `problemSolvingScore`, `overallScore`
- `weakAreas`, `strengths` (arrays)
- Relations: recommendations[]

### Recommendation
- `id` (UUID)
- `interviewId` (FK to Interview)
- `category`, `topic`, `title`, `url`
- `description`, `priority`

### Resource
- `id` (UUID)
- `category`, `topic`, `subtopic`
- `title`, `url`, `description`
- `difficulty`, `tags` (array)

---

## Error Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `404` - Not Found
- `409` - Conflict (duplicate entry)
- `500` - Server Error

---

## Environment Variables

```env
PORT=3000
VAPI_PUBLIC_KEY=your-vapi-public-key
VAPI_SECRET_KEY=your-vapi-secret-key
GEMINI_API_KEY=your-gemini-api-key
DATABASE_URL=your-postgresql-connection-string
JWT_SECRET=your-super-secret-jwt-key
```

---

## Testing with cURL

### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "name": "Test User",
    "role": "Developer",
    "experience": "2 years",
    "skills": ["React", "Node.js"]
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'
```

### Get Profile (Protected)
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Start Interview
```bash
curl -X POST http://localhost:3000/api/start-interview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "role": "Frontend Developer",
    "interviewType": "technical",
    "technologies": ["React", "JavaScript"]
  }'
```

### Get Resources
```bash
curl -X GET "http://localhost:3000/api/resources?topic=React&difficulty=intermediate"
```

---

## Next Steps

1. ✅ JWT_SECRET added to `.env`
2. ✅ Database seeded with 16 learning resources
3. 🔄 Restart server: `npm start`
4. 🔄 Test authentication endpoints
5. 🔄 Test interview completion with AI feedback
6. 🔄 Integrate frontend with authentication
7. 🔄 Build user dashboard to display feedback and recommendations
