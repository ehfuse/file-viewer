import { Box, Stack, Typography } from "@mui/material";
import { OpenViewerButton } from "../OpenViewerButton";
import { createSamplePdf } from "../samples";

// PDF 미리보기 예제 (썸네일 사이드바, 페이지 이동, 확대/회전, 핀치 줌)
export default function PdfPage() {
    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                PDF 미리보기
            </Typography>
            <Typography sx={{ mb: 2 }}>
                데스크탑은 썸네일 사이드바 + 휠/키보드 페이지 이동, 모바일은 드로어 썸네일 + 핀치 줌을 지원합니다.
                샘플 PDF 는 브라우저에서 직접 생성합니다 (내장 Helvetica — 영문 전용).
            </Typography>
            <Stack direction="row" spacing={2}>
                <OpenViewerButton
                    label="3페이지 PDF 열기"
                    fileName="sample-document.pdf"
                    createBlob={() =>
                        createSamplePdf([
                            "Page 1\n@ehfuse/file-viewer\nPDF preview sample",
                            "Page 2\nUse arrow keys or wheel\nto navigate pages",
                            "Page 3\nPinch zoom on mobile,\n+/- buttons on desktop",
                        ])
                    }
                />
                <OpenViewerButton
                    label="10페이지 PDF 열기"
                    fileName="sample-long.pdf"
                    createBlob={() =>
                        createSamplePdf(
                            Array.from({ length: 10 }, (_, i) => `Page ${i + 1} of 10\nThumbnail sidebar sample`)
                        )
                    }
                />
            </Stack>
        </Box>
    );
}
