const FORMULA_START = /^[=+\-@]/;

function toCell(value) {
  let text = value == null ? '' : String(value);
  // A leading quote stops spreadsheets from running the cell as a formula.
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(columns, rows) {
  const header = columns.map((column) => toCell(column.label)).join(',');
  const lines = rows.map((row) => columns.map((column) => toCell(column.value(row))).join(','));
  return [header, ...lines].join('\r\n');
}

export function downloadCsv(fileName, columns, rows) {
  // The BOM makes Excel read the file as UTF-8.
  const blob = new Blob(['﻿', toCsv(columns, rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
