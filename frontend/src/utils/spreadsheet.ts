/**
 * Excel export.
 *
 * Writes an Excel 2003 XML Spreadsheet (`.xls`), which every version of Excel,
 * LibreOffice and Google Sheets opens natively. The `mso-application` processing
 * instruction is what tells Excel this really is a workbook, so it opens without
 * the "the file format and extension don't match" warning that a CSV renamed to
 * .xls would trigger.
 *
 * Chosen over a library because it is a few dozen lines, has no dependency to
 * keep patched, and produces a file with real column widths, a bold header row
 * and typed cells.
 */

export type CellValue = string | number | boolean | null | undefined;

export interface SheetColumn<T> {
  header: string;
  /** Pulled out of the row. Return a string, a number or a boolean. */
  value: (row: T) => CellValue;
  /** Column width in characters. Defaults to something sensible for the header. */
  width?: number;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    // Control characters are not legal in XML 1.0 and Excel refuses the file.
    // Matching them is the point here, so the rule that warns about finding
    // them in a pattern has nothing to say.
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}

function cell(value: CellValue): string {
  if (value === null || value === undefined || value === "") {
    return "<Cell/>";
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`;
  }
  if (typeof value === "boolean") {
    return `<Cell><Data ss:Type="String">${value ? "Yes" : "No"}</Data></Cell>`;
  }
  return `<Cell><Data ss:Type="String">${escapeXml(String(value))}</Data></Cell>`;
}

/** Excel caps sheet names at 31 characters and forbids a handful of them. */
function sheetName(name: string): string {
  return escapeXml(name.replace(/[[\]:*?/\\]/g, " ").slice(0, 31) || "Sheet1");
}

export function buildWorkbook<T>(input: {
  sheet: string;
  columns: SheetColumn<T>[];
  rows: T[];
}): string {
  const columns = input.columns
    .map((column) => {
      const width = column.width ?? Math.min(48, Math.max(12, column.header.length + 4));
      // 7 pixels per character is Excel's own rough default.
      return `<Column ss:AutoFitWidth="0" ss:Width="${Math.round(width * 7)}"/>`;
    })
    .join("");

  const header = input.columns
    .map((column) => `<Cell ss:StyleID="head"><Data ss:Type="String">${escapeXml(column.header)}</Data></Cell>`)
    .join("");

  const body = input.rows
    .map((row) => `<Row>${input.columns.map((column) => cell(column.value(row))).join("")}</Row>`)
    .join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Bottom"/></Style>
  <Style ss:ID="head">
   <Font ss:Bold="1"/>
   <Interior ss:Color="#EEF2F7" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${sheetName(input.sheet)}">
  <Table>
${columns}
   <Row>${header}</Row>
${body}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <FreezePanes/>
   <FrozenNoSplit/>
   <SplitHorizontal>1</SplitHorizontal>
   <TopRowBottomPane>1</TopRowBottomPane>
   <ActivePane>2</ActivePane>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`;
}

/** Adds today's date to a file name, so repeat exports do not overwrite. */
export function stampedFileName(base: string, extension = "xls"): string {
  const today = new Date().toISOString().slice(0, 10);
  return `${base}-${today}.${extension}`;
}

/** Builds the workbook and hands it to the browser as a download. */
export function downloadWorkbook<T>(input: {
  fileName: string;
  sheet: string;
  columns: SheetColumn<T>[];
  rows: T[];
}): void {
  const xml = buildWorkbook(input);
  // The BOM keeps Excel on UTF-8 for names with accents.
  const blob = new Blob([`\uFEFF${xml}`], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = input.fileName;
  anchor.click();

  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
