import express, { Request, Response } from 'express';

const app = express();
const port = process.env.PORT || '3000';

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Gateway service placeholder' });
});

app.listen(Number(port), () => {
  console.log(`Gateway listening on port ${port}`);
});
