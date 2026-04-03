const { z } = require('zod');

const RoleEnum = z.enum(['VIEWER', 'ANALYST', 'ADMIN']);

const patchRoleSchema = z.object({
  role: RoleEnum,
});

const patchStatusSchema = z.object({
  isActive: z.boolean(),
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
  patchRoleSchema,
  patchStatusSchema,
  validateBody,
};
