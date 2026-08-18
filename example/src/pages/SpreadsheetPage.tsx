import { Box, Stack, Typography } from "@mui/material";
import { OpenViewerButton } from "../OpenViewerButton";
import { createSampleCsv, createSampleXlsx } from "../samples";

// 스프레드시트 미리보기 예제 (CSV 파싱, XLSX 워크시트 탭 전환)
export default function SpreadsheetPage() {
    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                스프레드시트 미리보기
            </Typography>
            <Typography sx={{ mb: 2 }}>
                CSV 는 간단 파싱, XLSX 는 SheetJS 로 읽어 react-spreadsheet 로 표시합니다. 워크시트가 여러 개면 하단에
                시트 전환 탭이 나타납니다.
            </Typography>
            <Stack direction="row" spacing={2}>
                <OpenViewerButton label="CSV 열기" fileName="sample-report.csv" createBlob={createSampleCsv} />
                <OpenViewerButton label="XLSX 열기 (시트 2개)" fileName="sample-book.xlsx" createBlob={createSampleXlsx} />
            </Stack>
        </Box>
    );
}
