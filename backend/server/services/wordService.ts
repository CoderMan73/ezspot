// Word export service bridge.
// This module launches the Python Word generator, waits for its JSON result,
// reads the generated .docx file into memory, and removes the temporary file.

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

/**
 * Arguments required to generate a Dean's List Word export.
 */
type WordExportArgs = {
  reportId: number;
};

/**
 * In-memory Word document result returned to the HTTP layer.
 */
type WordExportResult = {
  buffer: Buffer;
  filename: string;
};

/**
 * JSON payload emitted by the Python Word generator after it writes the .docx file.
 */
type PythonWordExportResponse = {
  success: boolean;
  output_path: string;
  filename: string;
};

/**
 * Resolves the Python Word generator script path relative to the backend runtime.
 * @returns Absolute path to doc_generator.py.
 */
function getWordExportScriptPath(): string {
  return path.join(process.cwd(), 'python', 'generator', 'doc_generator.py');
}

/**
 * Runs the Python Word generator process for the requested report ID.
 * @param args Report ID to send to Python.
 * @returns Parsed JSON metadata from the Python export script.
 */
function runPythonWordExport(args: WordExportArgs): Promise<PythonWordExportResponse> {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [getWordExportScriptPath(), String(args.reportId)]);

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
        reject(new Error(stderrData.trim() || `Word export failed with exit code ${code}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdoutData.trim()) as PythonWordExportResponse;
        if (!parsed.success) {
          reject(new Error('Word export script reported an unsuccessful run.'));
          return;
        }

        resolve(parsed);
      } catch (error) {
        reject(new Error(`Failed to parse Word export response: ${String(error)}`));
      }
    });
  });
}

/**
 * Generates a Dean's List Word document export and returns the file bytes for the route handler.
 * @param args Report ID used to generate the .docx file.
 * @returns The Word file buffer and filename.
 */
export async function generateDeansListDocumentExport(args: WordExportArgs): Promise<WordExportResult> {
  const result = await runPythonWordExport(args);
  const buffer = await fs.readFile(result.output_path);

  await fs.unlink(result.output_path);

  return {
    buffer,
    filename: result.filename,
  };
}
