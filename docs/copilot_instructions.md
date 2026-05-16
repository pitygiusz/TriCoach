# TriCoach MVP - AI Coding Assistant Context

## 1. Project Overview
TriCoach is a cloud-based application for triathletes to manage training, track progress, and engage with a social community. 

**Core philosophy for AI code generation:** KEEP IT AS SIMPLE AS POSSIBLE. Do not over-engineer. Avoid complex design patterns, deep abstractions, or heavy enterprise frameworks. We are building an MVP (Minimum Viable Product) for an academic project.

## 2. Technology Stack
*   **Backend:** Node.js, TypeScript, Express.js (Minimalist approach).
*   **Frontend:** React, TypeScript.
*   **Cloud Provider:** Google Cloud Platform (GCP).
*   **Relational Database:** PostgreSQL (Cloud SQL) via the `pg` library.
*   **NoSQL Database:** Firestore (for social features).
*   **Inter-service Communication:** REST APIs for synchronous calls. 
*   **Deployment:** Docker containers running on Google Cloud Run.

## 3. Microservices Architecture
The backend is split into 6 lightweight Express.js microservices.
When writing code for a specific service, ensure it listens on the correct port and only handles its specific domain.

1.  **API Gateway (Port 3000):** Central entry point. Routes incoming React frontend requests to the correct underlying microservice. Handles basic API key/auth verification before forwarding.
2.  **User Service (Port 3001):** Handles registration, login, and user profiles. Connects to PostgreSQL.
3.  **Training Service (Port 3002):** Logs workouts (swim, bike, run) and manages training plans. Connects to PostgreSQL.
4.  **Analytics Service (Port 3003):** Calculates user statistics and trends based on training history.
5.  **Social Service (Port 3004):** Manages user posts, likes, and follows. Connects to Firestore (NoSQL).
6.  **Race Service (Port 3005):** Simulates race times based on training data.

## 4. Database Schemas (Simplified)

### PostgreSQL (User & Training Services)
Assume the following tables exist in the `tricoach-db` database:

*   `Users`: `id` (UUID), `username` (VARCHAR), `email` (VARCHAR), `password_hash` (VARCHAR), `age` (INT), `weight` (DECIMAL), `experience_level` (INT).
*   `TrainingHistory`: `id` (UUID), `user_id` (UUID), `timestamp` (TIMESTAMP), `type` (VARCHAR: 'run', 'bike', 'swim'), `duration_minutes` (INT), `distance_km` (DECIMAL).
*   `TrainingPlans`: `id` (UUID), `user_id` (UUID), `name` (VARCHAR), `target_distance_km` (DECIMAL).

### Firestore (Social Service)
Collection `posts`:
*   Document structure: `{ id: string, userId: string, content: string, likes: number, createdAt: timestamp }`

## 5. Strict Coding Rules for AI Assistant

When generating code for this workspace, strictly adhere to the following rules:

1.  **Environment Variables Only:** NEVER hardcode credentials, database hosts, or ports. Always use `process.env.PORT`, `process.env.DB_HOST`, `process.env.DB_USER`, `process.env.DB_PASSWORD`.
2.  **Minimal Setup:** Use standard Express.js routing. Put the route handlers directly in the file or in a simple `controllers` folder. Do not generate complex service/repository layers unless explicitly asked.
3.  **Raw SQL over ORM:** For simplicity in this MVP, prefer using raw SQL queries with the `pg` package (e.g., `client.query('SELECT * FROM Users')`) instead of configuring heavy ORMs like TypeORM or Sequelize, unless the developer has already set one up.
4.  **Error Handling:** Include basic `try/catch` blocks in async routes and return standard HTTP status codes (200 OK, 201 Created, 400 Bad Request, 500 Internal Server Error).
5.  **Stateless:** All microservices must be stateless to run properly on Google Cloud Run. Do not save files or sessions to the local disk.
6.  **TypeScript:** Use modern TypeScript features (ES6+), `async/await`, and provide basic interfaces for request bodies and database responses. Avoid excessive use of `any`.

## 6. Example Expected Output Style
If asked to "Create a route to get a user's training history", the expected output should look like this minimal Express route:

```typescript
import { Router, Request, Response } from 'express';
import { Client } from 'pg';

const router = Router();
const db = new Client({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: 'tricoach-db',
});
db.connect();

router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const result = await db.query(
      'SELECT * FROM TrainingHistory WHERE user_id = $1 ORDER BY timestamp DESC', 
      [userId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;