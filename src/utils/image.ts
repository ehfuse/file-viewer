// blob 을 PNG blob 으로 변환한다 (클립보드 이미지는 사실상 PNG 만 통용된다)
export const convertBlobToPng = async (blob: Blob): Promise<Blob> => {
    const objectUrl = URL.createObjectURL(blob);
    try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = () => reject(new Error("이미지를 읽을 수 없습니다."));
            el.src = objectUrl;
        });
        // SVG 등 고유 크기가 없는 이미지는 기본 크기로 그린다.
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth || image.width || 1024;
        canvas.height = image.naturalHeight || image.height || 1024;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("캔버스를 만들 수 없습니다.");
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        return await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((result) => (result ? resolve(result) : reject(new Error("PNG 변환 실패"))), "image/png");
        });
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
};
