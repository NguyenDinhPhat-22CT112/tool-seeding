/** Prefix cell bắt đầu bằng =, +, -, @ để vô hiệu formula injection (A14). */
export function sanitizeCell(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) {
    return `'${value}`;
  }
  return value;
}

/** Strip basic HTML tags from user content. */
export function stripBasicHtml(value: string): string {
  return value.replace(/<[^>]*>/g, "");
}

export function sanitizeCellValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value).trim();
  return sanitizeCell(stripBasicHtml(str));
}
