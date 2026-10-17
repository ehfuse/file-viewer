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
    locale?: string; // 화면 문구 언어 — ko·en·ja·mn·kk (기본 ko, 모르는 언어는 영어)
    labels?: Partial<ViewerLabels>; // 문구를 직접 바꿀 때 (언어 기본 문구 위에 덮어쓴다)
    pageNavPosition?: "toolbar" | "below"; // PDF 페이지 이동(‹ n ›) 자리 — 기본 머리줄, "below" 면 머리줄 아래 한 줄
    variant?: "full" | "simple"; // 구성 — full(기본, 모든 단추) · simple(넘기기·다운로드·닫기만)
    toolbar?: ViewerToolbar; // 단추를 하나씩 켜고 끈다(구성보다 앞선다)
    swipe?: boolean; // 좌우로 밀어 넘기기(터치, 기본 true) — 사진 등은 파일, PDF 는 쪽(끝 쪽에서 파일)
    chrome?: "bar" | "floating"; // 머리줄 꼴 — bar(기본) · floating(머리줄 없이 ← · n/m · 좌우 화살표만)
    convertOffice?: (blob: Blob, file: ViewerFile) => Promise<Blob>; // doc·docx·ppt·pptx·hwp·hwpx → PDF 변환기 (주면 그 문서도 PDF 로 미리보기)
}

// 헬퍼
function getFileType(fileName: string): ViewerFileType;
function resolveFileType(fileName: string, mime: string): ViewerFileType;
function isFileViewerPreviewable(fileName: string, includeOffice?: boolean): boolean;
function ensureFileExtension(rawName: string, mimeType: string): string;
function getEditorLanguage(fileName: string): string;
function saveBlobAsFile(blob: Blob, filename: string): void;
```

## 화면 언어

`locale` 로 툴팁·안내 문구 언어를 고른다(ko · en · ja · mn · kk, 기본 ko). 문구 하나만 바꾸려면 `labels` 로 덮어쓴다.

```tsx
<FileViewer open={open} onClose={close} file={file} locale="mn" labels={{ download: "Татаж авах" }} />
```

회전 단추에는 언어와 상관없는 `data-viewer-action="rotate-left" | "rotate-right"` 가 붙어 있어 CSS 로 고를 수 있다.

## PDF 페이지 이동 자리

기본은 머리줄 안이다. 좁은 화면에서 머리줄이 단추로 차면 `pageNavPosition="below"` 로 머리줄 아래 한 줄(44px)로 내린다 — 그 줄에서는 "1 / 4" 처럼 전체 쪽수까지 보인다.

## 머리줄 단추 켜고 끄기

`variant` 로 구성을 고르고, `toolbar` 로 단추를 하나씩 켜고 끈다. 아무것도 주지 않으면 예전과 같다(`full`).

| 이름 | 단추 | full | simple |
| --- | --- | --- | --- |
| `fileNav` | 여러 파일 ◀ n/m ▶ (데스크톱 좌우 화살표 포함) | ✓ | ✓ |
| `pageList` | PDF 페이지 목록(폰·태블릿 ☰) | ✓ | |
| `pageNav` | PDF 페이지 이동 ‹ n › | ✓ | ✓ |
| `fileName` | 파일 아이콘 + 이름(넓은 화면) | ✓ | ✓ |
| `zoom` | 확대·축소 | ✓ | |
| `fit` | 화면에 맞추기 | ✓ | |
| `rotate` | 회전 | ✓ | |
| `download` | 다운로드 | ✓ | ✓ |
| `share` | 공유 | ✓ | |
| `close` | 닫기(폰은 왼쪽 ←) — 끄면 Esc·뒤로가기로만 닫힌다 | ✓ | ✓ |

```tsx
<FileViewer open file={file} onClose={close} variant="simple" />
<FileViewer open file={file} onClose={close} toolbar={{ rotate: false, share: false }} />
<FileViewer open file={file} onClose={close} variant="simple" toolbar={{ zoom: true }} />
```

조건이 맞지 않는 단추는 켜도 나오지 않는다(예: 회전은 이미지·PDF 에서만, 공유는 기기가 지원할 때만).

## 밀어 넘기기 · 떠 있는 꼴 (0.2.27)

- `swipe`(기본 `true`) — 터치로 좌우로 밀면 넘긴다. 사진 · 그 밖의 파일은 다음 · 이전 **파일**, PDF 는 다음 · 이전 **쪽**이고 끝 쪽에서 더 밀면 파일을 넘긴다.
  확대 중(배율 > 1)에는 끌기와 겹쳐 넘기지 않고, 두 손가락이 닿았던 동작(핀치)도 넘기지 않는다(핀치를 끝내며 파일이 넘어가던 것을 막는다).
- `chrome="floating"` — 회색 머리줄을 그리지 않고 본문이 화면을 다 쓴다. 위에 뒤로(←) · n/m(PDF 면 쪽, 그 밖은 파일 순번) · 좌우 화살표만 띄운다. 사진 갤러리 · 작품 확대 보기용.
  떠 있는 단추의 위 여백은 `env(safe-area-inset-top)` 이고, 앱 WebView 처럼 상태바를 이미 비운 곳은 CSS 변수 `--file-viewer-safe-top` 으로 바꾼다(예: `0px`).
- 사진 최대 배율은 8배다(PDF 와 같다 — 0.2.26 까지 3배).

```tsx
<FileViewer open={open} onClose={close} file={files[i]} files={files} initialIndex={i} chrome="floating" variant="simple" toolbar={{ download: false }} />
```

## 예제

`example/` 에 Vite + React 예제 앱이 있다 (샘플 파일을 전부 브라우저에서 blob 으로 생성 — 서버 불필요).

```bash
cd example && npm install && npm run dev
```

## License

MIT
