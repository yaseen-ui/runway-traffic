const http = require('http');
const fs = require('fs');
const path = require('path');
const { handleFlightRoutes } = require('./routes/flightRoutes');
const { handleRunwayRoutes } = require('./routes/runwayRoutes');
const { handleStatsRoutes } = require('./routes/statsRoutes');
const { startScheduler } = require('./services/schedulerService');

const serveStatic = (req, res) => {
  if (req.method !== 'GET' || (req.url !== '/' && req.url !== '/index.html')) {
    return false;
  }

  const filePath = path.join(__dirname, 'public', 'index.html');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to load UI' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });

  return true;
};

const server = http.createServer((req, res) => {
  const handled = serveStatic(req, res)
    || handleFlightRoutes(req, res)
    || handleRunwayRoutes(req, res)
    || handleStatsRoutes(req, res);

  if (handled === false) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Flight scheduling system running on port ${PORT}`);
});

startScheduler();
