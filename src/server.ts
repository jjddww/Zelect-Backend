import 'dotenv/config';
import { setupSwagger } from './config/swagger';
import app from './app';
import { cleanupExpiredReservations } from './modules/order/order.service';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await setupSwagger(app);

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    const cleanupInterval = setInterval(() => {
      cleanupExpiredReservations().catch((error) => {
        console.error('Expired inventory reservation cleanup failed', error);
      });
    }, 30_000);
    cleanupInterval.unref();
  });
};

startServer();
