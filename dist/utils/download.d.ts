/** Blob 을 앵커 다운로드로 저장한다.
 *  ⚠️ objectURL 은 즉시 revoke 하면 브라우저에 따라 저장이 취소될 수 있어 다음 틱 이후에 해제한다. */
export declare const saveBlobAsFile: (blob: Blob, filename: string) => void;
