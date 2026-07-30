import { Injectable } from "@nestjs/common";
import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import { sanitizeCellValue } from "../../../shared/security/content-sanitizer";
import {
  validateFileExtension,
  validateFileSize,
  validateMagicBytes,
} from "../../../shared/security/file-validator";

export interface ParsedFileResult {
  headers: string[];
  rows: Record<string, string>[];
}

@Injectable()
export class FileParserService {
  parseHeaders(buffer: Buffer, filename: string): string[] {
    const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
    if (ext === ".csv") {
      const content = buffer.toString("utf8");
      const records = parse(content, { columns: true, skip_empty_lines: true, relax_column_count: true });
      if (records.length === 0) {
        const headerLine = content.split(/\r?\n/)[0] ?? "";
        return headerLine.split(",").map((h) => h.trim());
      }
      return Object.keys(records[0] as Record<string, string>);
    }

    const workbook = XLSX.read(buffer, { type: "buffer", sheetRows: 1 });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
    const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
    return (data[0] ?? []).map(String);
  }

  parseWithMapping(
    buffer: Buffer,
    filename: string,
    columnMapping: Record<string, string>,
    limit?: number,
  ): ParsedFileResult {
    const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
    let rawRows: Record<string, unknown>[];

    if (ext === ".csv") {
      const content = buffer.toString("utf8");
      rawRows = parse(content, {
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true,
      }) as Record<string, unknown>[];
    } else {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) return { headers: [], rows: [] };
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) return { headers: [], rows: [] };
      rawRows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
    }

    const headers = Object.values(columnMapping);
    const rows = rawRows.slice(0, limit).map((raw, index) => {
      const mapped: Record<string, string> = { row_number: String(index + 2) };
      for (const [sourceCol, targetCol] of Object.entries(columnMapping)) {
        mapped[targetCol] = sanitizeCellValue(raw[sourceCol]);
      }
      return mapped;
    });

    return { headers, rows };
  }

  validateUpload(buffer: Buffer, filename: string, size: number) {
    const sizeResult = validateFileSize(size);
    if (!sizeResult.valid) return sizeResult;
    const extResult = validateFileExtension(filename);
    if (!extResult.valid) return extResult;
    return validateMagicBytes(buffer, extResult.valid ? undefined : undefined);
  }
}
