// src/setupProxy.js
const { createProxyMiddleware } = require("http-proxy-middleware");
const { BACKEND_URL } = require("./constants");

module.exports = function (app) {
  app.use(
    ["/vehicles", "/auth", "/images", "/labels", "/dealerships", "/vehicle-samples"],
    createProxyMiddleware({
      target: BACKEND_URL,
      changeOrigin: true,
      secure: false,
    })
  );
};
