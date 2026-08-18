import { useMediaQuery, useTheme } from "@mui/material";

/** 모바일(lg 미만) 레이아웃 여부를 판별한다.
 *  MUI theme breakpoint 기준 — lg(기본 1200px, codeshop 테마 1024px) 미만이면 모바일로 간주한다. */
export function useIsMobile(): boolean {
    const theme = useTheme();
    return !useMediaQuery(theme.breakpoints.up("lg"));
}
