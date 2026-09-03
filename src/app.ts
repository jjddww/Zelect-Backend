import express from 'express';
import homeRouter from './modules/home/home.route';
import categoryRouter from './modules/category/category.route';
import brandRouter from './modules/brand/brand.route';
import productRouter from './modules/product/product.route';
import searchRouter from './modules/search/search.route';
import userRouter from './modules/user/user.route';
import likeRouter from './modules/like/like.route';
import cartRouter from './modules/cart/cart.route';
import orderRouter from './modules/order/order.route';
import paymentRouter from './modules/payment/payment.route';
import { errorMiddleware } from './common/middleware/error.middleware';

const app = express();

// 포트원 V2 웹훅 서명 검증에는 JSON 파싱 전의 원문 본문이 필요하다.
app.use('/api/payments/webhook', express.text({ type: 'application/json' }));
app.use(express.json());

app.use('/api/home', homeRouter);
app.use('/api/category', categoryRouter);
app.use('/api/brand', brandRouter);
app.use('/api/products', productRouter);
app.use('/api/search', searchRouter);
app.use('/api/users', userRouter);
app.use('/api/like', likeRouter);
app.use('/api/cart', cartRouter);
app.use('/api/order', orderRouter);
app.use('/api/payments', paymentRouter);

app.use(errorMiddleware);

export default app;
