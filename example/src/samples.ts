import * as XLSX from "xlsx";

// 예제용 샘플 파일(blob) 생성기 모음 — 서버 없이 브라우저에서 만들어 뷰어에 넘긴다.

const encoder = new TextEncoder();

// PDF 문자열 리터럴 이스케이프 (역슬래시/괄호)
const escapePdfText = (text: string): string => text.replace(/[\\()]/g, (c) => "\\" + c);

/** 여러 페이지짜리 샘플 PDF 를 생성한다. (Helvetica 내장 폰트 — 영문 전용)
 *  pages 배열의 각 항목이 한 페이지가 되고, "\n" 으로 줄을 나눈다. */
export function createSamplePdf(pages: string[]): Blob {
    // 객체 번호: 1=Catalog, 2=Pages, 3..=Page/Contents 쌍, 마지막=Font
    const objects: string[] = [];
    const fontObjNum = 3 + pages.length * 2;
    const kids = pages.map((_, i) => `${3 + i * 2} 0 R`).join(" ");
    objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
    objects.push(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>\nendobj\n`);
    pages.forEach((text, i) => {
        const pageNum = 3 + i * 2;
        const contentNum = pageNum + 1;
        objects.push(
            `${pageNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ` +
                `/Resources << /Font << /F1 ${fontObjNum} 0 R >> >> /Contents ${contentNum} 0 R >>\nendobj\n`
        );
        // 각 줄을 40pt 간격으로 내려 그린다.
        const lines = text.split("\n");
        let stream = "BT\n/F1 28 Tf\n72 760 Td\n";
        stream += lines.map((line, idx) => `${idx ? "0 -40 Td\n" : ""}(${escapePdfText(line)}) Tj\n`).join("");
        stream += "ET";
        objects.push(`${contentNum} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`);
    });
    objects.push(`${fontObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`);

    // xref 는 바이트 오프셋 — 내용이 전부 ASCII 라 문자열 길이 = 바이트 수다.
    let pdf = "%PDF-1.4\n";
    const offsets: number[] = [];
    for (const obj of objects) {
        offsets.push(pdf.length);
        pdf += obj;
    }
    const xrefStart = pdf.length;
    const count = objects.length + 1;
    pdf += `xref\n0 ${count}\n0000000000 65535 f \n`;
    for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
    pdf += `trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    return new Blob([encoder.encode(pdf)], { type: "application/pdf" });
}

// 샘플 SVG 이미지를 생성한다 (그라데이션 + 텍스트)
export function createSampleSvg(): Blob {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#42a5f5"/>
      <stop offset="100%" stop-color="#7e57c2"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#g)"/>
  <circle cx="620" cy="140" r="80" fill="#fff59d" opacity="0.9"/>
  <text x="400" y="300" font-size="48" fill="white" text-anchor="middle" font-family="sans-serif">@ehfuse/file-viewer</text>
  <text x="400" y="360" font-size="24" fill="white" text-anchor="middle" font-family="sans-serif">이미지 미리보기 샘플 (SVG)</text>
</svg>`;
    return new Blob([svg], { type: "image/svg+xml" });
}

// 샘플 PNG 이미지를 canvas 로 그려 생성한다 (핀치줌/회전 확인용 큰 비트맵)
export function createSamplePng(): Promise<Blob> {
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 1200;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, 1600, 1200);
    gradient.addColorStop(0, "#26a69a");
    gradient.addColorStop(1, "#1565c0");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1600, 1200);
    // 격자를 그려 확대 상태를 눈으로 확인하기 쉽게 한다.
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    for (let x = 0; x <= 1600; x += 100) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 1200);
        ctx.stroke();
    }
    for (let y = 0; y <= 1200; y += 100) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1600, y);
        ctx.stroke();
    }
    ctx.fillStyle = "white";
    ctx.font = "bold 72px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PNG 샘플 1600×1200", 800, 600);
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
}

// 샘플 텍스트 파일을 생성한다
export function createSampleText(): Blob {
    const lines = ["@ehfuse/file-viewer 텍스트 미리보기 샘플", ""];
    for (let i = 1; i <= 60; i++) {
        lines.push(`${String(i).padStart(3, "0")} 번째 줄 — 텍스트 파일은 Monaco Editor 로 읽기 전용 표시된다.`);
    }
    return new Blob([lines.join("\n")], { type: "text/plain" });
}

// 샘플 TypeScript 코드 파일을 생성한다 (구문 강조 확인용)
export function createSampleCode(): Blob {
    const code = `// @ehfuse/file-viewer 코드 미리보기 샘플
import { useState } from "react";

// 카운터 훅 — 코드 파일은 확장자별 언어로 구문 강조된다
export function useCounter(initial: number = 0) {
    const [count, setCount] = useState(initial);
    const increment = () => setCount((prev) => prev + 1);
    const decrement = () => setCount((prev) => prev - 1);
    return { count, increment, decrement };
}

// 합계를 구한다
export const sum = (values: number[]): number => values.reduce((acc, v) => acc + v, 0);
`;
    return new Blob([code], { type: "text/plain" });
}

// 샘플 JSON 파일을 생성한다
export function createSampleJson(): Blob {
    const data = {
        package: "@ehfuse/file-viewer",
        types: ["image", "pdf", "text", "code", "html", "spreadsheet", "video", "audio"],
        features: { pinchZoom: true, rotate: true, download: true, worksheetTabs: true },
    };
    return new Blob([JSON.stringify(data, null, 4)], { type: "application/json" });
}

// 샘플 HTML 파일을 생성한다 (미리보기/소스 전환 확인용)
export function createSampleHtml(): Blob {
    const html = `<h1 style="color:#1565c0">HTML 미리보기 샘플</h1>
<p>HTML 파일은 <strong>미리보기</strong>와 <strong>소스코드</strong> 모드를 전환할 수 있다.</p>
<ul>
  <li>미리보기: 렌더된 결과</li>
  <li>소스코드: Monaco Editor 구문 강조</li>
</ul>
<table border="1" cellpadding="6" style="border-collapse:collapse">
  <tr><th>타입</th><th>뷰어</th></tr>
  <tr><td>pdf</td><td>react-pdf</td></tr>
  <tr><td>spreadsheet</td><td>react-spreadsheet</td></tr>
</table>`;
    return new Blob([html], { type: "text/html" });
}

// 샘플 CSV 파일을 생성한다
export function createSampleCsv(): Blob {
    const rows = [["월", "매출", "지출", "이익"]];
    for (let m = 1; m <= 12; m++) {
        const sales = 1000 + m * 137;
        const cost = 600 + m * 61;
        rows.push([`${m}월`, String(sales), String(cost), String(sales - cost)]);
    }
    return new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
}

// 샘플 XLSX 파일을 생성한다 (워크시트 2개 — 하단 시트 탭 전환 확인용)
export function createSampleXlsx(): Blob {
    const workbook = XLSX.utils.book_new();
    const sheet1 = XLSX.utils.aoa_to_sheet([
        ["분기", "매출", "지출"],
        ["1분기", 3200, 1900],
        ["2분기", 4100, 2300],
        ["3분기", 3800, 2100],
        ["4분기", 5200, 2600],
    ]);
    const sheet2 = XLSX.utils.aoa_to_sheet([
        ["이름", "부서", "내선"],
        ["김샘플", "개발", "1001"],
        ["이보기", "디자인", "1002"],
        ["박미리", "운영", "1003"],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet1, "실적");
    XLSX.utils.book_append_sheet(workbook, sheet2, "연락처");
    const array = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    return new Blob([array], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
}

/** 샘플 WAV 오디오(3초, 440Hz 사인파 페이드아웃)를 PCM 으로 직접 생성한다. */
export function createSampleWav(): Blob {
    const sampleRate = 44100;
    const duration = 3;
    const n = sampleRate * duration;
    const buffer = new ArrayBuffer(44 + n * 2);
    const view = new DataView(buffer);
    // ASCII 문자열을 버퍼에 기록한다
    const writeStr = (offset: number, s: string) => {
        for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
    };
    writeStr(0, "RIFF");
    view.setUint32(4, 36 + n * 2, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true); // fmt 청크 크기
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // 모노
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // 초당 바이트
    view.setUint16(32, 2, true); // 블록 정렬
    view.setUint16(34, 16, true); // 비트 심도
    writeStr(36, "data");
    view.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) {
        const t = i / sampleRate;
        const fade = 1 - t / duration; // 끝으로 갈수록 작아지는 페이드아웃
        view.setInt16(44 + i * 2, Math.sin(2 * Math.PI * 440 * t) * 0.3 * fade * 32767, true);
    }
    return new Blob([buffer], { type: "audio/wav" });
}
