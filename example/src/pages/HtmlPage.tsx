import { Box, Stack, Typography } from "@mui/material";
import { OpenViewerButton } from "../OpenViewerButton";
import { createSampleHtml } from "../samples";

// HTML 미리보기 예제 (렌더 미리보기 ↔ 소스코드 전환)
export default function HtmlPage() {
    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                HTML 미리보기
            </Typography>
            <Typography sx={{ mb: 2 }}>
                상단 버튼으로 렌더된 미리보기와 Monaco 소스코드 보기를 전환할 수 있습니다.
            </Typography>
            <Stack direction="row" spacing={2}>
                <OpenViewerButton label="HTML 열기" fileName="sample-page.html" createBlob={createSampleHtml} />
            </Stack>
        </Box>
    );
}
