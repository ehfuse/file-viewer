import type { ViewerToolbar, ViewerVariant } from "./toolbar";
import type { ViewerLabels } from "../i18n/messages";
export interface ViewerFile {
    name: string;
    url?: string;
    blob?: Blob;
    mimeType?: string;
    size?: number;
    previewUrl?: string;
    [key: string]: unknown;
}
export interface FileViewerProps {
    open: boolean;
    onClose: () => void;
    file: ViewerFile | null;
    files?: ViewerFile[] | null;
    initialIndex?: number;
    loadFile?: (file: ViewerFile) => Promise<Blob>;
    convertOffice?: (blob: Blob, file: ViewerFile) => Promise<Blob>;
    onDownload?: (file: ViewerFile) => void | Promise<void>;
    onShare?: (file: ViewerFile) => void | Promise<void>;
    pdfAssetBase?: string;
    locale?: string;
    labels?: Partial<ViewerLabels>;
    pageNavPosition?: "toolbar" | "below";
    variant?: ViewerVariant;
    toolbar?: ViewerToolbar;
    swipe?: boolean;
    chrome?: "bar" | "floating";
}
export type ViewerFileType = "image" | "pdf" | "text" | "code" | "html" | "spreadsheet" | "video" | "audio" | "office" | "unsupported";
