// Spreadsheet export service bridge.
// This module launches Python-based generators, manages their lifecycle,
// and handles temporary file cleanup.

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

type ExportType = 'prospective' | 'top30';

export type SpreadsheetExportArgs = {
  exportType: ExportType;
  reportId: number;
};

export type DeansListExportArgs = {
  reportId: number;
  formData: {
    dean_first_name: string;
    dean_last_name: string;
    contact_first_name: string;
    contact_last_name: string;
    contact_email: string;
    mean_1000: string;
    mean_2000: string;
    mean_3000: string;
    mean_4000: string;
    mean_5000: string;
    mean_6000: string;
    date: string;
  };
};

type SpreadsheetExportResult = {
  buffer: Buffer;
  filename: string;
  rows: number;
};

type DeansListExportResult = {
  buffer: Buffer;
  filename: string;
};

/**
 * Base structure for JSON payloads emitted by Python generators.
 */
interface PythonBaseResponse {
  success: boolean;
  output_path: string;
  filename: string;
}

/**
 * Orchestrates a Python script execution, including process management,
 * JSON response parsing, and automatic file cleanup.
 */
async function executePythonGenerator<T extends PythonBaseResponse>(
  scriptName: string,
  args: string[],
  stdinData?: any,
): Promise<{ result: T; buffer: Buffer }> {
  const scriptPath = path.join(process.cwd(), 'python', 'generator', scriptName);

  const pythonResult = await new Promise<T>((resolve, reject) => {
    const pythonProcess = spawn('python', [scriptPath, ...args]);
    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (chunk) => (stdout += chunk.toString()));
    pythonProcess.stderr.on('data', (chunk) => (stderr += chunk.toString()));
    pythonProcess.on('error', reject);

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(stderr.trim() || `Python script ${scriptName} failed (exit ${code})`));
      }

      try {
        const parsed = JSON.parse(stdout.trim()) as T;
        if (!parsed.success) {
          return reject(new Error(`Python script ${scriptName} reported failure.`));
        }
        resolve(parsed);
      } catch (err) {
        reject(new Error(`Failed to parse Python output: ${String(err)}`));
      }
    });

    if (stdinData) {
      pythonProcess.stdin.write(JSON.stringify(stdinData));
      pythonProcess.stdin.end();
    }
  });

  try {
    const buffer = await fs.readFile(pythonResult.output_path);
    await fs.unlink(pythonResult.output_path);
    return { result: pythonResult, buffer };
  } catch (err) {
    throw new Error(`Failed to process generated file: ${String(err)}`);
  }
}

/**
 * Generates an Excel spreadsheet export.
 */
export async function generateSpreadsheetExport(
  args: SpreadsheetExportArgs,
): Promise<SpreadsheetExportResult> {
  const { result, buffer } = await executePythonGenerator<PythonBaseResponse & { rows: number }>(
    'export_spreadsheet.py',
    [args.exportType, String(args.reportId)],
  );

  return {
    buffer,
    filename: result.filename,
    rows: result.rows,
  };
}

/**
 * Generates a Dean's List Word document export.
 */
export async function generateDeansListExport(
  args: DeansListExportArgs,
): Promise<DeansListExportResult> {
  const { result, buffer } = await executePythonGenerator<PythonBaseResponse>(
    'doc_generator.py',
    [String(args.reportId)],
    args.formData,
  );

  return {
    buffer,
    filename: result.filename,
  };
}