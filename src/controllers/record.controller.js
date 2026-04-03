const recordService = require('../services/record.service');
const { asyncHandler } = require('../utils/asyncHandler');

const listRecords = asyncHandler(async (req, res) => {
  const { items, pagination } = await recordService.listRecords(req.user, req.validatedQuery);
  res.json({
    success: true,
    data: items,
    pagination,
    message: 'Records retrieved',
  });
});

const getRecord = asyncHandler(async (req, res) => {
  const record = await recordService.getRecordById(req.user, req.params.id);
  res.json({
    success: true,
    data: record,
    message: 'Record retrieved',
  });
});

const createRecord = asyncHandler(async (req, res) => {
  const record = await recordService.createRecord(req.user, req.validatedBody);
  res.status(201).json({
    success: true,
    data: record,
    message: 'Record created',
  });
});

const updateRecord = asyncHandler(async (req, res) => {
  const record = await recordService.updateRecord(req.user, req.params.id, req.validatedBody);
  res.json({
    success: true,
    data: record,
    message: 'Record updated',
  });
});

const deleteRecord = asyncHandler(async (req, res) => {
  await recordService.softDeleteRecord(req.user, req.params.id);
  res.json({
    success: true,
    data: { id: req.params.id },
    message: 'Record archived (soft deleted)',
  });
});

module.exports = {
  listRecords,
  getRecord,
  createRecord,
  updateRecord,
  deleteRecord,
};
