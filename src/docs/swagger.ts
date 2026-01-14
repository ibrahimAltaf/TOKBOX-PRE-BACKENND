import swaggerUi from "swagger-ui-express";
import type { Express } from "express";
import { openapi } from "./openapi";

export function mountSwagger(app: Express) {
  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(openapi, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    })
  );

  // Raw JSON spec endpoint (useful for tooling)
  app.get("/docs.json", (_req, res) => {
    res.json(openapi);
  });
}
