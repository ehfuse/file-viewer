import { Box, Stack, Typography } from "@mui/material";
import { OpenViewerButton } from "../OpenViewerButton";
import { createSampleWav } from "../samples";

// 오디오 미리보기 예제 (audio 태그 플레이어 — WAV 를 PCM 으로 직접 생성)
export default function AudioPage() {
    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                오디오 미리보기
            </Typography>
            <Typography sx={{ mb: 2 }}>
                오디오 파일은 브라우저 기본 플레이어로 재생됩니다. 샘플은 440Hz 사인파 3초를 PCM 으로 직접 생성한 WAV
                입니다. (비디오도 같은 방식으로 mp4/webm 파일을 넘기면 재생됩니다)
            </Typography>
            <Stack direction="row" spacing={2}>
                <OpenViewerButton label="WAV 열기" fileName="sample-tone.wav" createBlob={createSampleWav} />
            </Stack>
        </Box>
    );
}
