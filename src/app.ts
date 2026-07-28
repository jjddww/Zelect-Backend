import express from 'express';
import homeRouter from './modules/home/home.route';

const app = express();

app.use(express.json());

app.use('/api/home', homeRouter);

export default app;
