import express, { Request, Response } from 'express';

const app = express();
const port = process.env.PORT || '3004';

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ service: 'Social Service', status: 'ok' });
});

app.listen(Number(port), () => {
  console.log(`Social service listening on port ${port}`);
});
