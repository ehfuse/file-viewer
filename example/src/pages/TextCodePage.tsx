import { Box, Stack, Typography } from "@mui/material";
import { OpenViewerButton } from "../OpenViewerButton";
import { createSampleText, createSampleCode, createSampleJson } from "../samples";

// 텍스트/코드/JSON 미리보기 예제 (Monaco Editor 읽기 전용, 폰트 크기 +/-)
export default function TextCodePage() {
    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                텍스트 / 코드 / JSON 미리보기
            </Typography>
            <Typography sx={{ mb: 2 }}>
                Monaco Editor 로 읽기 전용 표시되며, 확장자별로 구문 강조 언어가 자동 선택됩니다. +/− 버튼은 폰트
                크기를 조절합니다.
            </Typography>
            <Stack direction="row" spacing={2}>
                <OpenViewerButton label="TXT 열기" fileName="sample-notes.txt" createBlob={createSampleText} />
                <OpenViewerButton label="TS 코드 열기" fileName="useCounter.ts" createBlob={createSampleCode} />
                <OpenViewerButton label="JSON 열기" fileName="sample-config.json" createBlob={createSampleJson} />
            </Stack>
        </Box>
    );
}
