import swaggerJSDoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "My SaaS Platform API",
      version: "1.0.0",
      description: "API documentation for My SaaS Platform",
    },
    servers: [
      {
        url: "http://localhost:3000/api",
      },
    ],
  },
  apis: ["./app/api/**/*.ts"], // Path to files with JSDoc comments
});
