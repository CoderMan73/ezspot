import express, { Request, Response } from 'express';
import { generateSpreadsheetExport } from '../services/spreadsheetService';

const router = express.Router();

/**
 * Parses the report ID from the query string.
 * @param reportIdValue The report ID query value.
 * @returns A numeric report ID or null if invalid.
 */
function parseReportId(reportIdValue: unknown): number | null {
  if (typeof reportIdValue !== 'string') {
    return null;
  }

  const parsedReportId = Number(reportIdValue);
  return Number.isInteger(parsedReportId) && parsedReportId > 0 ? parsedReportId : null;
}

  /**
   * Handles spreadsheet export requests by validating the report ID, generating the workbook, and
   * returning the Excel file response.
   * @param req Express request object.
   * @param res Express response object.
   * @param exportType The spreadsheet export type to generate.
   * @param filenamePrefix The filename prefix used in the attachment response.
   * @returns A streamed Excel file response.
   */
async function handleSpreadsheetExport(
  req: Request,
  res: Response,
  exportType: 'prospective' | 'top30',
  filenamePrefix: string,
) {
  try {
    const reportId = parseReportId(req.query.reportId);

    if (reportId === null) {
      return res.status(400).json({ message: 'Invalid or missing reportId.' });
    }

    const exportResult = await generateSpreadsheetExport({
      exportType,
      reportId,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filenamePrefix}-${reportId}.xlsx"`);

    return res.status(200).send(exportResult.buffer);
  } catch (error) {
    console.error(`Failed to generate ${exportType} spreadsheet:`, error);
    return res.status(500).json({ message: `Failed to generate ${exportType} spreadsheet.` });
  }
}

/**
 * Downloads the prospective export as an Excel spreadsheet.
 * @param req Express request object.
 * @param res Express response object.
 * @returns A streamed Excel file response.
 */
router.get('/export/prospective', async (req: Request, res: Response) => {
  return handleSpreadsheetExport(req, res, 'prospective', 'prospective-report');
});

/**
 * Downloads the top 30 export as an Excel spreadsheet.
 * @param req Express request object.
 * @param res Express response object.
 * @returns A streamed Excel file response.
 */
router.get('/export/top30', async (req: Request, res: Response) => {
  return handleSpreadsheetExport(req, res, 'top30', 'top30-report');
});

export default router;