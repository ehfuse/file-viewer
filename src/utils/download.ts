// 파일명에 못 쓰는 문자를 _ 로 치환한다
const sanitizeFileName = (name: string): string => {
    return (name || "").replace(/[\\/:*?"<>|\r\n]/g, "_").trim() || "download";
};

/** Blob 을 앵커 다운로드로 저장한다.
 *  ⚠️ objectURL 은 즉시 revoke 하면 브라우저에 따라 저장이 취소될 수 있어 다음 틱 이후에 해제한다. */
export const saveBlobAsFile = (blob: Blob, filename: string): void => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = sanitizeFileName(filename);
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
};
