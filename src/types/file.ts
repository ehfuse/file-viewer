import type { ViewerToolbar, ViewerVariant } from "./toolbar";
import type { ViewerLabels } from "../i18n/messages";
// 뷰어가 표시할 파일 정보 (name 필수, 데이터 소스는 blob/url/loadFile 중 하나)
export interface ViewerFile {
    name: string; // 파일명 (확장자로 미리보기 타입을 판별)
    url?: string; // 파일 URL (지정 시 fetch 로 로드)
    blob?: Blob; // 이미 로드된 blob (지정 시 그대로 사용, url 보다 우선)
    mimeType?: string; // MIME 타입 (확장자가 없을 때 타입 판별 폴백)
    size?: number; // 파일 크기 (바이트, 표시용 — 선택)
    previewUrl?: string; // 사진 — 원본을 받는 동안 먼저 보일 작은 사진(이미 받아 둔 썸네일 등). 원본이 그려지면 바꿔 낀다(0.2.31)
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
    convertOffice?: (blob: Blob, file: ViewerFile) => Promise<Blob>; // 오피스·한글 문서(doc·docx·ppt·pptx·hwp·hwpx)를 PDF 로 바꿔 주는 함수 — 주면 그 문서도 미리보기한다
    onDownload?: (file: ViewerFile) => void | Promise<void>; // 다운로드 동작 대체 (기본: 로드된 blob 을 앵커로 저장)
    onShare?: (file: ViewerFile) => void | Promise<void>; // 공유 동작 대체 (기본: 기기 공유 창 — Web Share API 로 파일을 싣는다. 못 쓰는 환경이면 버튼을 숨긴다)
    pdfAssetBase?: string; // pdfjs 자산(worker/cmaps/폰트/wasm) 정적 경로 (기본 "/pdfjs" — setup-pdfjs 스크립트 참고)
    locale?: string; // 화면 문구 언어 — ko·en·ja·mn·kk (기본 ko, "en-US" 처럼 지역이 붙어도 된다, 모르는 언어는 영어)
    labels?: Partial<ViewerLabels>; // 문구를 직접 바꿀 때 — 언어 기본 문구 위에 덮어쓴다
    pageNavPosition?: "toolbar" | "below"; // PDF 페이지 이동(‹ n ›) 자리 — 기본 머리줄, "below" 면 머리줄 아래 한 줄
    variant?: ViewerVariant; // 구성 — "full"(기본, 지금의 모든 단추) · "simple"(넘기기·다운로드·닫기만)
    toolbar?: ViewerToolbar; // 단추를 하나씩 켜고 끈다(구성보다 앞선다) — 예: { rotate: false, share: false }
    swipe?: boolean; // 좌우로 밀어 넘기기(터치, 기본 true) — 사진 · 그 밖은 다음 · 이전 파일, PDF 는 다음 · 이전 쪽(끝 쪽에서 더 밀면 파일). 확대 중 · 두 손가락은 넘기지 않는다
    chrome?: "bar" | "floating"; // 머리줄 꼴 — "bar"(기본, 회색 머리줄) · "floating"(머리줄 없이 뒤로 · n/m · 좌우 화살표만 본문 위에 띄운다. 사진 갤러리용)
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
