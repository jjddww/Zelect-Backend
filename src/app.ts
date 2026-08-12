import express from 'express';
import homeRouter from './modules/home/home.route';
import categoryRouter from './modules/category/category.route';
import brandRouter from './modules/brand/brand.route';

const app = express();

app.use(express.json());

app.use('/api/home', homeRouter);
app.use('/api/category', categoryRouter);
app.use('/api/brand', brandRouter);

export default app;
