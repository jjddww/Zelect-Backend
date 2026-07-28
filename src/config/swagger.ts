import swaggerUi from 'swagger-ui-express';
import SwaggerParser from '@apidevtools/swagger-parser';
import { Express } from 'express';
import path from 'path';

export const setupSwagger = async (app: Express) => {

  const swaggerDocument = await SwaggerParser.dereference(
    path.join(__dirname, '../docs/openapi.yaml')
  );

  app.use(
    '/api-docs',
    swaggerUi.serveFiles(swaggerDocument),
    swaggerUi.setup(swaggerDocument)
  );

};