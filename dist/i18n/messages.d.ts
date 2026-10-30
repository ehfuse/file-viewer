/** 뷰어가 기본으로 아는 화면 언어 */
export type ViewerLocale = "ko" | "en" | "ja" | "mn" | "kk";
/** 뷰어 화면 문구 */
export interface ViewerLabels {
    back: string;
    close: string;
    prevFile: string;
    nextFile: string;
    pageList: string;
    prevPage: string;
    nextPage: string;
    zoomIn: string;
    zoomOut: string;
    fitToScreen: string;
    rotateLeft: string;
    rotateRight: string;
    download: string;
    share: string;
    print: string;
    unsupported: string;
    downloadToCheck: string;
    loadFailed: string;
    previewFailed: string;
    pdfLoadFailed: string;
    pdfCannotLoad: string;
    pdfPasswordNeeded: string;
    pdfPasswordWrong: string;
    pdfPassword: string;
    open: string;
    cannotReadFile: string;
    cannotReadHtml: string;
    htmlPreview: string;
    htmlSource: string;
    videoUnsupported: string;
    audioUnsupported: string;
    spreadsheetFailed: string;
    imageCopied: string;
    imageCopyFailed: string;
}
/** 언어별 기본 문구 */
export declare const VIEWER_MESSAGES: Record<ViewerLocale, ViewerLabels>;
/** 언어 코드("en-US" 도 받는다)와 덮어쓸 문구로 화면 문구를 정한다 — 모르는 언어는 영어, 언어를 안 주면 한국어(예전 동작) */
export declare function resolveViewerLabels(locale: string | undefined, labels?: Partial<ViewerLabels>): ViewerLabels;
