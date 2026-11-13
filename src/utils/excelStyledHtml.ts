/**
 * 엑셀(.xlsx) 미리보기를 서식 그대로(0.2.38, 업무함 2026-11-13 사용자 지시 "엑셀 미리보기").
 *
 * 전에는 SheetJS(xlsx 0.18 무료판)로 값만 읽어 그려 글자색 · 배경색 · 굵게 · 병합 · 칸 너비가 빠졌다.
 * exceljs 로 읽어 칸 서식(글꼴 · 크기 · 색 · 굵게 · 기울임 · 밑줄 · 취소선 · 채우기 · 정렬 · 줄바꿈 · 테두리), 병합, 칸 너비 · 줄 높이를 살린 표로 그린다.
 * 엑셀처럼 열 머리(A, B, …) · 줄 번호를 둔다. exceljs 는 선택 의존(optional peer)이라 고를 때만 불러오고, 없으면 부르는 쪽이 예전 방식으로 그린다.
 */

/** Office 기본 테마 색(테마 번호 → RGB) — 칸 색이 테마로 적혀 있을 때(lt1 · dk1 · lt2 · dk2 · 강조 1~6 · 링크). */
const THEME_COLORS = ["FFFFFF", "000000", "E7E6E6", "44546A", "4472C4", "ED7D31", "A5A5A5", "FFC000", "5B9BD5", "70AD47", "0563C1", "954F72"];

/** 기본 너비(문자 수 8.43 ≈ 64px)와 높이(15pt = 20px). */
const DEFAULT_COL_PX = 64;
const DEFAULT_ROW_PX = 20;
const MAX_ROWS = 2000;
const MAX_COLS = 200;

interface ExcelColor {
    argb?: string;
    theme?: number;
    tint?: number;
    indexed?: number;
}

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** 테마 색의 tint(−1 어둡게 ~ +1 밝게)를 RGB 에 입힌다. */
function applyTint(hex: string, tint = 0): string {
    if (!tint) return hex;
    const channels = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const tinted = channels.map((c) => Math.round(tint < 0 ? c * (1 + tint) : c + (255 - c) * tint));
    return tinted.map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0")).join("");
}

/** exceljs 색 → CSS #rrggbb(못 읽으면 ""). argb 는 앞 두 자리가 투명도다. */
function cssColor(color: ExcelColor | undefined): string {
    if (!color) return "";
    if (color.argb && /^[0-9a-f]{8}$/i.test(color.argb)) return `#${color.argb.slice(2)}`;
    if (color.argb && /^[0-9a-f]{6}$/i.test(color.argb)) return `#${color.argb}`;
    if (typeof color.theme === "number" && THEME_COLORS[color.theme]) return `#${applyTint(THEME_COLORS[color.theme], color.tint)}`;
    return "";
}

const BORDER_WIDTH: Record<string, string> = { thin: "1px solid", hair: "1px solid", dotted: "1px dotted", dashed: "1px dashed", medium: "2px solid", mediumDashed: "2px dashed", thick: "3px solid", double: "3px double" };

/** 칸 하나의 CSS. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cellCss(cell: any): string {
    const css: string[] = [];
    const font = cell?.font ?? {};
    if (font.bold) css.push("font-weight:700");
    if (font.italic) css.push("font-style:italic");
    const deco = [font.underline ? "underline" : "", font.strike ? "line-through" : ""].filter(Boolean).join(" ");
    if (deco) css.push(`text-decoration:${deco}`);
    if (font.size) css.push(`font-size:${Math.round(Number(font.size) * 4 / 3)}px`);
    const color = cssColor(font.color);
    if (color && color.toLowerCase() !== "#000000") css.push(`color:${color}`);
    const fill = cell?.fill;
    if (fill?.type === "pattern" && fill.pattern && fill.pattern !== "none") {
        const bg = cssColor(fill.fgColor) || cssColor(fill.bgColor);
        if (bg) css.push(`background-color:${bg}`);
    }
    const align = cell?.alignment ?? {};
    if (align.horizontal && ["left", "center", "right", "justify"].includes(align.horizontal)) css.push(`text-align:${align.horizontal}`);
    else {
        // 엑셀처럼 숫자 · 날짜는 오른쪽 — 수식 칸은 계산 결과(value.result)로 본다.
        const raw = cell?.value && typeof cell.value === "object" && !(cell.value instanceof Date) && "result" in cell.value ? cell.value.result : cell?.value;
        if (typeof raw === "number" || raw instanceof Date) css.push("text-align:right");
    }
    if (align.vertical === "top") css.push("vertical-align:top");
    else if (align.vertical === "middle") css.push("vertical-align:middle");
    css.push(align.wrapText ? "white-space:pre-wrap" : "white-space:pre");
    const border = cell?.border ?? {};
    for (const side of ["top", "right", "bottom", "left"] as const) {
        const b = border[side];
        if (!b?.style) continue;
        css.push(`border-${side}:${BORDER_WIDTH[b.style] ?? "1px solid"} ${cssColor(b.color) || "#000"}`);
    }
    return css.join(";");
}

/** 열 번호(1부터) → A, B, … Z, AA … */
function columnName(index: number): string {
    let name = "";
    let n = index;
    while (n > 0) {
        const rem = (n - 1) % 26;
        name = String.fromCharCode(65 + rem) + name;
        n = Math.floor((n - 1) / 26);
    }
    return name;
}

/** "B3:D5" → 범위 */
function decodeRange(ref: string): { top: number; left: number; bottom: number; right: number } | null {
    const m = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(ref);
    if (!m) return null;
    const col = (s: string) => s.split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
    return { left: col(m[1]), top: Number(m[2]), right: col(m[3]), bottom: Number(m[4]) };
}

export interface StyledWorkbook {
    names: string[];
    /** 시트 이름 → 표 HTML(열 머리 · 줄 번호 포함) */
    html: Record<string, string>;
}

/** xlsx 를 시트마다 서식 그대로 표 HTML 로. exceljs 를 못 불러오거나 못 읽으면 예외 — 부르는 쪽이 예전 방식으로 그린다. */
export async function readStyledWorkbook(buffer: ArrayBuffer): Promise<StyledWorkbook> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import("exceljs");
    const ExcelJS = mod.default ?? mod;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const result: StyledWorkbook = { names: [], html: {} };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    workbook.eachSheet((sheet: any) => {
        if (sheet.state === "hidden" || sheet.state === "veryHidden") return;
        const name = String(sheet.name);
        result.names.push(name);
        const rowCount = Math.min(sheet.actualRowCount ? sheet.rowCount : 0, MAX_ROWS);
        const colCount = Math.min(sheet.columnCount || 0, MAX_COLS);
        if (rowCount === 0 || colCount === 0) {
            result.html[name] = "";
            return;
        }
        // 병합 — 왼쪽 위 칸에 colspan · rowspan, 나머지 칸은 그리지 않는다.
        const covered = new Set<string>();
        const spans = new Map<string, { rows: number; cols: number }>();
        const merges: string[] = sheet.model?.merges ?? [];
        for (const ref of merges) {
            const range = decodeRange(ref);
            if (!range) continue;
            spans.set(`${range.top}:${range.left}`, { rows: range.bottom - range.top + 1, cols: range.right - range.left + 1 });
            for (let r = range.top; r <= range.bottom; r++) for (let c = range.left; c <= range.right; c++) if (r !== range.top || c !== range.left) covered.add(`${r}:${c}`);
        }
        const colPx = (c: number) => {
            const width = sheet.getColumn(c)?.width;
            if (sheet.getColumn(c)?.hidden) return 0;
            return width ? Math.round(width * 7 + 5) : DEFAULT_COL_PX;
        };
        const widths = Array.from({ length: colCount }, (_, i) => colPx(i + 1));
        const head = `<thead><tr><th class="fv-xl-corner"></th>${widths.map((w, i) => (w ? `<th class="fv-xl-col">${columnName(i + 1)}</th>` : "")).join("")}</tr></thead>`;
        const rows: string[] = [];
        for (let r = 1; r <= rowCount; r++) {
            const row = sheet.getRow(r);
            if (row.hidden) continue;
            const height = row.height ? Math.round(row.height * 4 / 3) : DEFAULT_ROW_PX;
            const tds: string[] = [];
            for (let c = 1; c <= colCount; c++) {
                if (covered.has(`${r}:${c}`) || !widths[c - 1]) continue;
                const cell = row.getCell(c);
                const span = spans.get(`${r}:${c}`);
                const css = cellCss(cell);
                let text = "";
                try {
                    text = cell.value === null || cell.value === undefined ? "" : String(cell.text ?? "");
                } catch {
                    text = "";
                }
                const attrs = [span && span.cols > 1 ? ` colspan="${span.cols}"` : "", span && span.rows > 1 ? ` rowspan="${span.rows}"` : "", css ? ` style="${css}"` : ""].join("");
                tds.push(`<td${attrs}>${escapeHtml(text)}</td>`);
            }
            rows.push(`<tr style="height:${height}px"><th class="fv-xl-row">${r}</th>${tds.join("")}</tr>`);
        }
        const cols = `<colgroup><col style="width:40px">${widths.filter(Boolean).map((w) => `<col style="width:${w}px">`).join("")}</colgroup>`;
        const total = 40 + widths.reduce((a, b) => a + b, 0);
        result.html[name] = `<table class="fv-xl" style="width:${total}px">${cols}${head}<tbody>${rows.join("")}</tbody></table>`;
    });
    if (result.names.length === 0) throw new Error("no sheets");
    return result;
}
