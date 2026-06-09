import express, { Request, Response } from 'express';
import path from 'path';

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const port = process.env.PORT || '8080';
const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:3000';

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
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/profile', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'profile.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(Number(port), () => {
  console.log(`🎯 TriCoach frontend  →  http://localhost:${port}`);
  console.log(`🔀 API proxy target  →  ${gatewayUrl}`);
});
