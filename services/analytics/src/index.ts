import express, { Request, Response } from 'express';
import { Client } from 'pg';

const app = express();
app.use(express.json());
const port = process.env.PORT || '3003';

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
  res.status(200).json({ service: 'Analytics Service', status: 'ok' });
});

// Get user statistics
app.get('/stats/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await db.query(
      `SELECT 
         COUNT(*) as total_workouts,
         SUM(CASE WHEN type = 'swim' THEN 1 ELSE 0 END) as swim_count,
         SUM(CASE WHEN type IN ('bike', 'ride') THEN 1 ELSE 0 END) as bike_count,
         SUM(CASE WHEN type = 'run' THEN 1 ELSE 0 END) as run_count,
         SUM(duration_minutes) as total_duration_minutes,
         SUM(distance_km) as total_distance_km,
         MAX(timestamp) as last_workout
       FROM "TrainingHistory"
       WHERE user_id = $1`,
      [userId]
    );

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get weekly trends
app.get('/trends/:userId/weekly', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await db.query(
      `SELECT 
         DATE_TRUNC('week', timestamp) as week_start,
         COUNT(*) as workouts,
         SUM(duration_minutes) as duration_minutes,
         SUM(distance_km) as distance_km
       FROM "TrainingHistory"
       WHERE user_id = $1 AND timestamp >= NOW() - INTERVAL '12 weeks'
       GROUP BY DATE_TRUNC('week', timestamp)
       ORDER BY week_start DESC`,
      [userId]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get monthly trends
app.get('/trends/:userId/monthly', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await db.query(
      `SELECT 
         DATE_TRUNC('month', timestamp) as month_start,
         COUNT(*) as workouts,
         SUM(duration_minutes) as duration_minutes,
         SUM(distance_km) as distance_km
       FROM "TrainingHistory"
       WHERE user_id = $1 AND timestamp >= NOW() - INTERVAL '12 months'
       GROUP BY DATE_TRUNC('month', timestamp)
       ORDER BY month_start DESC`,
      [userId]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get milestones and achievements
app.get('/milestones/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await db.query(
      `SELECT 
         id, user_id, milestone_name, milestone_type, value, achieved_at, description
       FROM "Milestones"
       WHERE user_id = $1
       ORDER BY achieved_at DESC`,
      [userId]
    );

    res.status(200).json({
      total_milestones: result.rows.length,
      milestones: result.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record a milestone achievement
app.post('/milestones/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { milestone_name, milestone_type, value, description } = req.body;

    if (!milestone_name || !milestone_type) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const result = await db.query(
      `INSERT INTO "Milestones" (user_id, milestone_name, milestone_type, value, description, achieved_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, user_id, milestone_name, milestone_type, value, description, achieved_at`,
      [userId, milestone_name, milestone_type, value || null, description || null]
    );

    res.status(201).json({
      message: 'Milestone recorded successfully',
      milestone: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get progress toward a training plan
app.get('/progress/:userId/:planId', async (req: Request, res: Response) => {
  try {
    const { userId, planId } = req.params;

    const planResult = await db.query(
      `SELECT target_distance_km FROM "TrainingPlans" WHERE id = $1 AND user_id = $2`,
      [planId, userId]
    );

    if (planResult.rows.length === 0) {
      res.status(404).json({ error: 'Training plan not found' });
      return;
    }

    const progressResult = await db.query(
      `SELECT SUM(distance_km) as covered_distance FROM "TrainingHistory" WHERE user_id = $1`,
      [userId]
    );

    const target = planResult.rows[0].target_distance_km;
    const covered = progressResult.rows[0].covered_distance || 0;
    const percentage = (covered / target) * 100;

    res.status(200).json({
      plan_id: planId,
      target_distance_km: target,
      covered_distance_km: covered,
      percentage_complete: Math.min(percentage, 100),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(Number(port), () => {
  console.log(`📊 Analytics Service running on port ${port}`);
});
