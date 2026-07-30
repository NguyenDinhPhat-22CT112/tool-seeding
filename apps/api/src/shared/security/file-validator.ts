const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const XLSX_SIGNATURE = [0x50, 0x4b, 0x03, 0x04] as const;

const MIME_SIGNATURES: Record<string, readonly number[]> = {
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": XLSX_SIGNATURE,
  "text/csv": [],
  "application/csv": [],
};

const ALLOWED_EXTENSIONS = new Set([".xlsx", ".csv"]);

export interface FileValidationResult {
  valid: boolean;
  mimeType?: string;
  error?: string;
}

export function sanitizeFilename(filename: string): string {
  const base = filename.replace(/[/\\]/g, "").replace(/\.\./g, "");
  return base.slice(0, 255);
}

export function validateFileSize(size: number): FileValidationResult {
  if (size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: "IMPORT_FILE_TOO_LARGE" };
  }
  return { valid: true };
}

export function validateFileExtension(filename: string): FileValidationResult {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
  if (ext === ".xlsm") {
    return { valid: false, error: "IMPORT_UNSUPPORTED_TYPE" };
  }
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, error: "IMPORT_UNSUPPORTED_TYPE" };
  }
  return { valid: true };
}

export function validateMagicBytes(buffer: Buffer, declaredMime?: string): FileValidationResult {
  if (declaredMime?.includes("csv") || buffer.length === 0) {
    return { valid: true, mimeType: declaredMime ?? "text/csv" };
  }

  const xlsxSig =
    MIME_SIGNATURES["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
  if (!xlsxSig) {
    return { valid: false, error: "IMPORT_UNSUPPORTED_TYPE" };
  }
  const matchesXlsx = xlsxSig.every((byte, i) => buffer[i] === byte);
  if (matchesXlsx) {
    return {
      valid: true,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  }

  return { valid: false, error: "IMPORT_UNSUPPORTED_TYPE" };
}

export { MAX_FILE_SIZE_BYTES };
