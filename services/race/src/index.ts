import express, { Request, Response } from 'express';

const app = express();
const port = process.env.PORT || '3005';

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ service: 'Race Service', status: 'ok' });
});

app.listen(Number(port), () => {
  console.log(`Race service listening on port ${port}`);
});
