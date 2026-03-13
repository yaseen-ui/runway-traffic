const statsService = require('../services/statsService');

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
};

const getStats = (req, res) => {
  sendJson(res, 200, statsService.getStats());
  return true;
};

module.exports = {
  getStats,
};
