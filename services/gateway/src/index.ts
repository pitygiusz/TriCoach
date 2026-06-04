import express, { Request, Response, NextFunction } from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());
const port = process.env.PORT || '3000';

// Service URLs
const SERVICES = {
  user: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  training: process.env.TRAINING_SERVICE_URL || 'http://localhost:3002',
  analytics: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3003',
  social: process.env.SOCIAL_SERVICE_URL || 'http://localhost:3004',
  race: process.env.RACE_SERVICE_URL || 'http://localhost:3005',
};

// Simple API key verification middleware
const verifyApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] || process.env.API_KEY;
  if (!apiKey || apiKey !== 'demo-key') {
    // In production, implement proper auth
    // For MVP, log but continue
    console.log('API key verification skipped (MVP mode)');
  }
  next();
};

app.use(verifyApiKey);

// Health check
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    service: 'TriCoach API Gateway',
    status: 'ok',
    services: SERVICES,
  });
});

// USER SERVICE ROUTES
app.post('/api/users/register', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${SERVICES.user}/register`, req.body);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.post('/api/users/login', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${SERVICES.user}/login`, req.body);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/users/:userId/profile', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${SERVICES.user}/profile/${req.params.userId}`);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.put('/api/users/:userId/profile', async (req: Request, res: Response) => {
  try {
    const response = await axios.put(`${SERVICES.user}/profile/${req.params.userId}`, req.body);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/users/:userId/preferences', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${SERVICES.user}/preferences/${req.params.userId}`);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.put('/api/users/:userId/preferences', async (req: Request, res: Response) => {
  try {
    const response = await axios.put(`${SERVICES.user}/preferences/${req.params.userId}`, req.body);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// TRAINING SERVICE ROUTES
app.post('/api/workouts', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${SERVICES.training}/workouts`, req.body);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/workouts/:userId', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${SERVICES.training}/workouts/${req.params.userId}`, {
      params: req.query,
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.post('/api/plans', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${SERVICES.training}/plans`, req.body);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/plans/:userId', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${SERVICES.training}/plans/${req.params.userId}`);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/plans/:userId/:planId', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${SERVICES.training}/plans/${req.params.userId}/${req.params.planId}`);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.put('/api/plans/:planId', async (req: Request, res: Response) => {
  try {
    const response = await axios.put(`${SERVICES.training}/plans/${req.params.planId}`, req.body);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// ANALYTICS SERVICE ROUTES
app.get('/api/stats/:userId', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${SERVICES.analytics}/stats/${req.params.userId}`);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/trends/:userId/weekly', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${SERVICES.analytics}/trends/${req.params.userId}/weekly`);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/trends/:userId/monthly', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${SERVICES.analytics}/trends/${req.params.userId}/monthly`);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/milestones/:userId', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${SERVICES.analytics}/milestones/${req.params.userId}`);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.post('/api/milestones/:userId', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${SERVICES.analytics}/milestones/${req.params.userId}`, req.body);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/progress/:userId/:planId', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${SERVICES.analytics}/progress/${req.params.userId}/${req.params.planId}`);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// SOCIAL SERVICE ROUTES
app.post('/api/posts', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${SERVICES.social}/posts`, req.body);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/feed/:userId', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${SERVICES.social}/feed/${req.params.userId}`, {
      params: req.query,
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.post('/api/posts/:postId/like', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${SERVICES.social}/posts/${req.params.postId}/like`, req.body);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.post('/api/follow', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${SERVICES.social}/follow`, req.body);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/followers/:userId', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${SERVICES.social}/followers/${req.params.userId}`);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/following/:userId', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${SERVICES.social}/following/${req.params.userId}`);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// RACE SERVICE ROUTES
app.post('/api/race/predict', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${SERVICES.race}/predict`, req.body);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/races', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${SERVICES.race}/races`);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/race/predictions/:userId', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${SERVICES.race}/predictions/${req.params.userId}`);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.post('/api/race/simulate', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${SERVICES.race}/simulate`, req.body);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.listen(Number(port), () => {
  console.log(`🚪 API Gateway running on port ${port}`);
  console.log(`📍 Service URLs:`, SERVICES);
});
