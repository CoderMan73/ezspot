import express, { Request, Response } from 'express';
import {
  generateSpreadsheetExport,
  generateDeansListExport,
  DeansListExportArgs,
} from '../services/spreadsheetService';

const router = express.Router();

const MIME_EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MIME_WORD = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * Validates and extracts the report ID from the request query.
 */
function getValidatedReportId(req: Request): number | null {
  const { reportId } = req.query;
  if (typeof reportId !== 'string') return null;

  const parsed = Number(reportId);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Generic orchestration for report exports.
 * Handles validation, binary response headers, and error reporting.
 */
async function handleExport(
  req: Request,
  res: Response,
  config: {
    mimeType: string;
    errorLabel: string;
    action: (reportId: number) => Promise<{ buffer: Buffer; filename: string }>;
  },
) {
  try {
    const reportId = getValidatedReportId(req);
    if (reportId === null) {
      return res.status(400).json({ message: 'Invalid or missing reportId.' });
    }

    const { buffer, filename } = await config.action(reportId);

    res.setHeader('Content-Type', config.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(buffer);
  } catch (error) {
    console.error(`Export failed [${config.errorLabel}]:`, error);
    return res.status(500).json({ message: `Failed to generate ${config.errorLabel}.` });
  }
}

/**
 * Sanitizes and defaults Dean's List form data.
 */
function sanitizeDeansListData(data: any): DeansListExportArgs['formData'] {
  const keys: (keyof DeansListExportArgs['formData'])[] = [
    'dean_first_name',
    'dean_last_name',
    'contact_first_name',
    'contact_last_name',
    'contact_email',
    'mean_1000',
    'mean_2000',
    'mean_3000',
    'mean_4000',
    'mean_5000',
    'mean_6000',
    'date',
  ];

  const result = {} as DeansListExportArgs['formData'];
  for (const key of keys) {
    result[key] = String(data[key] ?? '').trim();
  }
  return result;
}

router.get('/export/prospective', (req, res) =>
  handleExport(req, res, {
    mimeType: MIME_EXCEL,
    errorLabel: 'prospective spreadsheet',
    action: async (id) => {
      const { buffer } = await generateSpreadsheetExport({ exportType: 'prospective', reportId: id });
      return { buffer, filename: `prospective-report-${id}.xlsx` };
    },
  }),
);

router.get('/export/top30', (req, res) =>
  handleExport(req, res, {
    mimeType: MIME_EXCEL,
    errorLabel: 'top 30 spreadsheet',
    action: async (id) => {
      const { buffer } = await generateSpreadsheetExport({ exportType: 'top30', reportId: id });
      return { buffer, filename: `top30-report-${id}.xlsx` };
    },
  }),
);

router.post('/export/deans-list', (req: Request, res: Response) => {
  const { formData } = req.body;
  if (!formData || typeof formData !== 'object') {
    return res.status(400).json({ message: 'Invalid or missing form data.' });
  }

  const sanitizedData = sanitizeDeansListData(formData);

  return handleExport(req, res, {
    mimeType: MIME_WORD,
    errorLabel: "Dean's List document",
    action: (id) => generateDeansListExport({ reportId: id, formData: sanitizedData }),
  });
});

export default router;