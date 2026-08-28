export { FileViewer, default as FileViewerDefault } from "./FileViewer";
export type { ViewerFile, FileViewerProps, ViewerFileType } from "./types";
export {
    getFileType,
    getFileTypeFromMime,
    resolveFileType,
    isFileViewerPreviewable,
    ensureFileExtension,
    getEditorLanguage,
} from "./utils/fileType";
export { saveBlobAsFile } from "./utils/download";
export { ImageIcon, PdfIcon, HtmlIcon, FileTypeIcon, getFileTypeIcon, type FileTypeIconProps } from "./icons";
