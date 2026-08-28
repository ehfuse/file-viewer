/**
 * 파일 종류 아이콘 — FileViewer 의 파일 목록과 같은 매핑(이미지/PDF/HTML 은 전용 SVG, 그 외는 MUI 아이콘 + 종류별 색).
 * 다른 패키지(메일 첨부 등)가 같은 아이콘을 쓰도록 `@ehfuse/file-viewer/icons` 로 내보낸다.
 */
import type { ReactElement } from "react";
import TextSnippetIcon from "@mui/icons-material/TextSnippet";
import VideoFileIcon from "@mui/icons-material/VideoFile";
import AudioFileIcon from "@mui/icons-material/AudioFile";
import DescriptionIcon from "@mui/icons-material/Description";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import CodeIcon from "@mui/icons-material/Code";
import TableViewIcon from "@mui/icons-material/TableView";
import type { ViewerFileType } from "../types";
import { resolveFileType } from "../utils/fileType";
import { ImageIcon } from "./ImageIcon";
import { PdfIcon } from "./PdfIcon";
import { HtmlIcon } from "./HtmlIcon";
import { ZipIcon } from "./ZipIcon";

/** 파일 종류별 아이콘 요소(size = px). */
export function getFileTypeIcon(fileType: ViewerFileType | string, size = 22): ReactElement {
    const px = `${size}px`;
    const sx = { fontSize: size };
    switch (fileType) {
        case "image":
            return <ImageIcon width={px} height={px} />;
        case "pdf":
            return <PdfIcon width={px} height={px} />;
        case "html":
            return <HtmlIcon width={px} height={px} />;
        case "archive":
            return <ZipIcon width={px} height={px} />;
        case "text":
            return <TextSnippetIcon sx={{ ...sx, color: "#66BB6A" }} />;
        case "spreadsheet":
            return <TableViewIcon sx={{ ...sx, color: "#4CAF50" }} />;
        case "code":
            return <CodeIcon sx={{ ...sx, color: "#2196F3" }} />;
        case "video":
            return <VideoFileIcon sx={{ ...sx, color: "#AB47BC" }} />;
        case "audio":
            return <AudioFileIcon sx={{ ...sx, color: "#FF7043" }} />;
        case "office":
            return <DescriptionIcon sx={{ ...sx, color: "#FFA726" }} />;
        default:
            return <InsertDriveFileIcon sx={{ ...sx, color: "#78909C" }} />;
    }
}

export interface FileTypeIconProps {
    fileName: string; // 파일명(확장자로 종류 판정)
    mime?: string; // MIME(확장자가 없을 때 보조)
    size?: number; // px(기본 22)
}

/** 압축 파일 확장자 */
const ARCHIVE_EXTENSIONS = new Set(["zip", "rar", "7z", "gz", "tgz", "tar", "bz2", "xz", "alz", "egg"]);

/** 파일명/MIME 으로 종류를 정해 아이콘을 그린다(압축 파일은 뷰어 타입이 없어 확장자로 따로 본다). */
export function FileTypeIcon({ fileName, mime, size = 22 }: FileTypeIconProps) {
    const ext = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase() : "";
    if (ARCHIVE_EXTENSIONS.has(ext)) return getFileTypeIcon("archive", size);
    return getFileTypeIcon(resolveFileType(fileName, mime ?? ""), size);
}
