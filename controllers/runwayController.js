const runwayService = require('../services/runwayService');

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
};

const getRunways = (req, res) => {
  sendJson(res, 200, runwayService.getRunways());
  return true;
};

const disableRunway = (req, res, id) => {
  const result = runwayService.disableRunway(id);
  if (result.error === 'not_found') {
    sendJson(res, 404, { error: 'Runway not found' });
    return true;
  }

  console.log(`Runway ${result.runway.id} disabled for maintenance`);
  sendJson(res, 200, result.runway);
  return true;
};

const enableRunway = (req, res, id) => {
  const result = runwayService.enableRunway(id);
  if (result.error === 'not_found') {
    sendJson(res, 404, { error: 'Runway not found' });
    return true;
  }

  console.log(`Runway ${result.runway.id} enabled again`);
  sendJson(res, 200, result.runway);
  return true;
};

module.exports = {
  getRunways,
  disableRunway,
  enableRunway,
};
