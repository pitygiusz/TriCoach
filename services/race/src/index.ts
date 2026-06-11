import express, { Request, Response } from 'express';
import { Client } from 'pg';
import OpenAI from 'openai';
import crypto from 'crypto';

const app = express();
app.use(express.json());
const port = process.env.PORT || '3005';

// Cloud SQL connection setup
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

// OpenRouter setup via OpenAI framework
const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || 'missing_key',
});

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

// Health check
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ service: 'Race Service', status: 'ok' });
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

// 1. STANDARD SIMULATE (Mathematical Algorithm)
app.post('/simulate', async (req: Request, res: Response) => {
  try {
    const { user_id, race_type } = req.body;

    if (!user_id || !race_type || !RACE_DISTANCES[race_type]) {
      res.status(400).json({ error: 'Invalid race_type or missing user_id' });
      return;
    }

    const statsResult = await db.query(
      `SELECT 
         AVG(CASE WHEN type = 'swim' THEN duration_minutes / NULLIF(distance_km, 0) END) as swim_pace,
         AVG(CASE WHEN type IN ('bike', 'ride') THEN duration_minutes / NULLIF(distance_km, 0) END) as bike_pace,
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
    const totalMinutes = swimTime + bikeTime + runTime + 10; // +10 mins for transitions

    res.status(200).json({
      race_type,
      user_training_workouts: stats.total_workouts,
      segments: {
        swim: { distance: distances.swim, time_minutes: swimTime, pace: stats.swim_pace || 'N/A' },
        bike: { distance: distances.bike, time_minutes: bikeTime, pace: stats.bike_pace || 'N/A' },
        run: { distance: distances.run, time_minutes: runTime, pace: stats.run_pace || 'N/A' },
      },
      total_time_minutes: totalMinutes,
      total_distance_km: distances.swim + distances.bike + distances.run,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. NEW AI SIMULATE (Powered by OpenRouter)
app.post('/simulate-ai', async (req: Request, res: Response) => {
  try {
    const { user_id, race_type } = req.body;

    if (!user_id || !race_type || !RACE_DISTANCES[race_type]) {
      res.status(400).json({ error: 'Invalid race_type or missing user_id' });
      return;
    }

    // Fetch user's historical training stats
    const statsResult = await db.query(
      `SELECT 
         AVG(CASE WHEN type = 'swim' THEN duration_minutes / NULLIF(distance_km, 0) END) as swim_pace,
         AVG(CASE WHEN type IN ('bike', 'ride') THEN duration_minutes / NULLIF(distance_km, 0) END) as bike_pace,
         AVG(CASE WHEN type = 'run' THEN duration_minutes / NULLIF(distance_km, 0) END) as run_pace,
         COUNT(*) as total_workouts
       FROM "TrainingHistory"
       WHERE user_id = $1`,
      [user_id]
    );

    const stats = statsResult.rows[0];
    const distances = RACE_DISTANCES[race_type];

    // Build the prompt for the AI model
    const systemPrompt = `You are an expert triathlon coach. Your task is to estimate a race completion time for the '${race_type}' distance based on the athlete's training data.

Athlete's historical pace data:
- Swim: ${stats.swim_pace ? parseFloat(stats.swim_pace).toFixed(2) : 'No data, assume average amateur pace'} min/km
- Bike: ${stats.bike_pace ? parseFloat(stats.bike_pace).toFixed(2) : 'No data, assume average amateur pace'} min/km
- Run: ${stats.run_pace ? parseFloat(stats.run_pace).toFixed(2) : 'No data, assume average amateur pace'} min/km
Total logged workouts: ${stats.total_workouts}.

The distances for this race are: Swim ${distances.swim}km, Bike ${distances.bike}km, Run ${distances.run}km.

Analyze this data. Take into account fatigue accumulation across disciplines and typical transition times (T1, T2).
You MUST return the response ONLY as a valid JSON object without any markdown wrapping. Use the exact structure below:
{
  "total_time_minutes": 150.5,
  "formatted_time": "2h 30m",
  "ai_analysis": "A brief analysis of why this time is predicted, considering transitions and fatigue."
}`;

    // Request prediction from OpenRouter (using Gemini Flash via OpenRouter for speed and low cost)
    const aiResponse = await openai.chat.completions.create({
      model: "deepseek/deepseek-v4-flash", 
      messages: [{ role: "system", content: systemPrompt }],
      response_format: { type: "json_object" }
    });

    const aiContent = aiResponse.choices[0]?.message?.content || '{}';
    const predictionData = JSON.parse(aiContent);

    // Return the AI prediction to the frontend
    res.status(200).json({
      success: true,
      race_type,
      distances,
      ai_prediction: predictionData
    });

  } catch (error) {
    console.error('AI Simulation error:', error);
    res.status(500).json({ error: 'AI Simulation failed' });
  }
});

// 3. NEW AI HISTORY ANALYZER (Powered by OpenRouter)
app.post('/analyze-history-ai', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      res.status(400).json({ error: 'Missing user_id' });
      return;
    }

    // 1. Fetch aggregate stats
    const statsResult = await db.query(
      `SELECT 
         type,
         COUNT(*) as count,
         SUM(duration_minutes) as total_duration,
         SUM(distance_km) as total_distance,
         AVG(duration_minutes / NULLIF(distance_km, 0)) as avg_pace
       FROM "TrainingHistory"
       WHERE user_id = $1
       GROUP BY type`,
      [user_id]
    );

    // 2. Fetch recent workouts
    const historyResult = await db.query(
      `SELECT 
         type,
         duration_minutes,
         distance_km,
         timestamp
       FROM "TrainingHistory"
       WHERE user_id = $1
       ORDER BY timestamp DESC
       LIMIT 30`,
      [user_id]
    );

    const stats = statsResult.rows;
    const history = historyResult.rows;

    const statsDescription = stats.map(s => {
      const avgPace = s.avg_pace ? parseFloat(s.avg_pace).toFixed(2) : 'N/A';
      return `- Type: ${s.type}, Count: ${s.count}, Total Duration: ${s.total_duration} mins, Total Distance: ${s.total_distance ? parseFloat(s.total_distance).toFixed(2) : 0} km, Avg Pace: ${avgPace} min/km`;
    }).join('\n');

    const historyDescription = history.map(h => {
      const date = new Date(h.timestamp).toISOString().split('T')[0];
      return `- [${date}] ${h.type.toUpperCase()}: ${h.duration_minutes} mins, ${h.distance_km ? parseFloat(h.distance_km).toFixed(2) : 0} km`;
    }).join('\n');

    const systemPrompt = `You are an expert triathlon coach and sports scientist. Your task is to analyze the athlete's training history and provide a professional, structured critique with actionable feedback.

Athlete's aggregate training statistics:
${statsDescription || 'No aggregate stats available.'}

Athlete's recent 30 training sessions (newest first):
${historyDescription || 'No training sessions logged yet.'}

Analyze the training volume, frequency, pacing trends, and consistency. Identify active disciplines versus neglected ones.
Provide your response ONLY as a valid JSON object without any markdown wrapping. Use the exact structure below:
{
  "total_workouts": ${history.length},
  "coaching_critique": "A detailed narrative of 2-3 paragraphs analyzing the consistency, progression, discipline balance, and pacing quality. Highlight achievements and call out potential overtraining, pacing issues, or lack of frequency.",
  "key_findings": [
    "A list of 3-4 specific observations about the athlete's training (e.g. 'Strong running pace progression', 'Neglected swimming volume', 'Training gaps in the last week')"
  ],
  "recommendations": [
    "A list of 3-4 highly actionable recommendations for the athlete (e.g. 'Add a 45-minute recovery run on Wednesdays', 'Focus on swim consistency by adding 1 session next week')"
  ]
}`;

    const aiResponse = await openai.chat.completions.create({
      model: "deepseek/deepseek-v4-flash",
      messages: [{ role: "system", content: systemPrompt }],
      response_format: { type: "json_object" }
    });

    const aiContent = aiResponse.choices[0]?.message?.content || '{}';
    const analysisData = JSON.parse(aiContent);

    res.status(200).json({
      success: true,
      analysis: analysisData
    });

  } catch (error) {
    console.error('AI History Analysis error:', error);
    res.status(500).json({ error: 'AI History Analysis failed' });
  }
});

// 4. NEW AI PLAN GENERATOR (Powered by OpenRouter)
app.post('/generate-plan-ai', async (req: Request, res: Response) => {
  try {
    const { user_id, target_name, target_distance_km, duration_weeks } = req.body;

    if (!user_id || !target_name || !target_distance_km || !duration_weeks) {
      res.status(400).json({ error: 'Missing required parameters: user_id, target_name, target_distance_km, duration_weeks' });
      return;
    }

    // 1. Fetch aggregate stats
    const statsResult = await db.query(
      `SELECT 
         type,
         COUNT(*) as count,
         SUM(duration_minutes) as total_duration,
         SUM(distance_km) as total_distance,
         AVG(duration_minutes / NULLIF(distance_km, 0)) as avg_pace
       FROM "TrainingHistory"
       WHERE user_id = $1
       GROUP BY type`,
      [user_id]
    );

    // 2. Fetch recent workouts
    const historyResult = await db.query(
      `SELECT 
         type,
         duration_minutes,
         distance_km,
         timestamp
       FROM "TrainingHistory"
       WHERE user_id = $1
       ORDER BY timestamp DESC
       LIMIT 30`,
      [user_id]
    );

    const stats = statsResult.rows;
    const history = historyResult.rows;

    const statsDescription = stats.map(s => {
      const avgPace = s.avg_pace ? parseFloat(s.avg_pace).toFixed(2) : 'N/A';
      return `- Type: ${s.type}, Count: ${s.count}, Total Duration: ${s.total_duration} mins, Total Distance: ${s.total_distance ? parseFloat(s.total_distance).toFixed(2) : 0} km, Avg Pace: ${avgPace} min/km`;
    }).join('\n');

    const historyDescription = history.map(h => {
      const date = new Date(h.timestamp).toISOString().split('T')[0];
      return `- [${date}] ${h.type.toUpperCase()}: ${h.duration_minutes} mins, ${h.distance_km ? parseFloat(h.distance_km).toFixed(2) : 0} km`;
    }).join('\n');

    // 3. Save new plan metadata to SQL DB TrainingPlans table
    const planId = crypto.randomUUID();
    await db.query(
      `INSERT INTO "TrainingPlans" (id, user_id, name, target_distance_km)
       VALUES ($1, $2, $3, $4)`,
      [planId, user_id, target_name, target_distance_km]
    );

    const systemPrompt = `You are an expert triathlon coach and sports scientist. Your task is to generate a detailed, highly personalized training plan for an athlete.

Athlete's aggregate training statistics:
${statsDescription || 'No aggregate stats available.'}

Athlete's recent 30 training sessions (newest first):
${historyDescription || 'No training sessions logged yet.'}

Target Goal Name: "${target_name}"
Target Distance (km): ${target_distance_km}
Plan Duration: ${duration_weeks} weeks

Analyze the athlete's current training volume, pacing, and history. Build a progressive training program that fits their current fitness level and safely scales up to meet their target goal.
You MUST structure the response strictly as a valid JSON object without any markdown wrapping. Use the exact structure below:
{
  "overview": "A detailed narrative (1-2 paragraphs) of the coaching strategy, highlighting how this plan bridges their recent training to their target goal.",
  "weeks": [
    {
      "week_number": 1,
      "focus": "Focus of the week (e.g., Base building & technique)",
      "days": [
        { "day": "Monday", "activity": "Swim/Bike/Run/Rest/Brick", "description": "Specific training instruction including durations, distances, or target pacing." },
        { "day": "Tuesday", "activity": "Swim/Bike/Run/Rest/Brick", "description": "Specific training instruction." },
        { "day": "Wednesday", "activity": "Swim/Bike/Run/Rest/Brick", "description": "Specific training instruction." },
        { "day": "Thursday", "activity": "Swim/Bike/Run/Rest/Brick", "description": "Specific training instruction." },
        { "day": "Friday", "activity": "Swim/Bike/Run/Rest/Brick", "description": "Specific training instruction." },
        { "day": "Saturday", "activity": "Swim/Bike/Run/Rest/Brick", "description": "Specific training instruction." },
        { "day": "Sunday", "activity": "Swim/Bike/Run/Rest/Brick", "description": "Specific training instruction." }
      ]
    }
  ]
}`;

    const aiResponse = await openai.chat.completions.create({
      model: "deepseek/deepseek-v4-flash",
      messages: [{ role: "system", content: systemPrompt }],
      response_format: { type: "json_object" }
    });

    const aiContent = aiResponse.choices[0]?.message?.content || '{}';
    const planDetails = JSON.parse(aiContent);

    res.status(200).json({
      success: true,
      plan_id: planId,
      name: target_name,
      target_distance_km,
      duration_weeks,
      overview: planDetails.overview,
      weeks: planDetails.weeks
    });

  } catch (error) {
    console.error('AI Plan Generation error:', error);
    res.status(500).json({ error: 'AI Plan Generation failed' });
  }
});

// Listen without specifying 0.0.0.0
app.listen(Number(port), () => {
  console.log(`🏁 Race Service running on port ${port}`);
});