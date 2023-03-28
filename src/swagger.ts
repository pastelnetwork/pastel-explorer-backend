import express from 'express';
import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

export default (app: express.Application): void => {
  const isProduction = process.env.NODE_ENV === 'production';
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
      path.join(__dirname, `routes/*.${isProduction ? 'js' : 'ts'}`),
      path.join(__dirname, `controllers/*.${isProduction ? 'js' : 'ts'}`),
      path.join(__dirname, `components/*.${isProduction ? 'js' : 'ts'}`),
    ],
  };
  const specs = swaggerJsdoc(options);
  app.use('/', swaggerUi.serve, swaggerUi.setup(specs));
};
