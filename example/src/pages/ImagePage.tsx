import { Box, Stack, Typography } from "@mui/material";
import { OpenViewerButton } from "../OpenViewerButton";
import { createSampleSvg, createSamplePng } from "../samples";

// 이미지 미리보기 예제 (확대/축소·회전·팬·핀치 줌, Ctrl+C 클립보드 복사)
export default function ImagePage() {
    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                이미지 미리보기
            </Typography>
            <Typography sx={{ mb: 2 }}>
                +/− 확대, 회전, 드래그 팬, 모바일 핀치 줌을 지원합니다. 이미지가 열린 상태에서 Ctrl/⌘+C 를 누르면
                클립보드로 복사됩니다.
            </Typography>
            <Stack direction="row" spacing={2}>
                <OpenViewerButton label="SVG 열기" fileName="sample-image.svg" createBlob={createSampleSvg} />
                <OpenViewerButton label="PNG 열기 (1600×1200)" fileName="sample-image.png" createBlob={createSamplePng} />
            </Stack>
        </Box>
    );
}
