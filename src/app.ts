import express from 'express';
import homeRouter from './modules/home/home.route';
import categoryRouter from './modules/category/category.route';

const app = express();

app.use(express.json());

app.use('/api/home', homeRouter);
app.use('/api/category', categoryRouter);

export default app;
 