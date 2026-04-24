import express, { Request, Response } from 'express';
import { generateDeansListDocumentExport } from '../services/wordService';

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
 * Handles Dean's List Word export requests by validating the report ID and returning the generated .docx file.
 * @param req Express request object.
 * @param res Express response object.
 * @returns A streamed Word document response.
 */
router.get('/export/deans-list', async (req: Request, res: Response) => {
  try {
    const reportId = parseReportId(req.query.reportId);

    if (reportId === null) {
      return res.status(400).json({ message: 'Invalid or missing reportId.' });
    }

    const exportResult = await generateDeansListDocumentExport({ reportId });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="deans-list-report-${reportId}.docx"`);

    return res.status(200).send(exportResult.buffer);
  } catch (error) {
    console.error("Failed to generate dean's list document:", error);
    return res.status(500).json({ message: "Failed to generate dean's list document." });
  }
});

export default router;
