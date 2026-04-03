const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

function formatZodIssues(issues) {
  return issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
}

function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: formatZodIssues(result.error.issues),
      });
    }
    req.validatedBody = result.data;
    next();
  };
}

module.exports = {
  registerSchema,
  loginSchema,
  validateBody,
};
