# @ehfuse/file-viewer

React 파일 미리보기 다이얼로그 (MUI 기반). 이미지 / PDF / 텍스트 / 코드 / HTML / 스프레드시트 / 비디오 / 오디오를 풀스크린으로 렌더한다.

- 이미지: 확대/축소·회전·팬·핀치 줌, Ctrl/⌘+C 클립보드 복사
- PDF: 썸네일 사이드바(모바일 드로어), 페이지 이동(키보드/휠), 핀치 줌, 회전 (react-pdf)
- 텍스트/코드/HTML 소스: Monaco Editor 읽기 전용 + 구문 강조
- 스프레드시트: CSV/XLS/XLSX, 워크시트 탭 전환 (SheetJS + react-spreadsheet)
- 다운로드 버튼 내장 (기본 앵커 저장, `onDownload` 로 대체 가능)

## 설치

```bash
npm install @ehfuse/file-viewer
# peer: @mui/material @mui/icons-material @emotion/react @emotion/styled
#       react-pdf @monaco-editor/react react-spreadsheet xlsx
#       @ehfuse/mui-fadeout-loading-progress
```

PDF 미리보기는 pdfjs 자산(worker/cmaps/폰트/wasm)을 로컬 정적 폴더에서 서빙해야 한다:

```jsonc
// package.json (소비 프로젝트)
{ "scripts": { "postinstall": "file-viewer-setup-pdfjs public/pdfjs" } }
```

## 사용

```tsx
import { FileViewer, ViewerFile } from "@ehfuse/file-viewer";

<FileViewer
    open={open}
    onClose={() => setOpen(false)}
    file={{ name: "report.pdf", url: "/files/report.pdf" }}
/>;
```

## 시그니처

```ts
// 표시할 파일 — 데이터 소스는 blob → loadFile → url 순으로 해석
interface ViewerFile {
    name: string; // 파일명 (확장자로 타입 판별)
    url?: string; // 파일 URL (fetch)
    blob?: Blob; // 이미 로드된 blob
    mimeType?: string; // 확장자 없을 때 타입 폴백
    [key: string]: unknown; // 소비처 부가 필드
}

interface FileViewerProps {
    open: boolean;
    onClose: () => void;
    file: ViewerFile | null;
    loadFile?: (file: ViewerFile) => Promise<Blob>; // 커스텀 blob 로더 (인증 다운로더 등)
    onDownload?: (file: ViewerFile) => void | Promise<void>; // 다운로드 동작 대체
    pdfAssetBase?: string; // pdfjs 자산 경로 (기본 "/pdfjs")
}

// 헬퍼
function getFileType(fileName: string): ViewerFileType;
function resolveFileType(fileName: string, mime: string): ViewerFileType;
function isFileViewerPreviewable(fileName: string): boolean;
function ensureFileExtension(rawName: string, mimeType: string): string;
function getEditorLanguage(fileName: string): string;
function saveBlobAsFile(blob: Blob, filename: string): void;
```

## 예제

`example/` 에 Vite + React 예제 앱이 있다 (샘플 파일을 전부 브라우저에서 blob 으로 생성 — 서버 불필요).

```bash
cd example && npm install && npm run dev
```

## License

MIT
