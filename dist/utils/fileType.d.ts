import type { ViewerFileType } from "../types/file";
export declare const getFileType: (fileName: string) => ViewerFileType;
export declare const getFileTypeFromMime: (mime: string) => ViewerFileType;
export declare const resolveFileType: (fileName: string, mime: string) => ViewerFileType;
export declare const isFileViewerPreviewable: (fileName: string, includeOffice?: boolean) => boolean;
/** 파일명에 확장자가 없으면 mimeType 으로 확장자를 보완한다(미리보기 타입 판별용). 이름이 비면 "첨부파일" 로 채운다.
 *  FileViewer 의 엑셀 파싱은 파일명이 .xls/.xlsx 로 끝나야 동작하므로 확장자 없는 첨부에 필수. */
export declare const ensureFileExtension: (rawName: string, mimeType: string) => string;
export declare const getEditorLanguage: (fileName: string) => string;
