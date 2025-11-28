const http = require('http');
const fs = require('fs');
const path = require('path');

const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || 8000;
const projectRoot = process.cwd();
const publicRoot = path.join(projectRoot, 'public');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.fbx': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.map': 'application/json; charset=utf-8'
};

function sendNotFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Not Found');
}

function sendError(res, message) {
  res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(message);
}

async function serveFile(filePath, res) {
  try {
    const data = await fs.promises.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      sendNotFound(res);
      return;
    }
    console.error(err);
    sendError(res, '500 Internal Server Error');
  }
}

function resolvePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const normalized = path.posix.normalize(decoded);

  const sanitized = normalized.startsWith('/') ? normalized.slice(1) : normalized;
  let relativePath = sanitized;

  if (relativePath.startsWith('node_modules/')) {
    const nodePath = path.join(projectRoot, relativePath);
    return nodePath.startsWith(path.join(projectRoot, 'node_modules')) ? nodePath : null;
  }

  if (relativePath === 'public') {
    relativePath = '';
  } else if (relativePath.startsWith('public/')) {
    relativePath = relativePath.slice('public/'.length);
  }

  const publicPath = path.join(publicRoot, relativePath);
  return publicPath.startsWith(publicRoot) ? publicPath : null;
}

const server = http.createServer(async (req, res) => {
  const fullPath = resolvePath(req.url || '/');

  if (!fullPath) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  let targetPath = fullPath;

  try {
    const stats = await fs.promises.stat(fullPath);
    if (stats.isDirectory()) {
      targetPath = path.join(fullPath, 'index.html');
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(err);
      sendError(res, '500 Internal Server Error');
      return;
    }
  }

  await serveFile(targetPath, res);
});

server.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}/`);
});
