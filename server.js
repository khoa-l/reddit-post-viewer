// Simple HTTP server for Reddit Viewer
// Serves the viewer app and JSON data files

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DEV_MODE = process.env.DEV_MODE === 'true' || false;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function getMimeType(filepath) {
  const ext = path.extname(filepath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  let filepath;

  // Handle API endpoints
  if (req.url.startsWith('/api/')) {
    handleApiRequest(req, res);
    return;
  }

  // Serve static files
  if (req.url === '/') {
    // Only show index (post list) at root in dev mode, otherwise show error
    if (DEV_MODE) {
      filepath = path.join(__dirname, 'index.html');
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Reddit Viewer</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
              background-color: #dae0e6;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }
            .message {
              background: #fff;
              border: 1px solid #ccc;
              border-radius: 4px;
              padding: 2rem;
              text-align: center;
              max-width: 500px;
            }
            h1 { margin: 0 0 1rem; font-size: 1.5rem; }
            p { color: #7c7c7c; margin: 0; }
          </style>
        </head>
        <body>
          <div class="message">
            <h1>Reddit Viewer</h1>
            <p>Navigate to a specific post URL to view content.</p>
            <p style="margin-top: 0.5rem; font-size: 0.875rem;">To view the post list, access /index.html or set DEV_MODE=true</p>
          </div>
        </body>
        </html>
      `);
      return;
    }
  } else if (req.url === '/index.html') {
    // Always allow direct access to index.html
    filepath = path.join(__dirname, 'index.html');
  } else {
    // Remove query string
    const urlPath = req.url.split('?')[0];
    filepath = path.join(__dirname, urlPath);
  }

  // Security: prevent directory traversal
  const normalizedPath = path.normalize(filepath);
  if (!normalizedPath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // Check if file exists
  fs.stat(filepath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    // Serve file
    const mimeType = getMimeType(filepath);
    res.writeHead(200, { 'Content-Type': mimeType });
    fs.createReadStream(filepath).pipe(res);
  });
});

function handleApiRequest(req, res) {
  const urlPath = req.url;

  // Get config/settings
  if (urlPath === '/api/config') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ devMode: DEV_MODE }));
    return;
  }

  // List all posts
  if (urlPath === '/api/posts') {
    const indexFile = path.join(DATA_DIR, 'index.json');

    if (!fs.existsSync(indexFile)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ posts: [], count: 0 }));
      return;
    }

    try {
      const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
      const posts = Object.values(index).sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ posts, count: posts.length }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to read index' }));
    }
    return;
  }

  // Get specific post by filename
  if (urlPath.startsWith('/api/post/')) {
    const filename = urlPath.replace('/api/post/', '');
    const filepath = path.join(DATA_DIR, filename);

    // Security check
    const normalizedPath = path.normalize(filepath);
    if (!normalizedPath.startsWith(DATA_DIR) || !filename.endsWith('.json')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid filename' }));
      return;
    }

    if (!fs.existsSync(filepath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Post not found' }));
      return;
    }

    try {
      const content = fs.readFileSync(filepath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(content);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to read post' }));
    }
    return;
  }

  // Serve media files (video/audio)
  if (urlPath.startsWith('/api/media/')) {
    const mediaPath = urlPath.replace('/api/media/', '');
    const filepath = path.join(DATA_DIR, mediaPath);

    // Security check - ensure path is within data directory
    const normalizedPath = path.normalize(filepath);
    if (!normalizedPath.startsWith(DATA_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    if (!fs.existsSync(filepath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Media not found');
      return;
    }

    try {
      const stat = fs.statSync(filepath);
      if (!stat.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not a file');
        return;
      }

      const mimeType = getMimeType(filepath);
      res.writeHead(200, {
        'Content-Type': mimeType,
        'Content-Length': stat.size,
      });
      fs.createReadStream(filepath).pipe(res);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Failed to serve media');
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'API endpoint not found' }));
}

server.listen(PORT, () => {
  console.log(`Reddit Viewer running at http://localhost:${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
  console.log(`Dev mode: ${DEV_MODE ? 'enabled' : 'disabled'}`);
  console.log('\nPress Ctrl+C to stop');
});
