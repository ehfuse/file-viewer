/**
 * 파일 종류 아이콘 — FileViewer 의 파일 목록과 같은 매핑(이미지/PDF/HTML 은 전용 SVG, 그 외는 MUI 아이콘 + 종류별 색).
 * 다른 패키지(메일 첨부 등)가 같은 아이콘을 쓰도록 `@ehfuse/file-viewer/icons` 로 내보낸다.
 */
import type { ReactElement } from "react";
import type { ViewerFileType } from "../types";
/** 파일 종류별 아이콘 요소(size = px). */
export declare function getFileTypeIcon(fileType: ViewerFileType | string, size?: number): ReactElement;
export interface FileTypeIconProps {
    fileName: string;
    mime?: string;
    size?: number;
}
/** 파일명/MIME 으로 종류를 정해 아이콘을 그린다(압축 파일은 뷰어 타입이 없어 확장자로 따로 본다). */
export declare function FileTypeIcon({ fileName, mime, size }: FileTypeIconProps): ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
