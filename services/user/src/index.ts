import express, { Request, Response } from 'express';
import { Client } from 'pg';

const app = express();
app.use(express.json());
const port = process.env.PORT || '3001';

const db = new Client({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: 'tricoach-db',
});

db.connect().catch(err => console.error('Database connection failed:', err));

// Health check
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ service: 'User Service', status: 'ok' });
});

// Register new user
app.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password_hash, age, weight, experience_level } = req.body;
    
    if (!username || !email || !password_hash) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const result = await db.query(
      `INSERT INTO "Users" (username, email, password_hash, age, weight, experience_level) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, username, email, age, weight, experience_level`,
      [username, email, password_hash, age || null, weight || null, experience_level || 1]
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login user
app.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password_hash } = req.body;

    if (!email || !password_hash) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }

    const result = await db.query(
      `SELECT id, username, email, age, weight, experience_level FROM "Users" 
       WHERE email = $1 AND password_hash = $2`,
      [email, password_hash]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    res.status(200).json({
      message: 'Login successful',
      user: result.rows[0],
      token: `token-${result.rows[0].id}`, // Simplified token
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile
app.get('/profile/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await db.query(
      `SELECT id, username, email, age, weight, experience_level FROM "Users" WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
app.put('/profile/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { username, age, weight, experience_level } = req.body;

    const result = await db.query(
      `UPDATE "Users" 
       SET username = COALESCE($1, username), 
           age = COALESCE($2, age), 
           weight = COALESCE($3, weight), 
           experience_level = COALESCE($4, experience_level)
       WHERE id = $5
       RETURNING id, username, email, age, weight, experience_level`,
      [username, age, weight, experience_level, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({
      message: 'Profile updated successfully',
      user: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user preferences
app.get('/preferences/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await db.query(
      `SELECT id, user_id, theme, notifications_enabled, language 
       FROM "UserPreferences" WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(200).json({ theme: 'dark', notifications_enabled: true, language: 'en' });
      return;
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user preferences
app.put('/preferences/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { theme, notifications_enabled, language } = req.body;

    const result = await db.query(
      `INSERT INTO "UserPreferences" (user_id, theme, notifications_enabled, language)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) 
       DO UPDATE SET theme = $2, notifications_enabled = $3, language = $4
       RETURNING id, user_id, theme, notifications_enabled, language`,
      [userId, theme || 'dark', notifications_enabled !== undefined ? notifications_enabled : true, language || 'en']
    );

    res.status(200).json({
      message: 'Preferences updated successfully',
      preferences: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(Number(port), () => {
  console.log(`🏃 User Service running on port ${port}`);
});
