const express = require('express');

const app = express();

let backendApp;
function getBackend() {
  if (!backendApp) {
    const backend = require('./server-build.cjs');
    backendApp = backend.default || backend;
  }
  return backendApp;
}

app.use((req, res, next) => {
  getBackend()(req, res, next);
});

module.exports = app;
