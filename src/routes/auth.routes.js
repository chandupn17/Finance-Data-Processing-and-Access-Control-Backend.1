const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { registerSchema, loginSchema, validateBody } = require('../validators/auth.validator');

const router = Router();

router.post('/register', validateBody(registerSchema), authController.register);
router.post('/login', validateBody(loginSchema), authController.login);

module.exports = router;
