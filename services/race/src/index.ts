import express, { Request, Response } from 'express';
import { Client } from 'pg';

const app = express();
app.use(express.json());
const port = process.env.PORT || '3005';

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

interface RaceDistance {
  swim: number;
  bike: number;
  run: number;
}

const RACE_DISTANCES: { [key: string]: RaceDistance } = {
  sprint: { swim: 0.75, bike: 20, run: 5 },
  olympic: { swim: 1.5, bike: 40, run: 10 },
  half_ironman: { swim: 1.9, bike: 90, run: 21.1 },
  ironman: { swim: 3.86, bike: 180, run: 42.2 },
};

const AVERAGE_SPEEDS = {
  swim: 1.2, // km/min
  bike: 0.3, // km/min
  run: 0.15, // km/min
};

// Health check
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ service: 'Race Service', status: 'ok' });
});

// Predict race finish time
app.post('/predict', async (req: Request, res: Response) => {
  try {
    const { user_id, race_type } = req.body;

    if (!user_id || !race_type) {
      res.status(400).json({ error: 'Missing user_id or race_type' });
      return;
    }

    if (!RACE_DISTANCES[race_type]) {
      res.status(400).json({ error: 'Invalid race type. Use: sprint, olympic, half_ironman, ironman' });
      return;
    }

    // Get user's average paces from training history
    const swimResult = await db.query(
      `SELECT AVG(duration_minutes / NULLIF(distance_km, 0)) as avg_pace FROM "TrainingHistory" WHERE user_id = $1 AND type = 'swim'`,
      [user_id]
    );

    const bikeResult = await db.query(
      `SELECT AVG(duration_minutes / NULLIF(distance_km, 0)) as avg_pace FROM "TrainingHistory" WHERE user_id = $1 AND type = 'bike'`,
      [user_id]
    );

    const runResult = await db.query(
      `SELECT AVG(duration_minutes / NULLIF(distance_km, 0)) as avg_pace FROM "TrainingHistory" WHERE user_id = $1 AND type = 'run'`,
      [user_id]
    );

    const distances = RACE_DISTANCES[race_type];

    // Calculate times in minutes
    const swimPace = swimResult.rows[0]?.avg_pace || 1.5; // Default pace if no data
    const bikePace = bikeResult.rows[0]?.avg_pace || 3; // Default pace if no data
    const runPace = runResult.rows[0]?.avg_pace || 6; // Default pace if no data

    const swimTime = distances.swim * swimPace;
    const bikeTime = distances.bike * bikePace;
    const runTime = distances.run * runPace;

    const totalMinutes = swimTime + bikeTime + runTime + 10; // +10 for transitions
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);

    // Store prediction
    await db.query(
      `INSERT INTO "RacePredictions" (user_id, race_type, predicted_time_minutes, predicted_time_formatted, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [user_id, race_type, totalMinutes, `${hours}h ${minutes}m`]
    );

    res.status(200).json({
      race_type,
      distances,
      segment_times: {
        swim: `${Math.floor(swimTime)}m ${Math.floor(swimTime % 1 * 60)}s`,
        bike: `${Math.floor(bikeTime / 60)}h ${Math.floor(bikeTime % 60)}m`,
        run: `${Math.floor(runTime)}m ${Math.floor(runTime % 1 * 60)}s`,
      },
      total_time: `${hours}h ${minutes}m`,
      total_minutes: totalMinutes,
      confidence: 'medium', // Could be enhanced with ML
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available race distances
app.get('/races', (req: Request, res: Response) => {
  res.status(200).json({
    available_races: Object.keys(RACE_DISTANCES),
    distances: RACE_DISTANCES,
  });
});

// Get user's prediction history
app.get('/predictions/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await db.query(
      `SELECT id, user_id, race_type, predicted_time_minutes, predicted_time_formatted, created_at
       FROM "RacePredictions"
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId]
    );

    res.status(200).json({
      total_predictions: result.rows.length,
      predictions: result.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Simulate a race (get detailed breakdown)
app.post('/simulate', async (req: Request, res: Response) => {
  try {
    const { user_id, race_type } = req.body;

    if (!user_id || !race_type || !RACE_DISTANCES[race_type]) {
      res.status(400).json({ error: 'Invalid race_type or missing user_id' });
      return;
    }

    // Get historical data
    const statsResult = await db.query(
      `SELECT 
         AVG(CASE WHEN type = 'swim' THEN duration_minutes / NULLIF(distance_km, 0) END) as swim_pace,
         AVG(CASE WHEN type = 'bike' THEN duration_minutes / NULLIF(distance_km, 0) END) as bike_pace,
         AVG(CASE WHEN type = 'run' THEN duration_minutes / NULLIF(distance_km, 0) END) as run_pace,
         COUNT(*) as total_workouts
       FROM "TrainingHistory"
       WHERE user_id = $1`,
      [user_id]
    );

    const distances = RACE_DISTANCES[race_type];
    const stats = statsResult.rows[0];

    const swimTime = distances.swim * (stats.swim_pace || 1.5);
    const bikeTime = distances.bike * (stats.bike_pace || 3);
    const runTime = distances.run * (stats.run_pace || 6);
    const totalMinutes = swimTime + bikeTime + runTime + 10;

    res.status(200).json({
      race_type,
      user_training_workouts: stats.total_workouts,
      segments: {
        swim: {
          distance: distances.swim,
          time_minutes: swimTime,
          pace: stats.swim_pace || 'N/A',
        },
        bike: {
          distance: distances.bike,
          time_minutes: bikeTime,
          pace: stats.bike_pace || 'N/A',
        },
        run: {
          distance: distances.run,
          time_minutes: runTime,
          pace: stats.run_pace || 'N/A',
        },
      },
      total_time_minutes: totalMinutes,
      total_distance_km: distances.swim + distances.bike + distances.run,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(Number(port), () => {
  console.log(`🏁 Race Service running on port ${port}`);
});
