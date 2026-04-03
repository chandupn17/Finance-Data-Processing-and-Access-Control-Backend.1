const { Router } = require('express');
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/requireRole');
const {
  patchRoleSchema,
  patchStatusSchema,
  validateBody,
} = require('../validators/user.validator');

const router = Router();

router.use(authenticate, requireRole('ADMIN'));

router.get('/', userController.listUsers);
router.get('/:id', userController.getUser);
router.patch('/:id/role', validateBody(patchRoleSchema), userController.patchRole);
router.patch('/:id/status', validateBody(patchStatusSchema), userController.patchStatus);

module.exports = router;
