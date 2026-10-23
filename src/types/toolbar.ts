/** 머리줄(툴바)에서 켜고 끌 수 있는 것 */
export type ViewerToolbarItem =
    | "fileNav" // 여러 파일 ◀ n/m ▶ (데스크톱 좌우 화살표 포함)
    | "pageList" // PDF 페이지 목록(폰·태블릿 ☰)
    | "pageNav" // PDF 페이지 이동 ‹ n ›
    | "fileName" // 파일 아이콘 + 이름(넓은 화면)
    | "zoom" // 확대·축소
    | "fit" // 화면에 맞추기
    | "rotate" // 왼쪽·오른쪽 회전
    | "download" // 다운로드
    | "print" // 인쇄(0.2.32 — PDF · 이미지 · HTML · 글. 오피스 문서는 바꾼 PDF 를 찍는다)
    | "share" // 공유(기기가 지원하거나 onShare 를 줄 때)
    | "close"; // 닫기(폰은 왼쪽 ←) — 끄면 Esc·뒤로가기로만 닫힌다

/** 뷰어 구성 — full 은 지금의 모든 단추, simple 은 넘기기·다운로드·닫기만 */
export type ViewerVariant = "full" | "simple";

/** 켜고 끄기 표 */
export type ViewerToolbar = Partial<Record<ViewerToolbarItem, boolean>>;

/** 구성별 기본 표 */
const PRESETS: Record<ViewerVariant, Record<ViewerToolbarItem, boolean>> = {
    full: { fileNav: true, pageList: true, pageNav: true, fileName: true, zoom: true, fit: true, rotate: true, download: true, print: true, share: true, close: true },
    simple: { fileNav: true, pageList: false, pageNav: true, fileName: true, zoom: false, fit: false, rotate: false, download: true, print: true, share: false, close: true },
};

/** 구성과 개별 설정을 합쳐 무엇을 보일지 정한다 — 개별 설정이 구성보다 앞선다 */
export function resolveToolbar(variant: ViewerVariant | undefined, toolbar: ViewerToolbar | undefined): Record<ViewerToolbarItem, boolean> {
    return { ...PRESETS[variant ?? "full"], ...toolbar };
}
