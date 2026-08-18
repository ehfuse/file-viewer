import { Routes, Route, Link, useLocation } from "react-router-dom";
import { Box, List, ListItemButton, ListItemText, Typography, Divider } from "@mui/material";
import ImagePage from "./pages/ImagePage";
import PdfPage from "./pages/PdfPage";
import TextCodePage from "./pages/TextCodePage";
import SpreadsheetPage from "./pages/SpreadsheetPage";
import HtmlPage from "./pages/HtmlPage";
import AudioPage from "./pages/AudioPage";
import CustomLoaderPage from "./pages/CustomLoaderPage";

// 예제 페이지 목록 (좌측 내비게이션 + 라우트 정의에 공용)
const PAGES = [
    { path: "/image", label: "이미지 (SVG/PNG)", element: <ImagePage /> },
    { path: "/pdf", label: "PDF (다중 페이지)", element: <PdfPage /> },
    { path: "/text-code", label: "텍스트 / 코드 / JSON", element: <TextCodePage /> },
    { path: "/spreadsheet", label: "스프레드시트 (CSV/XLSX)", element: <SpreadsheetPage /> },
    { path: "/html", label: "HTML (미리보기/소스)", element: <HtmlPage /> },
    { path: "/audio", label: "오디오 (WAV)", element: <AudioPage /> },
    { path: "/custom-loader", label: "커스텀 로더 / 다운로드", element: <CustomLoaderPage /> },
];

// 홈 화면 — 예제 소개
function Home() {
    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                @ehfuse/file-viewer 예제
            </Typography>
            <Typography>
                왼쪽 메뉴에서 파일 타입별 예제를 선택하세요. 샘플 파일은 모두 브라우저에서 blob 으로 생성되므로 서버가
                필요 없습니다.
            </Typography>
            <Typography sx={{ mt: 1 }}>
                PDF 미리보기는 <code>public/pdfjs</code> 의 pdfjs 자산을 사용합니다 (postinstall 의{" "}
                <code>setup-pdfjs</code> 스크립트가 복사).
            </Typography>
        </Box>
    );
}

// 예제 앱 루트 — 좌측 내비게이션 + 우측 라우트 본문
export default function App() {
    const location = useLocation();

    return (
        <Box sx={{ display: "flex", minHeight: "100vh" }}>
            <Box sx={{ width: 280, borderRight: "1px solid #e0e0e0", flexShrink: 0 }}>
                <Typography variant="h6" sx={{ p: 2 }}>
                    file-viewer
                </Typography>
                <Divider />
                <List dense>
                    <ListItemButton component={Link} to="/" selected={location.pathname === "/"}>
                        <ListItemText primary="홈" />
                    </ListItemButton>
                    {PAGES.map((page) => (
                        <ListItemButton
                            key={page.path}
                            component={Link}
                            to={page.path}
                            selected={location.pathname === page.path}
                        >
                            <ListItemText primary={page.label} />
                        </ListItemButton>
                    ))}
                </List>
            </Box>
            <Box sx={{ flex: 1, p: 3 }}>
                <Routes>
                    <Route path="/" element={<Home />} />
                    {PAGES.map((page) => (
                        <Route key={page.path} path={page.path} element={page.element} />
                    ))}
                </Routes>
            </Box>
        </Box>
    );
}
