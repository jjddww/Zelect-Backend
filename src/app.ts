import express from 'express';
import homeRouter from './modules/home/home.route';
import categoryRouter from './modules/category/category.route';
import brandRouter from './modules/brand/brand.route';
import productRouter from './modules/product/product.route';
import searchRouter from './modules/search/search.route';
import userRouter from './modules/user/user.route';
import likeRouter from './modules/like/like.route';
import cartRouter from './modules/cart/cart.route';
import { errorMiddleware } from './common/middleware/error.middleware';

const app = express();

app.use(express.json());

app.use('/api/home', homeRouter);
app.use('/api/category', categoryRouter);
app.use('/api/brand', brandRouter);
app.use('/api/products', productRouter);
app.use('/api/search', searchRouter);
app.use('/api/users', userRouter);
app.use('/api/like', likeRouter);
app.use('/api/cart', cartRouter);

app.use(errorMiddleware);

export default app;
