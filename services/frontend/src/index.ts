import express, { Request, Response } from 'express';

const app = express();
const port = process.env.PORT || '8080';

app.get('/', (req: Request, res: Response) => {
  res.status(200).send('<!doctype html><html><head><meta charset="utf-8"><title>Frontend</title></head><body><h1>hello from frontend!</h1></body></html>');
});

app.listen(Number(port), () => {
  console.log(`Gateway listening on port ${port}`);
});
