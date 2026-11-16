// Minimal static server for the end-to-end fixture pages.
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const root = path.join(__dirname, 'pages');
const port = Number(process.env.PORT) || 4173;

http
  .createServer((request, response) => {
    const { pathname } = new URL(request.url, 'http://localhost');
    const file = path.join(root, path.basename(pathname));
    fs.readFile(file, (error, body) => {
      if (error) {
        response.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
      } else {
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(body);
      }
    });
  })
  .listen(port, '127.0.0.1', () => console.log(`Fixture pages on http://127.0.0.1:${port}`));
