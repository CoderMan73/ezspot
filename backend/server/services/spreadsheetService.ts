// Spreadsheet export service bridge.
// This module launches the Python workbook generator, waits for its JSON result,
// reads the generated .xlsx file into memory, and removes the temporary file.
// Keep route validation in the router layer and workbook formatting in Python.

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

type ExportType = 'prospective' | 'top30';

/**
 * Arguments required to generate a spreadsheet export.
 */
type SpreadsheetExportArgs = {
    exportType: ExportType;
    reportId: number;
};

/**
 * In-memory spreadsheet result returned to the HTTP layer.
 */
type SpreadsheetExportResult = {
    buffer: Buffer;
    filename: string;
    rows: number;
};

/**
 * JSON payload emitted by the Python generator after it writes the workbook.
 */
type PythonExportResponse = {
    success: boolean;
    output_path: string;
    filename: string;
    rows: number;
    sheet_name: string;
};

/**
 * Resolves the Python spreadsheet generator script path relative to the backend runtime.
 * @returns Absolute path to export_spreadsheet.py.
 */
function getExportScriptPath(): string {
    return path.join(process.cwd(), 'python', 'generator', 'export_spreadsheet.py');
}

/**
 * Runs the Python generator process for the requested export type and report ID.
 * @param args Export type and report ID to send to Python.
 * @returns Parsed JSON metadata from the Python export script.
 */
function runPythonExport(args: SpreadsheetExportArgs): Promise<PythonExportResponse> {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [getExportScriptPath(), args.exportType, String(args.reportId)]);

        let stdoutData = '';
        let stderrData = '';

        pythonProcess.stdout.on('data', (chunk) => {
            stdoutData += chunk.toString();
        });

        pythonProcess.stderr.on('data', (chunk) => {
            stderrData += chunk.toString();
        });

        pythonProcess.on('error', (error) => {
            reject(error);
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(stderrData.trim() || `Spreadsheet export failed with exit code ${code}`));
                return;
            }

            try {
                const parsed = JSON.parse(stdoutData.trim()) as PythonExportResponse;
                if (!parsed.success) {
                    reject(new Error('Spreadsheet export script reported an unsuccessful run.'));
                    return;
                }

                resolve(parsed);
            } catch (error) {
                reject(new Error(`Failed to parse spreadsheet export response: ${String(error)}`));
            }
        });
    });
}

/**
 * Generates an Excel spreadsheet export and returns the workbook bytes for the route handler.
 * @param args Export type and report ID used to generate the workbook.
 * @returns The workbook buffer, filename, and row count.
 */
export async function generateSpreadsheetExport(args: SpreadsheetExportArgs): Promise<SpreadsheetExportResult> {
    const result = await runPythonExport(args);
    const buffer = await fs.readFile(result.output_path);

    await fs.unlink(result.output_path);

    return {
        buffer,
        filename: result.filename,
        rows: result.rows,
    };
}