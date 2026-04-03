const dashboardService = require('../services/dashboard.service');
const { asyncHandler } = require('../utils/asyncHandler');

const summary = asyncHandler(async (req, res) => {
  const data = await dashboardService.summary(req.user);
  res.json({
    success: true,
    data,
    message: 'Dashboard summary retrieved',
  });
});

const byCategory = asyncHandler(async (req, res) => {
  const data = await dashboardService.byCategory(req.user);
  res.json({
    success: true,
    data,
    message: 'Category breakdown retrieved',
  });
});

const trends = asyncHandler(async (req, res) => {
  const data = await dashboardService.trends(req.user, req.validatedQuery.period);
  res.json({
    success: true,
    data,
    message: 'Trends retrieved',
  });
});

const recent = asyncHandler(async (req, res) => {
  const data = await dashboardService.recent(req.user, 10);
  res.json({
    success: true,
    data,
    message: 'Recent activity retrieved',
  });
});

module.exports = {
  summary,
  byCategory,
  trends,
  recent,
};
