const { Router } = require('express');
const recordController = require('../controllers/record.controller');
const { authenticate } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/requireRole');
const {
  createRecordSchema,
  updateRecordSchema,
  listRecordsQuerySchema,
  validateBody,
  validateQuery,
} = require('../validators/record.validator');

const router = Router();

router.use(authenticate);

router.get('/', validateQuery(listRecordsQuerySchema), recordController.listRecords);
router.get('/:id', recordController.getRecord);
router.post('/', requireRole('ADMIN'), validateBody(createRecordSchema), recordController.createRecord);
router.patch('/:id', requireRole('ADMIN'), validateBody(updateRecordSchema), recordController.updateRecord);
router.delete('/:id', requireRole('ADMIN'), recordController.deleteRecord);

module.exports = router;
