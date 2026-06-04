import express, { Request, Response } from 'express';
import { Client } from 'pg';

const app = express();
app.use(express.json());
const port = process.env.PORT || '3002';

// Cloud SQL connection via Unix socket when in GCP, fallback to host for local dev
const dbHost = process.env.DB_HOST || 'localhost';
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || 'password';
const dbName = process.env.DB_NAME || 'tricoach-db';
const cloudSqlConnectionName = process.env.CLOUD_SQL_CONNECTION_NAME;

const db = new Client(
  cloudSqlConnectionName
    ? {
        user: dbUser,
        password: dbPassword,
        database: dbName,
        host: `/cloudsql/${cloudSqlConnectionName}`,
      }
    : {
        host: dbHost,
        user: dbUser,
        password: dbPassword,
        database: dbName,
      }
);

db.connect().catch(err => console.error('Database connection failed:', err));

// Health check
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ service: 'Training Service', status: 'ok' });
});

// Log a workout
app.post('/workouts', async (req: Request, res: Response) => {
  try {
    const { user_id, type, duration_minutes, distance_km } = req.body;

    if (!user_id || !type || !duration_minutes) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const result = await db.query(
      `INSERT INTO "TrainingHistory" (user_id, type, duration_minutes, distance_km, timestamp)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, user_id, type, duration_minutes, distance_km, timestamp`,
      [user_id, type, duration_minutes, distance_km || null]
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
    const { type } = req.query;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const offset = parseInt(req.query.offset as string, 10) || 0;

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
    const { user_id, name, target_distance_km } = req.body;

    if (!user_id || !name || !target_distance_km) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const result = await db.query(
      `INSERT INTO "TrainingPlans" (user_id, name, target_distance_km)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, name, target_distance_km`,
      [user_id, name, target_distance_km]
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
      `SELECT id, user_id, name, target_distance_km 
       FROM "TrainingPlans" WHERE user_id = $1`,
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
      `SELECT id, user_id, name, target_distance_km 
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
    const { name, target_distance_km } = req.body;

    const result = await db.query(
      `UPDATE "TrainingPlans"
       SET name = COALESCE($1, name),
           target_distance_km = COALESCE($2, target_distance_km)
       WHERE id = $3
       RETURNING id, user_id, name, target_distance_km`,
      [name, target_distance_km, planId]
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
