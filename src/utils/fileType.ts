import type { ViewerFileType } from "../types/file";

// 파일 확장자로 뷰어 파일 타입을 판별한다
export const getFileType = (fileName: string): ViewerFileType => {
    const extension = fileName.split(".").pop()?.toLowerCase() || "";

    if (["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"].includes(extension)) {
        return "image";
    } else if (extension === "pdf") {
        return "pdf";
    } else if (["txt", "json", "xml", "log", "md", "markdown"].includes(extension)) {
        return "text";
    } else if (["csv", "xls", "xlsx"].includes(extension)) {
        return "spreadsheet";
    } else if (["html", "htm"].includes(extension)) {
        return "html";
    } else if (
        [
            "js",
            "jsx",
            "ts",
            "tsx",
            "css",
            "scss",
            "sass",
            "less",
            "php",
            "py",
            "java",
            "c",
            "cpp",
            "h",
            "hpp",
            "cs",
            "go",
            "rs",
            "rb",
            "swift",
            "kt",
            "scala",
            "sql",
            "sh",
            "bash",
            "bat",
            "ps1",
            "yml",
            "yaml",
            "toml",
            "ini",
            "conf",
        ].includes(extension)
    ) {
        return "code";
    } else if (["mp4", "avi", "mov", "wmv", "flv", "webm"].includes(extension)) {
        return "video";
    } else if (["mp3", "wav", "ogg", "m4a", "aac"].includes(extension)) {
        return "audio";
    } else if (["doc", "docx", "ppt", "pptx", "hwp", "hwpx"].includes(extension)) {
        return "office";
    } else {
        return "unsupported";
    }
};

// MIME 타입으로 뷰어 파일 타입을 추론한다 (확장자가 없거나 알 수 없을 때 폴백)
export const getFileTypeFromMime = (mime: string): ViewerFileType => {
    const normalized = (mime || "").toLowerCase().split(";")[0].trim();
    if (!normalized) return "unsupported";

    if (normalized.startsWith("image/")) return "image";
    if (normalized === "application/pdf") return "pdf";
    if (normalized.startsWith("video/")) return "video";
    if (normalized.startsWith("audio/")) return "audio";
    if (normalized === "text/html") return "html";
    if (normalized === "text/csv") return "spreadsheet";
    if (
        normalized === "application/vnd.ms-excel" ||
        normalized === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
        return "spreadsheet";
    }
    if (normalized.startsWith("text/") || normalized === "application/json" || normalized === "application/xml") {
        return "text";
    }
    return "unsupported";
};

// 확장자 우선, 알 수 없으면 MIME 폴백으로 최종 파일 타입을 정한다
export const resolveFileType = (fileName: string, mime: string): ViewerFileType => {
    const byName = getFileType(fileName);
    if (byName !== "unsupported") return byName;
    return getFileTypeFromMime(mime);
};

// FileViewer 가 인앱 미리보기로 실제 렌더 가능한 파일 타입 집합 (office/hwp/알 수 없음은 제외)
const FILE_VIEWER_RENDERABLE_TYPES = new Set<ViewerFileType>([
    "image",
    "pdf",
    "text",
    "code",
    "html",
    "spreadsheet",
    "video",
    "audio",
]);

// 파일명이 FileViewer 인앱 미리보기(엑셀 시트 전환 포함) 대상인지 판별한다
export const isFileViewerPreviewable = (fileName: string): boolean => {
    return FILE_VIEWER_RENDERABLE_TYPES.has(getFileType(fileName));
};

// MIME 타입 → 대표 확장자. 확장자 필드가 없거나 원본명이 빠질 때 확장자 보완용
const MIME_EXTENSION_MAP: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/bmp": "bmp",
    "image/svg+xml": "svg",
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-excel": "xls",
    "text/csv": "csv",
    "text/plain": "txt",
    "application/json": "json",
    "text/xml": "xml",
    "application/xml": "xml",
    "text/html": "html",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
};

/** 파일명에 확장자가 없으면 mimeType 으로 확장자를 보완한다(미리보기 타입 판별용). 이름이 비면 "첨부파일" 로 채운다.
 *  FileViewer 의 엑셀 파싱은 파일명이 .xls/.xlsx 로 끝나야 동작하므로 확장자 없는 첨부에 필수. */
export const ensureFileExtension = (rawName: string, mimeType: string): string => {
    const name = (rawName ?? "").trim() || "첨부파일";
    if (/\.[a-z0-9]+$/i.test(name)) return name;
    const normalizedMime = (mimeType ?? "").trim().toLowerCase().split(";")[0];
    const ext = MIME_EXTENSION_MAP[normalizedMime] ?? "";
    return ext ? `${name}.${ext}` : name;
};

// 파일 확장자에 따른 Monaco Editor 언어 매핑
export const getEditorLanguage = (fileName: string): string => {
    const extension = fileName.split(".").pop()?.toLowerCase() || "";

    const languageMap: { [key: string]: string } = {
        js: "javascript",
        jsx: "javascript",
        ts: "typescript",
        tsx: "typescript",
        html: "html",
        htm: "html",
        css: "css",
        scss: "scss",
        sass: "scss",
        less: "less",
        json: "json",
        xml: "xml",
        php: "php",
        py: "python",
        java: "java",
        c: "c",
        cpp: "cpp",
        h: "c",
        hpp: "cpp",
        cs: "csharp",
        go: "go",
        rs: "rust",
        rb: "ruby",
        swift: "swift",
        kt: "kotlin",
        scala: "scala",
        sql: "sql",
        sh: "shell",
        bash: "shell",
        bat: "bat",
        ps1: "powershell",
        yml: "yaml",
        yaml: "yaml",
        toml: "toml",
        ini: "ini",
        conf: "ini",
        md: "markdown",
        markdown: "markdown",
        txt: "plaintext",
        log: "plaintext",
        csv: "plaintext",
    };

    return languageMap[extension] || "plaintext";
};
