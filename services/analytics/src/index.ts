import express, { Request, Response } from 'express';

const app = express();
const port = process.env.PORT || '3003';

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ service: 'Analytics Service', status: 'ok' });
});

app.listen(Number(port), () => {
  console.log(`Analytics service listening on port ${port}`);
});
