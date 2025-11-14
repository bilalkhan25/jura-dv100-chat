import http from 'node:http';
import { URL } from 'node:url';
import dotenv from 'dotenv';
import questionHandler from './api/jura-question.mjs';
import extractHandler from './api/jura-extract-answer.mjs';

dotenv.config();

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  if (url.pathname === '/api/jura-question') {
    return questionHandler(req, res);
  }
  if (url.pathname === '/api/jura-extract-answer') {
    return extractHandler(req, res);
  }

  res.statusCode = 404;
  res.end('Not found');
});

const PORT = 8787;
server.listen(PORT, () => {
  console.log(`Jura API dev server running at http://localhost:${PORT}/api`);
});
