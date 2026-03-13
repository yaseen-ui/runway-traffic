const runwayController = require('../controllers/runwayController');

const matchRunwayActionRoute = (method, url) => {
  const match = url.match(/^\/runways\/([^\/]+)\/(enable|disable)$/);
  if (!match) {
    return null;
  }

  return {
    method,
    id: match[1],
    action: match[2],
  };
};

const handleRunwayRoutes = (req, res) => {
  const { method, url } = req;

  if (method === 'GET' && url === '/runways') {
    return runwayController.getRunways(req, res);
  }

  const runwayMatch = matchRunwayActionRoute(method, url);
  if (!runwayMatch) {
    return false;
  }

  if (runwayMatch.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return true;
  }

  if (runwayMatch.action === 'disable') {
    return runwayController.disableRunway(req, res, runwayMatch.id);
  }

  return runwayController.enableRunway(req, res, runwayMatch.id);
};

module.exports = {
  handleRunwayRoutes,
};
