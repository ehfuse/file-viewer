/** 머리줄(툴바)에서 켜고 끌 수 있는 것 */
export type ViewerToolbarItem = "fileNav" | "pageList" | "pageNav" | "fileName" | "zoom" | "fit" | "rotate" | "download" | "print" | "share" | "close";
/** 뷰어 구성 — full 은 지금의 모든 단추, simple 은 넘기기·다운로드·닫기만 */
export type ViewerVariant = "full" | "simple";
/** 켜고 끄기 표 */
export type ViewerToolbar = Partial<Record<ViewerToolbarItem, boolean>>;
/** 구성과 개별 설정을 합쳐 무엇을 보일지 정한다 — 개별 설정이 구성보다 앞선다 */
export declare function resolveToolbar(variant: ViewerVariant | undefined, toolbar: ViewerToolbar | undefined): Record<ViewerToolbarItem, boolean>;
