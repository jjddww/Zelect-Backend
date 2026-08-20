import express from 'express';
import homeRouter from './modules/home/home.route';
import categoryRouter from './modules/category/category.route';
import brandRouter from './modules/brand/brand.route';
import productRouter from './modules/product/product.route';
import searchRouter from './modules/search/search.route';

const app = express();

app.use(express.json());

app.use('/api/home', homeRouter);
app.use('/api/category', categoryRouter);
app.use('/api/brand', brandRouter);
app.use('/api/products', productRouter);
app.use('/api/search', searchRouter);

export default app;
