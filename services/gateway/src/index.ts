import express, { Request, Response } from 'express';

const app = express();
const port = process.env.PORT || '3000';

app.get('/', (req: Request, res: Response) => {
  res.status(200).send('<!doctype html><html><head><meta charset="utf-8"><title>Gateway</title></head><body><h1>hello world</h1></body></html>');
});

app.listen(Number(port), '0.0.0.0', () => {
  console.log(`Gateway listening on port ${port}`);
});
