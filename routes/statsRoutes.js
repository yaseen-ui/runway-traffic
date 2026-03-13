const statsController = require('../controllers/statsController');

const handleStatsRoutes = (req, res) => {
  const { method, url } = req;

  if (method === 'GET' && url === '/stats') {
    return statsController.getStats(req, res);
  }

  return false;
};

module.exports = {
  handleStatsRoutes,
};
