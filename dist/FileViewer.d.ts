/**
 * FileViewer.tsx — 풀스크린 파일 미리보기 다이얼로그.
 *
 * 이미지/PDF/텍스트/코드/HTML/스프레드시트/비디오/오디오를 인앱으로 렌더한다.
 * 데이터 소스는 file.blob → loadFile 콜백 → file.url(fetch) 순으로 해석한다.
 *
 * @license MIT
 * @author KIM YOUNG JIN (ehfuse@gmail.com)
 */
import React from "react";
import type { FileViewerProps } from "./types/file";
export declare const FileViewer: React.FC<FileViewerProps>;
export default FileViewer;
