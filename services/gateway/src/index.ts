import express, { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import cors from 'cors';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const port = process.env.PORT || '3000';

// Service URLs — override with env vars in Docker / Cloud Run
const SERVICES = {
  user:     process.env.USER_SERVICE_URL     || 'http://localhost:3001',
  training: process.env.TRAINING_SERVICE_URL || 'http://localhost:3002',
  analytics:process.env.ANALYTICS_SERVICE_URL|| 'http://localhost:3003',
  social:   process.env.SOCIAL_SERVICE_URL   || 'http://localhost:3004',
  race:     process.env.RACE_SERVICE_URL     || 'http://localhost:3005',
};

// MVP auth middleware — logs but doesn't block
const verifyApiKey = (_req: Request, _res: Response, next: NextFunction) => next();
app.use(verifyApiKey);

// Health check
app.get('/', (_req: Request, res: Response) => {
  res.json({ service: 'TriCoach API Gateway', status: 'ok', services: SERVICES });
});

// ─── USER SERVICE ─────────────────────────────────────────────────────────────
app.post('/api/users/register', async (req: Request, res: Response) => {
  try {
    const r = await axios.post(`${SERVICES.user}/register`, req.body);
    res.status(r.status).json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json({ error: e.message }); }
});

app.post('/api/users/login', async (req: Request, res: Response) => {
  try {
    const r = await axios.post(`${SERVICES.user}/login`, req.body);
    res.status(r.status).json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json({ error: e.message }); }
});

app.get('/api/users/:userId/profile', async (req: Request, res: Response) => {
  try {
    const r = await axios.get(`${SERVICES.user}/profile/${req.params.userId}`);
    res.status(r.status).json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json({ error: e.message }); }
});

app.put('/api/users/:userId/profile', async (req: Request, res: Response) => {
  try {
    const r = await axios.put(`${SERVICES.user}/profile/${req.params.userId}`, req.body);
    res.status(r.status).json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json({ error: e.message }); }
});

app.get('/api/users/:userId/preferences', async (req: Request, res: Response) => {
  try {
    const r = await axios.get(`${SERVICES.user}/preferences/${req.params.userId}`);
    res.status(r.status).json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json({ error: e.message }); }
});

app.put('/api/users/:userId/preferences', async (req: Request, res: Response) => {
  try {
    const r = await axios.put(`${SERVICES.user}/preferences/${req.params.userId}`, req.body);
    res.status(r.status).json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json({ error: e.message }); }
});

// ─── TRAINING SERVICE ─────────────────────────────────────────────────────────
app.post('/api/workouts', async (req: Request, res: Response) => {
  try {
    const r = await axios.post(`${SERVICES.training}/workouts`, req.body);
    res.status(r.status).json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json({ error: e.message }); }
});

app.get('/api/workouts/:userId', async (req: Request, res: Response) => {
  try {
    const r = await axios.get(`${SERVICES.training}/workouts/${req.params.userId}`, { params: req.query });
    res.status(r.status).json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json({ error: e.message }); }
});

app.delete('/api/workouts/:workoutId', async (req: Request, res: Response) => {
  try {
    const r = await axios.delete(`${SERVICES.training}/workouts/${req.params.workoutId}`);
    res.status(r.status).json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json({ error: e.message }); }
});

app.post('/api/plans', async (req: Request, res: Response) => {
  try {
    const r = await axios.post(`${SERVICES.training}/plans`, req.body);
    res.status(r.status).json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json({ error: e.message }); }
});

app.get('/api/plans/:userId', async (req: Request, res: Response) => {
  try {
    const r = await axios.get(`${SERVICES.training}/plans/${req.params.userId}`);
    res.status(r.status).json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json({ error: e.message }); }
});

app.get('/api/plans/:userId/:planId', async (req: Request, res: Response) => {
  try {
    const r = await axios.get(`${SERVICES.training}/plans/${req.params.userId}/${req.params.planId}`);
    res.status(r.status).json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json({ error: e.message }); }
});

app.put('/api/plans/:planId', async (req: Request, res: Response) => {
  try {
    const r = await axios.put(`${SERVICES.training}/plans/${req.params.planId}`, req.body);
    res.status(r.status).json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json({ error: e.message }); }
});

// ─── ANALYTICS SERVICE ────────────────────────────────────────────────────────
app.get('/api/stats/:userId', async (req: Request, res: Response) => {
  try {
    const r = await axios.get(`${SERVICES.analytics}/stats/${req.params.userId}`);
    res.status(r.status).json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json({ error: e.message }); }
});

app.get('/api/trends/:userId/weekly', async (req: Request, res: Response) => {
  try {
    const r = await axios.get(`${SERVICES.analytics}/trends/${req.params.userId}/weekly`);
    res.status(r.status).json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json({ error: e.message }); }
});

app.get('/api/trends/:userId/monthly', async (req: Request, res: Response) => {
  try {
    const r = await axios.get(`${SERVICES.analytics}/trends/${req.params.userId}/monthly`);
    res.status(r.status).json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json({ error: e.message }); }
});

app.get('/api/milestones/:userId', async (req: Request, res: Response) => {
  try {
    const r = await axios.get(`${SERVICES.analytics}/milestones/${req.params.userId}`);
    res.status(r.status).json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json({ error: e.message }); }
});

app.post('/api/milestones/:userId', async (req: Request, res: Response) => {
  try {
    const r = await axios.post(`${SERVICES.analytics}/milestones/${req.params.userId}`, req.body);
    res.status(r.status).json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json({ error: e.message }); }
});

app.get('/api/progress/:userId/:planId', async (req: Request, res: Response) => {
  try {
    const r = await axios.get(`${SERVICES.analytics}/progress/${req.params.userId}/${req.params.planId}`);
    res.status(r.status).json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json({ error: e.message }); }
});

// ─── SOCIAL SERVICE ───────────────────────────────────────────────────────────
// BUG FIX: original code had GET /posts (no /api prefix) — the frontend was
// calling GET /api/posts and getting a 404. Fixed by adding the correct route.
app.get('/api/posts', async (req: Request, res: Response) => {
  try {
    const r = await axios.get(`${SERVICES.social}/posts`, { params: req.query });
    res.status(r.status).json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json({ error: e.message }); }
});

app.post('/api/posts', async (req: Request, res: Response) => {
  try {
    const r = await axios.post(`${SERVICES.social}/posts`, req.body);
    res.status(r.status).json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json({ error: e.message }); }
});

app.get('/api/feed/:userId', async (req: Request, res: Response) => {
  try {
    const r = await axios.get(`${SERVICES.social}/feed/${req.params.userId}`, { params: req.query });
    res.status(r.status).json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json({ error: e.message }); }
});

app.post('/api/posts/:postId/like', async (req: Request, res: Response) => {
  try {
    const r = await axios.post(`${SERVICES.social}/posts/${req.params.postId}/like`, req.body);
    res.status(r.status).json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json({ error: e.message }); }
});

app.post('/api/follow', async (req: Request, res: Response) => {
  try {
    const r = await axios.post(`${SERVICES.social}/follow`, req.body);
    res.status(r.status).json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json({ error: e.message }); }
});

app.get('/api/followers/:userId', async (req: Request, res: Response) => {
  try {
    const r = await axios.get(`${SERVICES.social}/followers/${req.params.userId}`);
    res.status(r.status).json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json({ error: e.message }); }
});

app.get('/api/following/:userId', async (req: Request, res: Response) => {
  try {
    const r = await axios.get(`${SERVICES.social}/following/${req.params.userId}`);
    res.status(r.status).json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json({ error: e.message }); }
});

// ─── RACE SERVICE ─────────────────────────────────────────────────────────────
app.get('/api/races', async (req: Request, res: Response) => {
  try {
    const r = await axios.get(`${SERVICES.race}/races`);
    res.status(r.status).json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json({ error: e.message }); }
});

app.get('/api/race/predictions/:userId', async (req: Request, res: Response) => {
  try {
    const r = await axios.get(`${SERVICES.race}/predictions/${req.params.userId}`);
    res.status(r.status).json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json({ error: e.message }); }
});

app.post('/api/race/simulate', async (req: Request, res: Response) => {
  try {
    const r = await axios.post(`${SERVICES.race}/simulate`, req.body);
    res.status(r.status).json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json({ error: e.message }); }
});

app.post('/api/race/simulate-ai', async (req: Request, res: Response) => {
  try {
    const r = await axios.post(`${SERVICES.race}/simulate-ai`, req.body);
    res.status(r.status).json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json({ error: e.message }); }
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(Number(port), () => {
  console.log(`🚪 API Gateway  →  http://localhost:${port}`);
  console.log(`📍 Services:`, SERVICES);
});
