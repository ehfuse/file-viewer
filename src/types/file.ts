// 뷰어가 표시할 파일 정보 (name 필수, 데이터 소스는 blob/url/loadFile 중 하나)
export interface ViewerFile {
    name: string; // 파일명 (확장자로 미리보기 타입을 판별)
    url?: string; // 파일 URL (지정 시 fetch 로 로드)
    blob?: Blob; // 이미 로드된 blob (지정 시 그대로 사용, url 보다 우선)
    mimeType?: string; // MIME 타입 (확장자가 없을 때 타입 판별 폴백)
    size?: number; // 파일 크기 (바이트, 표시용 — 선택)
    [key: string]: unknown; // 소비처 부가 필드 (loadFile/onDownload 콜백에서 사용)
}

// FileViewer 컴포넌트 옵션
export interface FileViewerProps {
    open: boolean; // 뷰어 열림 여부
    onClose: () => void; // 뷰어 닫기 콜백
    file: ViewerFile | null; // 표시할 파일 (null 이면 렌더하지 않음)
    files?: ViewerFile[] | null; // 여러 파일을 넘기면 헤더 ◀ n/m ▶ 로 이전/다음 탐색(file 은 무시되고 initialIndex 파일부터)
    initialIndex?: number; // files 사용 시 처음 보여줄 파일 순번(기본 0)
    loadFile?: (file: ViewerFile) => Promise<Blob>; // 커스텀 blob 로더 (blob/url 이 없는 파일용 — 인증 다운로더 등)
    onDownload?: (file: ViewerFile) => void | Promise<void>; // 다운로드 동작 대체 (기본: 로드된 blob 을 앵커로 저장)
    pdfAssetBase?: string; // pdfjs 자산(worker/cmaps/폰트/wasm) 정적 경로 (기본 "/pdfjs" — setup-pdfjs 스크립트 참고)
}

// 뷰어가 판별하는 파일 타입
export type ViewerFileType =
    | "image"
    | "pdf"
    | "text"
    | "code"
    | "html"
    | "spreadsheet"
    | "video"
    | "audio"
    | "office"
    | "unsupported";
