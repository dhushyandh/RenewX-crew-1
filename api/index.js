const express = require('express');
void express;
const backend = require('../server-build.cjs');
module.exports = backend.default || backend;
