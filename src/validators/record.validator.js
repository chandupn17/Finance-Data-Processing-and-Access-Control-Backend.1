const { z } = require('zod');

const RecordType = z.enum(['INCOME', 'EXPENSE']);

const createRecordSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  type: RecordType,
  category: z.string().min(1, 'Category is required').max(80),
  date: z.coerce.date(),
  notes: z.string().max(500).optional().nullable(),
  /** Optional: ADMIN may assign record to another user */
  userId: z.string().uuid().optional(),
});

const updateRecordSchema = z
  .object({
    amount: z.coerce.number().positive('Amount must be positive').optional(),
    type: RecordType.optional(),
    category: z.string().min(1).max(80).optional(),
    date: z.coerce.date().optional(),
    notes: z.string().max(500).optional().nullable(),
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: 'At least one field must be provided' });

const listRecordsQuerySchema = z.object({
  type: RecordType.optional(),
  category: z.string().max(80).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const trendsQuerySchema = z.object({
  period: z.enum(['monthly', 'weekly']).default('monthly'),
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

function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: formatZodIssues(result.error.issues),
      });
    }
    req.validatedQuery = result.data;
    next();
  };
}

module.exports = {
  createRecordSchema,
  updateRecordSchema,
  listRecordsQuerySchema,
  trendsQuerySchema,
  validateBody,
  validateQuery,
};
