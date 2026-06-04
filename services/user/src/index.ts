import express, { Request, Response } from 'express';

const app = express();
const port = process.env.PORT || '3001';

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ service: 'User Service', status: 'ok' });
});

app.listen(Number(port), () => {
  console.log(`User service listening on port ${port}`);
});
