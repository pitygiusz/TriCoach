import express, { Request, Response } from 'express';
import { Client } from 'pg';

const app = express();
app.use(express.json());
const port = process.env.PORT || '3002';

const db = new Client({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: 'tricoach-db',
});

db.connect().catch(err => console.error('Database connection failed:', err));

// Health check
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ service: 'Training Service', status: 'ok' });
});

// Log a workout
app.post('/workouts', async (req: Request, res: Response) => {
  try {
    const { user_id, type, duration_minutes, distance_km, pace_per_km, calories_burned, notes } = req.body;

    if (!user_id || !type || !duration_minutes) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const result = await db.query(
      `INSERT INTO "TrainingHistory" (user_id, type, duration_minutes, distance_km, pace_per_km, calories_burned, notes, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, user_id, type, duration_minutes, distance_km, pace_per_km, calories_burned, notes, timestamp`,
      [user_id, type, duration_minutes, distance_km || null, pace_per_km || null, calories_burned || null, notes || null]
    );

    res.status(201).json({
      message: 'Workout logged successfully',
      workout: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's workouts with filtering
app.get('/workouts/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { type, limit = 50, offset = 0 } = req.query;

    let query = `SELECT * FROM "TrainingHistory" WHERE user_id = $1`;
    const params: any[] = [userId];

    if (type) {
      query += ` AND type = $2`;
      params.push(type);
    }

    query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    res.status(200).json({
      total: result.rows.length,
      workouts: result.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create training plan
app.post('/plans', async (req: Request, res: Response) => {
  try {
    const { user_id, name, target_distance_km, goal_date, description } = req.body;

    if (!user_id || !name || !target_distance_km) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const result = await db.query(
      `INSERT INTO "TrainingPlans" (user_id, name, target_distance_km, goal_date, description, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, user_id, name, target_distance_km, goal_date, description, created_at`,
      [user_id, name, target_distance_km, goal_date || null, description || null]
    );

    res.status(201).json({
      message: 'Training plan created successfully',
      plan: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's training plans
app.get('/plans/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await db.query(
      `SELECT id, user_id, name, target_distance_km, goal_date, description, created_at 
       FROM "TrainingPlans" WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    res.status(200).json({
      total: result.rows.length,
      plans: result.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific training plan
app.get('/plans/:userId/:planId', async (req: Request, res: Response) => {
  try {
    const { userId, planId } = req.params;

    const result = await db.query(
      `SELECT id, user_id, name, target_distance_km, goal_date, description, created_at 
       FROM "TrainingPlans" WHERE id = $1 AND user_id = $2`,
      [planId, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Training plan not found' });
      return;
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update training plan
app.put('/plans/:planId', async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    const { name, target_distance_km, goal_date, description } = req.body;

    const result = await db.query(
      `UPDATE "TrainingPlans"
       SET name = COALESCE($1, name),
           target_distance_km = COALESCE($2, target_distance_km),
           goal_date = COALESCE($3, goal_date),
           description = COALESCE($4, description)
       WHERE id = $5
       RETURNING id, user_id, name, target_distance_km, goal_date, description, created_at`,
      [name, target_distance_km, goal_date, description, planId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Training plan not found' });
      return;
    }

    res.status(200).json({
      message: 'Training plan updated successfully',
      plan: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(Number(port), () => {
  console.log(`🚴 Training Service running on port ${port}`);
});
