import { useState } from "react";
import { Box, Button, Stack, Typography, Snackbar } from "@mui/material";
import { FileViewer, type ViewerFile } from "@ehfuse/file-viewer";
import { createSamplePdf } from "../samples";

// 커스텀 로더(loadFile) + 커스텀 다운로드(onDownload) 예제
// 인증 API 로 blob 을 받아오는 실제 서비스 다운로더를 흉내 낸다.
export default function CustomLoaderPage() {
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState<ViewerFile | null>(null);
    const [notice, setNotice] = useState("");

    // blob/url 없이 메타데이터만 가진 파일을 연다 — 데이터는 loadFile 이 공급한다
    const handleOpen = () => {
        setFile({ name: "server-document.pdf", table_name: "sample_table", data_seq: 42 });
        setOpen(true);
    };

    // 서버 다운로더 흉내: 1초 지연 후 PDF blob 을 돌려준다 (로딩 인디케이터 확인용)
    const loadFile = async (target: ViewerFile): Promise<Blob> => {
        console.log("loadFile 호출:", target.table_name, target.data_seq);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return createSamplePdf([
            "Loaded via loadFile()\ntable: sample_table, seq: 42",
            "Page 2\nAuthenticated downloader sample",
        ]);
    };

    // 다운로드 버튼 동작 대체 — 실제로는 서버 다운로드 URL 로 보내는 식으로 쓴다
    const handleDownload = (target: ViewerFile) => {
        setNotice(`onDownload 호출됨: ${target.name} (기본 앵커 저장 대신 커스텀 동작)`);
    };

    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                커스텀 로더 / 다운로드
            </Typography>
            <Typography sx={{ mb: 2 }}>
                파일에 blob/url 이 없으면 <code>loadFile</code> 콜백이 blob 을 공급합니다 (인증 다운로더 등).{" "}
                <code>onDownload</code> 를 지정하면 다운로드 버튼 동작을 대체합니다.
            </Typography>
            <Stack direction="row" spacing={2}>
                <Button variant="outlined" onClick={handleOpen}>
                    loadFile 로 PDF 열기 (1초 지연)
                </Button>
            </Stack>
            <FileViewer
                open={open}
                onClose={() => setOpen(false)}
                file={file}
                loadFile={loadFile}
                onDownload={handleDownload}
            />
            <Snackbar
                open={Boolean(notice)}
                autoHideDuration={3000}
                onClose={() => setNotice("")}
                message={notice}
            />
        </Box>
    );
}
