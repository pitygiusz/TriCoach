import express, { Request, Response } from 'express';

const app = express();
const port = process.env.PORT || '3002';

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ service: 'Training Service', status: 'ok' });
});

app.listen(Number(port), () => {
  console.log(`Training service listening on port ${port}`);
});
