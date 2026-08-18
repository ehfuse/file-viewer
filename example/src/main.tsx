import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { CssBaseline } from "@mui/material";
import App from "./App";

// 예제 앱 진입점 — 라우터로 감싼 App 을 마운트한다
// CssBaseline: box-sizing 전역 리셋 — 뷰어의 고정 높이 계산(60px 헤더)이 정확해진다
createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <CssBaseline />
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </StrictMode>
);
