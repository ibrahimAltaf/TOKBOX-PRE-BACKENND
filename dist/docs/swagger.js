"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountSwagger = mountSwagger;
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const openapi_1 = require("./openapi");
function mountSwagger(app) {
    app.use("/docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(openapi_1.openapi, {
        swaggerOptions: {
            persistAuthorization: true,
        },
    }));
    // Raw JSON spec endpoint (useful for tooling)
    app.get("/docs.json", (_req, res) => {
        res.json(openapi_1.openapi);
    });
}
