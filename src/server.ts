import 'dotenv/config';
import { setupSwagger } from './config/swagger';
import app from './app';

const PORT = process.env.PORT || 3000;

const startServer = async () => {

  await setupSwagger(app);


  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

};


startServer();