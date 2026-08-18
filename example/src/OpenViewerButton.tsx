import { useState } from "react";
import { Button } from "@mui/material";
import { FileViewer, type ViewerFile } from "@ehfuse/file-viewer";

// 버튼 클릭 시 샘플 파일을 만들어 FileViewer 를 여는 공용 컴포넌트
export function OpenViewerButton({
    label, // 버튼 라벨
    fileName, // 뷰어에 넘길 파일명 (확장자로 타입 판별)
    createBlob, // 샘플 blob 생성기 (클릭 시 호출)
}: {
    label: string; // 버튼 라벨
    fileName: string; // 파일명
    createBlob: () => Blob | Promise<Blob>; // blob 생성기
}) {
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState<ViewerFile | null>(null);

    // 샘플 blob 을 만들어 뷰어를 연다
    const handleOpen = async () => {
        const blob = await createBlob();
        setFile({ name: fileName, blob });
        setOpen(true);
    };

    return (
        <>
            <Button variant="outlined" onClick={handleOpen}>
                {label}
            </Button>
            <FileViewer open={open} onClose={() => setOpen(false)} file={file} />
        </>
    );
}
