import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(express.json());

const port = process.env.PORT || '8080';
const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:3000';

// ─── Firebase config (injected into HTML) ─────────────────────────────────────
const firebaseConfig = {
  apiKey:                process.env.FIREBASE_API_KEY || '',
  authDomain:            process.env.FIREBASE_AUTH_DOMAIN || '',
  projectId:             process.env.FIREBASE_PROJECT_ID || '',
  storageBucket:         process.env.FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId:     process.env.FIREBASE_MESSAGING_SENDER_ID || '',
  appId:                 process.env.FIREBASE_APP_ID || '',
  measurementId:         process.env.FIREBASE_MEASUREMENT_ID || '',
};

function serveWithFirebaseConfig(fileName: string, res: Response) {
  const filePath = path.join(__dirname, fileName);
  try {
    let html = fs.readFileSync(filePath, 'utf-8');
    html = html.replace(
      '</head>',
      `<script>window.__FIREBASE_CONFIG__ = ${JSON.stringify(firebaseConfig)};</script>\n</head>`
    );
    res.send(html);
  } catch {
    res.status(404).send('Not found');
  }
}

// ─── API Proxy ────────────────────────────────────────────────────────────────
// The browser JS calls /api/* relative to whatever port the page is served from
// (port 8080). Without this proxy those requests hit the frontend server and die.
// This forwards every /api/* call to the gateway (port 3000) server-side,
// bypassing the browser's cross-origin restrictions entirely.
app.all('/api/*', async (req: Request, res: Response) => {
  const qs = Object.keys(req.query).length
    ? '?' + new URLSearchParams(req.query as Record<string, string>).toString()
    : '';
  const target = `${gatewayUrl}${req.path}${qs}`;

  try {
    const opts: RequestInit = {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      opts.body = JSON.stringify(req.body);
    }

    const upstream = await fetch(target, opts);
    const payload = await upstream.json();
    res.status(upstream.status).json(payload);
  } catch (err: any) {
    console.error(`[Proxy] ${req.method} ${target} →`, err.message);
    res.status(502).json({
      error: 'Gateway unreachable',
      detail: `Could not reach ${gatewayUrl}. Is the gateway running?`,
    });
  }
});

// ─── Pages ────────────────────────────────────────────────────────────────────
app.get('/', (_req: Request, res: Response) => {
  serveWithFirebaseConfig('index.html', res);
});

app.get('/index.html', (_req: Request, res: Response) => {
  serveWithFirebaseConfig('index.html', res);
});

app.get('/login', (_req: Request, res: Response) => {
  serveWithFirebaseConfig('login.html', res);
});

app.get('/login.html', (_req: Request, res: Response) => {
  serveWithFirebaseConfig('login.html', res);
});

app.get('/profile', (_req: Request, res: Response) => {
  serveWithFirebaseConfig('profile.html', res);
});

app.get('/profile.html', (_req: Request, res: Response) => {
  serveWithFirebaseConfig('profile.html', res);
});

app.get('/workouts', (_req: Request, res: Response) => {
  serveWithFirebaseConfig('workouts.html', res);
});

app.get('/workouts.html', (_req: Request, res: Response) => {
  serveWithFirebaseConfig('workouts.html', res);
});

app.get('/ai-analysis', (_req: Request, res: Response) => {
  serveWithFirebaseConfig('ai-analysis.html', res);
});

app.get('/ai-analysis.html', (_req: Request, res: Response) => {
  serveWithFirebaseConfig('ai-analysis.html', res);
});

app.get('/console', (req: Request, res: Response) => {
  serveWithFirebaseConfig('console.html', res);
});

app.get('/console.html', (req: Request, res: Response) => {
  serveWithFirebaseConfig('console.html', res);
});

app.use(express.static(path.join(__dirname), { index: false }));

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(Number(port), () => {
  console.log(`🎯 TriCoach frontend  →  http://localhost:${port}`);
  console.log(`🔀 API proxy target  →  ${gatewayUrl}`);
});
