import express from 'express';
import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

export default (app: express.Application): void => {
  const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'The Explorer Backend API',
        version: '1.0.0',
        description:
          'The Explorer Backend API provides various informational API endpoints to retrieve information about the Pastel Blockchain',
      },
      servers: [
        {
          url: process.env.SWAGGER_DOMAIN,
        },
      ],
    },
    apis: [
      path.join(__dirname, 'routes/*.ts'),
      path.join(__dirname, 'controllers/*.ts'),
      path.join(__dirname, 'components/*.ts'),
    ],
  };

  const specs = swaggerJsdoc(options);
  app.use('/', swaggerUi.serve, swaggerUi.setup(specs));
};
