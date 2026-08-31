/**
 * FileViewer.tsx — 풀스크린 파일 미리보기 다이얼로그.
 *
 * 이미지/PDF/텍스트/코드/HTML/스프레드시트/비디오/오디오를 인앱으로 렌더한다.
 * 데이터 소스는 file.blob → loadFile 콜백 → file.url(fetch) 순으로 해석한다.
 *
 * @license MIT
 * @author KIM YOUNG JIN (ehfuse@gmail.com)
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Drawer,
    IconButton,
    Box,
    Typography,
    Tooltip,
    Button,
    Tabs,
    Tab,
    Menu,
    MenuItem,
    Snackbar,
    ListItemIcon,
    ListItemText,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import MenuIcon from "@mui/icons-material/Menu";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import DownloadIcon from "@mui/icons-material/Download";
// 확대/축소는 돋보기 대신 +/- 글리프를 쓴다(모바일에서 의미가 더 즉각적).
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import RotateLeftIcon from "@mui/icons-material/RotateLeft";
import RotateRightIcon from "@mui/icons-material/RotateRight";
import FitScreenIcon from "@mui/icons-material/FitScreen";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import TextSnippetIcon from "@mui/icons-material/TextSnippet";
import VideoFileIcon from "@mui/icons-material/VideoFile";
import AudioFileIcon from "@mui/icons-material/AudioFile";
import DescriptionIcon from "@mui/icons-material/Description";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import CodeIcon from "@mui/icons-material/Code";
import TableViewIcon from "@mui/icons-material/TableView";
import { Document, Page, pdfjs } from "react-pdf";
import Editor from "@monaco-editor/react";
import Spreadsheet from "react-spreadsheet";
import * as XLSX from "xlsx";
import { LoadingProgress } from "@ehfuse/mui-fadeout-loading-progress";

import type { ViewerFile, FileViewerProps } from "./types/file";
import { resolveFileType, getEditorLanguage, getFileType } from "./utils/fileType";
import { saveBlobAsFile } from "./utils/download";
import { convertBlobToPng } from "./utils/image";
import { useIsMobile } from "./hooks/useIsMobile";
import { ImageIcon } from "./icons/ImageIcon";
import { PdfIcon } from "./icons/PdfIcon";

// PDF.js 자산 로컬 호스팅 기본 경로. 소비 프로젝트가 scripts/setup-pdfjs.mjs 로 정적 폴더에 채운다.
// CDN 고정 버전을 쓰면 pdfjs-dist 업그레이드 시 API/Worker 버전이 어긋나 PDF 로드가 실패한다.
const DEFAULT_PDFJS_ASSET_BASE = "/pdfjs";

// PDF 페이지와 뷰어 경계 사이 여백(px). 이 값을 뺀 영역에 페이지를 꽉 맞춘다.
const PDF_VIEWER_GUTTER = 32;
// 뷰어 크기 실측 전이거나 비정상적으로 좁을 때 사용할 최소 렌더 폭(px).
const PDF_MIN_RENDER_WIDTH = 240;
// 캔버스 한 변의 안전 상한(px). 브라우저 한계(약 16384)를 넘으면 렌더가 통째로 실패한다.
const PDF_MAX_CANVAS_PX = 8192;

// PDF 배율 한계. 표시 폭은 배율대로 커지되 canvas 렌더 해상도는 PDF_MAX_CANVAS_PX 에서 캡되고,
// 그 이상은 CSS 로 늘려 보여준다(고배율에서 약간 소프트해지는 대신 메모리 안전).
const PDF_MIN_SCALE = 0.25;
const PDF_MAX_SCALE = 8;

// 모바일 PDF 오버스크롤: 문서를 이 폭(px)만 화면에 남는 위치까지 자유롭게 밀 수 있다.
// 문서 둘레에 (뷰포트 - 이 값) 만큼 스크롤 여백을 둬서, 핀치로 구석에 밀어둔 위치도
// 스크롤 좌표로 그대로 표현된다(→ 손을 떼도 가운데로 튕겨오지 않는다).
const PDF_OVERSCROLL_MIN_VISIBLE = 80;

// 이미지 이동(팬/핀치) 시 화면에 최소한 남아야 하는 이미지 폭(px).
// 가장자리에서 뚝 멈추지 않고 여유 있게 밀 수 있되 완전히 사라지지는 않는 한계다.
const IMAGE_MIN_VISIBLE_PX = 80;

// 파일 타입별 아이콘 반환
const getFileIcon = (fileType: string) => {
    switch (fileType) {
        case "image":
            return <ImageIcon />;
        case "pdf":
            return <PdfIcon />;
        case "text":
            return <TextSnippetIcon sx={{ mr: 1, color: "#66BB6A" }} />; // 녹색
        case "spreadsheet":
            return <TableViewIcon sx={{ mr: 1, color: "#4CAF50" }} />; // 초록색
        case "html":
            return <CodeIcon sx={{ mr: 1, color: "#E91E63" }} />; // 핑크색
        case "code":
            return <CodeIcon sx={{ mr: 1, color: "#2196F3" }} />; // 파란색
        case "video":
            return <VideoFileIcon sx={{ mr: 1, color: "#AB47BC" }} />; // 보라색
        case "audio":
            return <AudioFileIcon sx={{ mr: 1, color: "#FF7043" }} />; // 주황색
        case "office":
            return <DescriptionIcon sx={{ mr: 1, color: "#FFA726" }} />; // 골드색
        default:
            return <InsertDriveFileIcon sx={{ mr: 1, color: "#78909C" }} />; // 회색
    }
};

// PDF 페이지의 회전값을 안전하게 가져오는 헬퍼
const getPdfPageRotation = (page: any): number => {
    if (typeof page?.rotate === "number") return page.rotate;
    if (typeof page?._pageInfo?.rotate === "number") return page._pageInfo.rotate;
    return 0;
};

// 풀스크린 파일 미리보기 다이얼로그 컴포넌트
export const FileViewer: React.FC<FileViewerProps> = ({
    open,
    onClose,
    file: fileProp,
    files = null,
    initialIndex = 0,
    loadFile,
    onDownload,
    pdfAssetBase = DEFAULT_PDFJS_ASSET_BASE,
}) => {
    // 모바일(lg 미만) — 좁은 화면에선 "화면에 맞추기" 버튼을 숨긴다(핀치/±로 대체).
    const isMobile = useIsMobile();
    // sm 이하(아주 좁은 폭): 페이지 표시를 "1/1" 대신 현재 페이지만 보여준다.
    const muiTheme = useTheme();
    const isNarrow = useMediaQuery(muiTheme.breakpoints.down("sm"));
    // 다중 파일 — files 를 주면 이전/다음으로 넘겨 본다(기존 file 단일 사용과 호환).
    const fileList = useMemo<ViewerFile[]>(() => (files && files.length > 0 ? files : []), [files]);
    const [fileIndex, setFileIndex] = useState(0);
    useEffect(() => {
        if (!open) return;
        setFileIndex(fileList.length > 0 ? Math.min(Math.max(initialIndex, 0), fileList.length - 1) : 0);
    }, [open, initialIndex, fileList]);
    // 아래 전체 로직이 보는 활성 파일 — 인덱스가 바뀌면 로드 체인이 새 파일로 다시 돈다.
    const file = fileList.length > 0 ? (fileList[fileIndex] ?? fileProp) : fileProp;
    const [loading, setLoading] = useState(true);
    const [showLoading, setShowLoading] = useState(false); // 로딩 표시 상태 관리
    const [fileUrl, setFileUrl] = useState<string>("");
    const [scale, setScale] = useState(1.0); // PDF와 이미지 모두 scale 사용
    const [rotation, setRotation] = useState(0);
    const [error, setError] = useState<string>("");
    const [detectedMime, setDetectedMime] = useState<string>(""); // 로드한 blob의 MIME (확장자 없을 때 타입 폴백)
    const [textContent, setTextContent] = useState<string>(""); // 텍스트 파일 내용
    const [textFontSize, setTextFontSize] = useState<number>(14); // 텍스트 파일 폰트 크기
    const [htmlContent, setHtmlContent] = useState<string>(""); // HTML 파일 내용
    const [htmlViewMode, setHtmlViewMode] = useState<"source" | "preview">("preview"); // HTML 뷰 모드
    const [spreadsheetData, setSpreadsheetData] = useState<any[][]>([]); // 스프레드시트 데이터
    const [worksheetNames, setWorksheetNames] = useState<string[]>([]); // 워크시트 이름 목록
    const [selectedWorksheet, setSelectedWorksheet] = useState<string>(""); // 선택된 워크시트
    const [workbookData, setWorkbookData] = useState<any>(null); // 전체 워크북 데이터
    const [worksheetLoading, setWorksheetLoading] = useState<boolean>(false); // 워크시트 로딩 상태
    const [loadingVisible, setLoadingVisible] = useState<boolean>(true); // 로딩 컴포넌트 표시 상태
    const [copyNotice, setCopyNotice] = useState<string>(""); // 이미지 복사(Ctrl+C) 결과 안내

    // PDF 관련 상태
    const [numPages, setNumPages] = useState<number>();
    const [pageNumber, setPageNumber] = useState<number>(1);
    // 모바일: 페이지 썸네일 사이드바를 드로어로 여닫는다(헤더 메뉴 아이콘 토글).
    const [thumbnailDrawerOpen, setThumbnailDrawerOpen] = useState<boolean>(false);
    // 모바일: 폭이 좁아 회전/다운로드를 MoreHoriz 오버플로 메뉴로 접는다.
    const [moreMenuAnchor, setMoreMenuAnchor] = useState<HTMLElement | null>(null);
    const [pdfOrientation, setPdfOrientation] = useState<"portrait" | "landscape">("portrait");
    const [pageBaseRotation, setPageBaseRotation] = useState<number>(0); // PDF 페이지 자체에 기록된 회전값
    const [pageAspect, setPageAspect] = useState<number>(0); // 원본 페이지 가로/세로 비율
    const [viewerSize, setViewerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 }); // 뷰어 영역 실측 크기

    // 썸네일 각 항목 및 사이드바 컨테이너 ref
    const thumbnailRefs = useRef<(HTMLDivElement | null)[]>([]);
    const sidebarRef = useRef<HTMLDivElement | null>(null);
    // 메인 PDF 뷰어 영역 ref (표시 크기를 실측해 렌더 해상도를 정한다)
    const pdfViewerRef = useRef<HTMLDivElement | null>(null);
    const pdfResizeObserverRef = useRef<ResizeObserver | null>(null);
    // 두-손가락 스크롤 차단용 non-passive touchmove 리스너 해제 함수(attachPdfViewer 에서 등록)
    const pdfTouchBlockCleanupRef = useRef<(() => void) | null>(null);

    /**
     * PDF 뷰어 영역에 ResizeObserver 를 붙이는 callback ref.
     * 이 영역은 로딩이 끝난 뒤에야 마운트되므로 useEffect 의존성으로는 시점을 못 맞춘다.
     * (실제로 마운트되는 순간)에 관측을 시작해야 첫 렌더부터 올바른 해상도가 나온다.
     */
    const attachPdfViewer = useCallback((element: HTMLDivElement | null) => {
        pdfResizeObserverRef.current?.disconnect();
        pdfTouchBlockCleanupRef.current?.();
        pdfTouchBlockCleanupRef.current = null;
        pdfViewerRef.current = element;

        if (!element) {
            pdfResizeObserverRef.current = null;
            return;
        }

        // 핀치(두 손가락) 중 브라우저의 두-손가락 스크롤이 우리 transform 과 동시에 움직여 덜컹거린다.
        // touchAction: pan-x pan-y 는 한 손가락 스크롤용으로 유지하고, 두 손가락 touchmove 만 막는다.
        // (React 합성 이벤트는 passive 라 preventDefault 로 스크롤을 못 막는다 — non-passive 로 직접 등록)
        const blockTwoFingerScroll = (ev: TouchEvent) => {
            if (ev.touches.length >= 2) ev.preventDefault();
        };
        element.addEventListener("touchmove", blockTwoFingerScroll, { passive: false });
        pdfTouchBlockCleanupRef.current = () => element.removeEventListener("touchmove", blockTwoFingerScroll);

        const observer = new ResizeObserver((entries) => {
            const rect = entries[0]?.contentRect;
            if (rect) {
                setViewerSize({ width: rect.width, height: rect.height });
            }
        });
        observer.observe(element);
        pdfResizeObserverRef.current = observer;

        // 관측 콜백 전에도 즉시 1회 반영해 첫 렌더가 기본값(600)으로 새지 않게 한다.
        const rect = element.getBoundingClientRect();
        setViewerSize({ width: rect.width, height: rect.height });
    }, []);

    // 드래그 스크롤 관련 상태
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [scrollStart, setScrollStart] = useState({ x: 0, y: 0 });

    /** blob 데이터를 파일 타입에 맞는 뷰어 상태로 반영한다. */
    const applyBlobPreview = useCallback(async (blob: Blob, fileName: string) => {
        const url = URL.createObjectURL(blob);
        setFileUrl(url);

        // 확장자가 없거나 알 수 없는 경우 blob MIME 으로 타입을 폴백 판별한다.
        setDetectedMime(blob.type || "");
        const fileType = resolveFileType(fileName, blob.type || "");
        if (fileType === "text" || fileType === "code") {
            const text = await blob.text();
            setTextContent(text);
            return;
        }

        if (fileType === "html") {
            const text = await blob.text();
            setHtmlContent(text);
            return;
        }

        if (fileType !== "spreadsheet") {
            return;
        }

        const extension = fileName.split(".").pop()?.toLowerCase() || "";
        if (extension === "csv") {
            const text = await blob.text();
            const rows = text.split("\n").map((row) => row.split(",").map((cell) => ({ value: cell.trim() })));
            setSpreadsheetData(rows);
            return;
        }

        if (extension === "xls" || extension === "xlsx") {
            setWorksheetLoading(true);
            setLoadingVisible(true);

            const arrayBuffer = await blob.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: "array" });
            setWorksheetNames(workbook.SheetNames);
            setWorkbookData(workbook);

            const firstSheetName = workbook.SheetNames[0];
            setSelectedWorksheet(firstSheetName);
            loadWorksheetData(workbook, firstSheetName);
        }
    }, []);

    // 마지막으로 로드한 blob — 다운로드 기본 동작이 재요청 없이 재사용한다.
    const loadedBlobRef = useRef<Blob | null>(null);

    /** 파일의 blob 데이터를 얻는다. 우선순위: file.blob → loadFile 콜백 → file.url fetch. */
    const resolveFileBlob = useCallback(
        async (target: ViewerFile): Promise<Blob> => {
            if (target.blob) {
                return target.blob;
            }
            if (loadFile) {
                return await loadFile(target);
            }
            if (target.url) {
                const response = await fetch(target.url);
                if (!response.ok) {
                    throw new Error("파일을 불러올 수 없습니다.");
                }
                return await response.blob();
            }
            throw new Error("파일 데이터 소스(blob/url/loadFile)가 없습니다.");
        },
        [loadFile]
    );

    // 파일이 변경될 때마다 미리보기 URL 생성
    useEffect(() => {
        if (file && open) {
            generateFileUrl();
        } else {
            // 파일이 없거나 모달이 닫혔을 때 모든 상태 초기화
            if (fileUrl) {
                URL.revokeObjectURL(fileUrl);
            }
            loadedBlobRef.current = null;
            setFileUrl("");
            setTextContent("");
            setHtmlContent("");
            setSpreadsheetData([]);
            setTextFontSize(14);
            setScale(1.0);
            setRotation(0);
        }

        return () => {
            // 컴포넌트 언마운트 시 URL 정리
            if (fileUrl) {
                URL.revokeObjectURL(fileUrl);
            }
        };
    }, [file, open]);

    // PDF 관련 함수들
    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setPageNumber(1);
        pdfCenterPendingRef.current = true; // 새 문서는 첫 렌더에서 가운데로
    };

    // PDF 페이지 로드 성공 시 방향성 검사
    const onPageLoadSuccess = (page: any) => {
        // 페이지 뷰포트 정보 추출
        const { width, height } = getDimensionsFromPage(page);

        // PDF 자체 회전값 보존 (사용자 회전과 합산해 렌더 회전으로 넘긴다)
        setPageBaseRotation(getPdfPageRotation(page));

        // 원본 비율 보존 (뷰어 크기에 맞춰 렌더 폭을 계산할 때 사용)
        if (width > 0 && height > 0) {
            setPageAspect(width / height);
        }

        // 가로/세로 방향 결정
        const orientation = width > height ? "landscape" : "portrait";
        setPdfOrientation(orientation);
    };

    // 페이지 객체에서 실제 치수 추출 (회전 값 반영)
    const getDimensionsFromPage = (page: any) => {
        let width = page?.width || 0;
        let height = page?.height || 0;

        // 페이지의 기본 회전값 가져오기
        const pdfRotate = getPdfPageRotation(page);

        // getViewport 함수가 있는 경우 해당 함수를 통해 정확한 viewport 치수 가져오기
        try {
            if (typeof page?.getViewport === "function") {
                const viewport = page.getViewport({ scale: 1, rotation: pdfRotate });
                width = viewport.width;
                height = viewport.height;
            }
        } catch (e) {
            console.warn("[FileViewer] getViewport 실패 - 기본 width/height로 대체", e);
        }

        return { width, height };
    };

    const goToPrevPage = useCallback(() => {
        setPageNumber((prev) => Math.max(prev - 1, 1));
    }, []);

    const goToNextPage = useCallback(() => {
        setPageNumber((prev) => Math.min(prev + 1, numPages || 1));
    }, [numPages]);

    // PDF Document options를 memoize하여 불필요한 리렌더링 방지
    const pdfOptions = useMemo(
        () => ({
            cMapUrl: `${pdfAssetBase}/cmaps/`, // CJK(한글) 폰트 매핑
            cMapPacked: true,
            standardFontDataUrl: `${pdfAssetBase}/standard_fonts/`, // 폰트 미내장 PDF 용
            wasmUrl: `${pdfAssetBase}/wasm/`, // JPEG2000/JBIG2 이미지 디코더(pdfjs 5.x)
        }),
        [pdfAssetBase]
    );

    // PDF.js worker 설정 — 설치된 pdfjs-dist 와 동일 버전의 로컬 worker 를 사용한다(setup-pdfjs 스크립트가 복사).
    useEffect(() => {
        if (typeof window === "undefined") return;
        pdfjs.GlobalWorkerOptions.workerSrc = `${pdfAssetBase}/pdf.worker.min.mjs`;
    }, [pdfAssetBase]);

    // 다중 파일 이전/다음(← →) — PDF 는 화살표가 페이지 이동이라 제외한다.
    useEffect(() => {
        if (!open || fileList.length <= 1) return;
        if (resolveFileType(file?.name || "", detectedMime) === "pdf") return;
        const handleNavKey = (event: KeyboardEvent) => {
            if (event.key === "ArrowLeft") {
                event.preventDefault();
                setFileIndex((index) => Math.max(index - 1, 0));
            } else if (event.key === "ArrowRight") {
                event.preventDefault();
                setFileIndex((index) => Math.min(index + 1, fileList.length - 1));
            }
        };
        document.addEventListener("keydown", handleNavKey);
        return () => document.removeEventListener("keydown", handleNavKey);
    }, [open, fileList.length, file?.name, detectedMime]);

    // 키보드 이벤트 핸들러 (PDF 페이지 이동용)
    useEffect(() => {
        if (!open || resolveFileType(file?.name || "", detectedMime) !== "pdf") return;

        const handleKeyDown = (event: KeyboardEvent) => {
            switch (event.key) {
                case "ArrowLeft":
                case "ArrowUp":
                    event.preventDefault();
                    goToPrevPage();
                    break;
                case "ArrowRight":
                case "ArrowDown":
                    event.preventDefault();
                    goToNextPage();
                    break;
                case "Home":
                    event.preventDefault();
                    setPageNumber(1);
                    break;
                case "End":
                    event.preventDefault();
                    if (numPages) setPageNumber(numPages);
                    break;
            }
        };

        // 휠 이벤트 핸들러 (PDF 페이지 이동용)
        const handleWheel = (event: WheelEvent) => {
            // Ctrl 키가 눌려있으면 확대/축소를 위해 휠 이벤트를 그대로 두기
            if (event.ctrlKey) return;

            // 휠 델타값이 일정 임계값을 넘을 때만 페이지 이동
            if (Math.abs(event.deltaY) > 50) {
                event.preventDefault();
                if (event.deltaY > 0) {
                    // 아래로 스크롤 - 다음 페이지
                    goToNextPage();
                } else {
                    // 위로 스크롤 - 이전 페이지
                    goToPrevPage();
                }
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("wheel", handleWheel, { passive: false });

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("wheel", handleWheel);
        };
    }, [open, file, detectedMime, goToPrevPage, goToNextPage, numPages]);

    // 페이지 변경 시 사이드바 스크롤 위치 업데이트
    useEffect(() => {
        // PDF가 아니거나 페이지 정보가 없는 경우 실행하지 않음
        if (!numPages || !open || resolveFileType(file?.name || "", detectedMime) !== "pdf") return;

        // 첫 페이지로 이동한 경우 - 사이드바를 맨 위로 스크롤
        if (pageNumber === 1 && sidebarRef.current) {
            sidebarRef.current.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }

        // 다른 페이지로 이동한 경우 - 해당 페이지 썸네일과 번호가 모두 보이도록 스크롤
        const thumbnailContainer = thumbnailRefs.current[pageNumber - 1];
        if (thumbnailContainer) {
            thumbnailContainer.scrollIntoView({
                block: "nearest",
                inline: "nearest",
                behavior: "smooth",
            });
        }
    }, [open, file, detectedMime, numPages, pageNumber]);

    // 로딩 상태 관리
    useEffect(() => {
        if (loading) {
            setShowLoading(true);
        } else if (!loading && showLoading) {
            // 로딩이 끝났지만 아직 showLoading이 true인 경우
            // Loading 컴포넌트의 onComplete 콜백을 기다림
        }
    }, [loading, showLoading]);

    // 파일 미리보기용 URL 생성
    const generateFileUrl = async () => {
        if (!file) return;

        setLoading(true);
        setError("");
        setDetectedMime(""); // MIME 폴백 초기화
        setTextContent(""); // 텍스트 내용 초기화
        setHtmlContent(""); // HTML 내용 초기화
        setSpreadsheetData([]); // 스프레드시트 데이터 초기화

        try {
            // 모든 파일을 blob 으로 처리한다 (react-pdf 는 blob URL 지원).
            const blob = await resolveFileBlob(file);
            loadedBlobRef.current = blob; // 다운로드 기본 동작에서 재사용
            await applyBlobPreview(blob, file.name);
        } catch (error) {
            console.error("파일 로드 오류:", error);
            setError("파일을 불러올 수 없습니다.");
        } finally {
            setLoading(false);
        }
    };

    // 파일 다운로드 (onDownload 지정 시 그 동작으로 대체, 기본은 로드된 blob 앵커 저장)
    const handleDownload = async () => {
        if (!file) return;

        try {
            if (onDownload) {
                await onDownload(file);
                return;
            }

            // 미리보기로 이미 로드한 blob 이 있으면 재요청 없이 그대로 저장한다.
            const blob = loadedBlobRef.current ?? (await resolveFileBlob(file));
            saveBlobAsFile(blob, file.name);
        } catch (error) {
            console.error("파일 다운로드 오류:", error);
        }
    };

    // 줌 인
    const handleZoomIn = () => {
        const fileType = file ? resolveFileType(file.name, detectedMime) : "";
        if (fileType === "text" || fileType === "html" || fileType === "code" || fileType === "spreadsheet") {
            setTextFontSize((prev) => Math.min(prev + 2, 24)); // 텍스트, HTML, 코드, 스프레드시트는 폰트 크기 조정
        } else if (fileType === "pdf") {
            setScale((prev) => Math.min(prev + 0.25, PDF_MAX_SCALE));
        } else {
            setScale((prev) => Math.min(prev + 0.25, 3)); // 이미지는 scale로 조정
        }
    };

    // 줌 아웃
    const handleZoomOut = () => {
        const fileType = file ? resolveFileType(file.name, detectedMime) : "";
        if (fileType === "text" || fileType === "html" || fileType === "code" || fileType === "spreadsheet") {
            setTextFontSize((prev) => Math.max(prev - 2, 10)); // 텍스트, HTML, 코드, 스프레드시트는 폰트 크기 조정
        } else if (fileType === "pdf") {
            setScale((prev) => Math.max(prev - 0.25, PDF_MIN_SCALE));
        } else {
            setScale((prev) => Math.max(prev - 0.25, 0.25)); // 이미지는 scale로 조정
        }
    };

    // 제스처 중 눌린 포인터(pointerId→좌표) — 이미지/PDF 뷰포트가 공유한다(동시에 열리지 않는다).
    // 두 개가 눌리면 시작 거리·시작 배율을 기준으로 현재 거리 비율만큼 배율을 갱신한다(핀치 줌).
    const pinchPointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());

    const clampScale = (v: number) => Math.min(Math.max(v, 0.25), 3); // 이미지 배율 범위(버튼 줌과 동일)
    const clampPdfScale = (v: number) => Math.min(Math.max(v, PDF_MIN_SCALE), PDF_MAX_SCALE);

    // ── 이미지 확대/이동 ─────────────────────────────────────────────────────────────
    // SvgZoomViewer 와 같은 방식: 뷰포트는 overflow:hidden 이고 변환(배율·이동·회전)을 img 의
    // DOM style 에 직접 기록한다. 이전에는 scale 만 걸고 컨테이너 스크롤(overflow:auto)에 기댔는데,
    // transform 은 레이아웃 크기를 바꾸지 않아 스크롤 영역이 생기지 않았다 — 그래서 모바일에서
    // 확대는 되는데 좌우로 밀 수가 없었다. 핀치는 두 손가락 중점을 고정하는 초점 줌이다.
    const imageViewportRef = useRef<HTMLDivElement | null>(null);
    const imageContentRef = useRef<HTMLImageElement | null>(null);
    const imageViewRef = useRef({ scale: 1, tx: 0, ty: 0, rotation: 0 });
    const imageFrameRef = useRef(0); // 예약된 rAF id(0=없음) — pointermove 를 프레임당 1회로 스로틀
    const imagePanRef = useRef<{ startX: number; startY: number; baseTx: number; baseTy: number } | null>(null);
    const imagePinchRef = useRef<{
        startDist: number; // 시작 시 두 포인터 거리
        baseScale: number; // 시작 시 배율
        baseTx: number;
        baseTy: number;
        startMidX: number; // 시작 시 두 포인터 중점
        startMidY: number;
        centerX: number; // 뷰포트 중심 — transformOrigin(콘텐츠 중심) 기준 보정용
        centerY: number;
    } | null>(null);

    /** 이동(tx,ty)을 이미지가 화면 밖으로 완전히 벗어나지 않도록 제한한다(최소 IMAGE_MIN_VISIBLE_PX 는 남긴다). */
    const clampImageTranslate = useCallback((viewScale: number, tx: number, ty: number, rot: number) => {
        const viewport = imageViewportRef.current;
        const content = imageContentRef.current;
        if (!viewport || !content) return { tx, ty };
        // transform 은 offset 크기에 영향을 주지 않으므로 offsetWidth/Height 는 배율·회전 전의 레이아웃 크기다.
        let baseW = content.offsetWidth;
        let baseH = content.offsetHeight;
        const quarter = ((Math.round(rot / 90) % 4) + 4) % 4;
        if (quarter === 1 || quarter === 3) {
            const swap = baseW;
            baseW = baseH;
            baseH = swap;
        }
        const scaledW = baseW * viewScale;
        const scaledH = baseH * viewScale;
        // 뷰포트를 넘치는 축만 이동 허용 — 들어맞는 축은 가운데 고정(0).
        const maxTx = scaledW > viewport.clientWidth ? (scaledW + viewport.clientWidth) / 2 - IMAGE_MIN_VISIBLE_PX : 0;
        const maxTy =
            scaledH > viewport.clientHeight ? (scaledH + viewport.clientHeight) / 2 - IMAGE_MIN_VISIBLE_PX : 0;
        return {
            tx: Math.min(maxTx, Math.max(-maxTx, tx)),
            ty: Math.min(maxTy, Math.max(-maxTy, ty)),
        };
    }, []);

    /** 현재 배율·회전에서 이미지가 뷰포트를 넘쳐 이동(팬)이 필요한지 판단한다. */
    const isImagePannable = useCallback((viewScale: number, rot: number): boolean => {
        const viewport = imageViewportRef.current;
        const content = imageContentRef.current;
        if (!viewport || !content) return viewScale > 1;
        const quarter = ((Math.round(rot / 90) % 4) + 4) % 4;
        const swapped = quarter === 1 || quarter === 3;
        const baseW = swapped ? content.offsetHeight : content.offsetWidth;
        const baseH = swapped ? content.offsetWidth : content.offsetHeight;
        return baseW * viewScale > viewport.clientWidth + 1 || baseH * viewScale > viewport.clientHeight + 1;
    }, []);

    /** 현재 imageViewRef 값을 img 의 DOM style 에 반영한다.(smooth=버튼 조작의 부드러운 전환) */
    const applyImageView = useCallback((smooth: boolean) => {
        const el = imageContentRef.current;
        if (!el) return;
        const { scale: viewScale, tx, ty, rotation: rot } = imageViewRef.current;
        el.style.transition = smooth ? "transform 0.25s ease" : "none";
        el.style.transform = `translate(${tx}px, ${ty}px) scale(${viewScale}) rotate(${rot}deg)`;
    }, []);

    /** 이동값을 클램프한 뒤 다음 프레임에 1회 반영한다.(연속 pointermove 스로틀) */
    const scheduleImageApply = useCallback(() => {
        const view = imageViewRef.current;
        const clamped = clampImageTranslate(view.scale, view.tx, view.ty, view.rotation);
        view.tx = clamped.tx;
        view.ty = clamped.ty;
        if (imageFrameRef.current) return;
        imageFrameRef.current = requestAnimationFrame(() => {
            imageFrameRef.current = 0;
            applyImageView(false);
        });
    }, [applyImageView, clampImageTranslate]);

    /** 이미지 제스처 상태를 비운다(닫기·파일 전환·화면맞추기). */
    const resetImageGesture = useCallback(() => {
        if (imageFrameRef.current) {
            cancelAnimationFrame(imageFrameRef.current);
            imageFrameRef.current = 0;
        }
        pinchPointersRef.current.clear();
        imagePanRef.current = null;
        imagePinchRef.current = null;
    }, []);

    /** 이미지 엘리먼트 연결 — 새로 마운트될 때(파일 전환) 변환을 초기 상태로 되돌린다. */
    const attachImageContent = useCallback(
        (el: HTMLImageElement | null) => {
            imageContentRef.current = el;
            if (el) {
                imageViewRef.current = { scale: 1, tx: 0, ty: 0, rotation: 0 };
                applyImageView(false);
            }
        },
        [applyImageView]
    );

    // 툴바(+/−·회전·화면맞추기)의 scale/rotation 을 변환값에 반영한다 — 변환의 단일 기록자는 applyImageView 다.
    useEffect(() => {
        if (resolveFileType(file?.name || "", detectedMime) !== "image") return;
        const view = imageViewRef.current;
        view.scale = scale;
        view.rotation = rotation;
        const clamped = clampImageTranslate(view.scale, view.tx, view.ty, view.rotation);
        view.tx = clamped.tx;
        view.ty = clamped.ty;
        applyImageView(true);
    }, [scale, rotation, file, detectedMime, fileUrl, applyImageView, clampImageTranslate]);

    // 언마운트 시 예약된 이미지 프레임을 정리한다.
    useEffect(
        () => () => {
            if (imageFrameRef.current) cancelAnimationFrame(imageFrameRef.current);
        },
        []
    );

    // 포인터 다운 — 1개(넘칠 때 팬) / 2개(핀치 줌). 마우스·터치를 Pointer 하나로 함께 처리한다.
    const handleImagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        // 포인터가 밖으로 나가도 move/up 을 계속 받는다(드래그가 끊기지 않게).
        e.currentTarget.setPointerCapture?.(e.pointerId);
        pinchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const pts = [...pinchPointersRef.current.values()];
        const view = imageViewRef.current;
        if (pts.length === 2) {
            imagePanRef.current = null;
            const rect = e.currentTarget.getBoundingClientRect();
            imagePinchRef.current = {
                startDist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1,
                baseScale: view.scale,
                baseTx: view.tx,
                baseTy: view.ty,
                startMidX: (pts[0].x + pts[1].x) / 2,
                startMidY: (pts[0].y + pts[1].y) / 2,
                centerX: rect.left + rect.width / 2,
                centerY: rect.top + rect.height / 2,
            };
        } else if (pts.length === 1 && isImagePannable(view.scale, view.rotation)) {
            imagePanRef.current = { startX: e.clientX, startY: e.clientY, baseTx: view.tx, baseTy: view.ty };
        }
    };

    const handleImagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!pinchPointersRef.current.has(e.pointerId)) return;
        pinchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const view = imageViewRef.current;
        const pinch = imagePinchRef.current;
        const pts = [...pinchPointersRef.current.values()];
        if (pinch && pts.length >= 2) {
            const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            const midX = (pts[0].x + pts[1].x) / 2;
            const midY = (pts[0].y + pts[1].y) / 2;
            const nextScale = clampScale((pinch.baseScale * dist) / pinch.startDist);
            // 초점 고정: 시작 중점(M0) 아래 있던 지점이 현재 중점(M1)을 계속 따라오게
            // t1 = M1 − C − ratio × (M0 − C − t0). C(뷰포트 중심)는 transformOrigin(콘텐츠 중심) 보정이다.
            const ratio = nextScale / pinch.baseScale;
            view.scale = nextScale;
            view.tx = midX - pinch.centerX - ratio * (pinch.startMidX - pinch.centerX - pinch.baseTx);
            view.ty = midY - pinch.centerY - ratio * (pinch.startMidY - pinch.centerY - pinch.baseTy);
            scheduleImageApply();
            return;
        }

        const pan = imagePanRef.current;
        if (pan && pts.length === 1) {
            view.tx = pan.baseTx + (e.clientX - pan.startX);
            view.ty = pan.baseTy + (e.clientY - pan.startY);
            scheduleImageApply();
        }
    };

    const handleImagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!pinchPointersRef.current.has(e.pointerId)) return;
        pinchPointersRef.current.delete(e.pointerId);
        // 캡처가 걸린 채 요소가 사라지면 이후 터치가 죽은 요소로 라우팅된다 — 명시적으로 놓아준다.
        if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
            e.currentTarget.releasePointerCapture?.(e.pointerId);
        }
        const view = imageViewRef.current;
        if (pinchPointersRef.current.size < 2) {
            imagePinchRef.current = null;
            // 핀치로 바뀐 배율을 툴바(+/−·화면맞추기)와 공유하는 state 에 확정한다.
            if (Math.abs(view.scale - scale) > 0.001) setScale(view.scale);
        }
        if (pinchPointersRef.current.size === 0) {
            imagePanRef.current = null;
        } else if (pinchPointersRef.current.size === 1) {
            // 핀치에서 한 손가락만 남으면 그 손가락으로 팬을 이어간다.
            if (isImagePannable(view.scale, view.rotation)) {
                const remaining = [...pinchPointersRef.current.values()][0];
                imagePanRef.current = {
                    startX: remaining.x,
                    startY: remaining.y,
                    baseTx: view.tx,
                    baseTy: view.ty,
                };
            }
        }
    };

    /**
     * 열려 있는 이미지를 클립보드에 복사한다(Ctrl/⌘+C).
     * 클립보드 이미지는 사실상 PNG 만 통용되므로 PNG 가 아니면 canvas 로 변환해서 넣는다.
     */
    const handleCopyImage = useCallback(async () => {
        if (!fileUrl) return;
        try {
            const response = await fetch(fileUrl);
            const blob = await response.blob();
            const pngBlob = blob.type === "image/png" ? blob : await convertBlobToPng(blob);
            await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
            setCopyNotice("이미지를 클립보드에 복사했습니다.");
        } catch (error) {
            console.error("이미지 복사 오류:", error);
            setCopyNotice("이미지를 복사할 수 없습니다.");
        }
    }, [fileUrl]);

    // 이미지 뷰어에서 Ctrl/⌘+C 로 이미지를 복사한다(입력 요소에 포커스가 있으면 기본 복사를 방해하지 않는다).
    useEffect(() => {
        if (!open || resolveFileType(file?.name || "", detectedMime) !== "image") return;

        const handleCopyKey = (event: KeyboardEvent) => {
            if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "c") return;
            const target = event.target as HTMLElement | null;
            const tag = target?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
            event.preventDefault();
            void handleCopyImage();
        };

        document.addEventListener("keydown", handleCopyKey);
        return () => document.removeEventListener("keydown", handleCopyKey);
    }, [open, file, detectedMime, handleCopyImage]);

    // PDF 핀치 줌 — SvgZoomViewer 와 같은 방식으로 처리한다.
    // PDF 는 배율이 바뀌면 canvas 를 그 해상도로 다시 렌더하므로(pdfRenderWidth) 매 move 마다 setScale
    // 하면 손가락을 못 따라온다. 핀치 중에는 React state 를 건드리지 않고 .react-pdf__Document 에
    // translate+scale 을 rAF 스로틀로 직접 기록하며, 이동(tx,ty)이 두 손가락 중점을 계속 따라가
    // 손가락 사이 지점이 화면에 고정된다(초점 줌). 손을 떼면 그때 한 번만 setScale 로 확정해 고해상도로
    // 다시 그리고, onRenderSuccess 에서 transform 을 걷어내는 프레임에 같은 지점이 같은 화면 위치에
    // 오도록 스크롤을 이어받는다.
    const pdfPinchRef = useRef<{
        startDist: number; // 시작 시 두 포인터 거리
        rectLeft: number; // 시작 시 Page 화면 좌상단(transform 없는 상태) — 초점 계산 기준
        rectTop: number;
        pageW: number; // 시작 시 Page 크기(transform 없는 상태) — 이동 클램프용
        pageH: number;
        viewerL: number; // 뷰어 화면 경계 — 이동 클램프용
        viewerT: number;
        viewerR: number;
        viewerB: number;
        startMidX: number; // 시작 시 두 포인터 중점
        startMidY: number;
        lastMidX: number; // 마지막 중점 — 확정 시 앵커로 쓴다
        lastMidY: number;
        k: number; // 현재 미리보기 배율(확정 배율 scale 대비 상대값)
        tx: number;
        ty: number;
    } | null>(null);
    const pdfPinchFrameRef = useRef(0); // 예약된 rAF id(0=없음)
    // rAF 로 실제 화면에 칠해진(=사용자가 보고 있는) 핀치 상태. 확정(앵커·스냅샷)은 반드시 이 값
    // 기준이어야 한다 — 아직 안 칠해진 마지막 move 로 확정하면 그 차이만큼 화면이 '톡' 튄다
    // (특히 축소는 손을 떼는 순간까지 이동이 커서 티가 난다).
    const pdfPinchAppliedRef = useRef<{ k: number; tx: number; ty: number; midX: number; midY: number } | null>(null);
    // 확정 재렌더 후 스크롤로 이어받을 앵커: 옛 canvas 좌표(u,v)의 지점이 뷰포트 (offX,offY)에 있었다.
    const pdfPinchRestoreRef = useRef<{ u: number; v: number; offX: number; offY: number; factor: number } | null>(
        null
    );

    // 핀치 transform 의 대상. Document 가 아니라 그 안쪽 Page 인 이유: 오버스크롤 여백(padding)이
    // Document 에 있는데 transform 이 Document 에 걸리면 여백까지 배율에 딸려가 앵커 계산이 어긋난다.
    const getPdfDocEl = () => pdfViewerRef.current?.querySelector<HTMLElement>(".react-pdf__Page") ?? null;

    // 확정 재렌더를 기다리는 동안 옛 화면을 덮어둘 스냅샷 canvas.
    // react-pdf 는 배율이 바뀌면 같은 canvas 의 크기를 바꾸는데, canvas 는 크기가 바뀌는 순간 비트맵이
    // 지워져 pdf.js 가 다시 그릴 때까지 빈 화면이 비친다(→ 깜빡임). 확정 직전 비트맵을 복사해 그 자리에
    // 얹어 두고, 새 canvas 가 그려진 프레임에 걷어낸다.
    const pdfSnapshotRef = useRef<HTMLCanvasElement | null>(null);
    // 스냅샷을 붙일 곳 — 뷰어(스크롤 컨테이너)가 아니라 그 부모다. 뷰어 안에 붙이면 확정 시
    // 콘텐츠 크기 변화로 스크롤이 클램프될 때 스냅샷째로 화면이 밀린다(축소 확정에서 흔들림의 주범).
    // 부모에 뷰포트 좌표로 고정하면 재렌더 대기 동안 화면이 완전히 동결된다.
    const pdfOuterRef = useRef<HTMLDivElement | null>(null);

    /** 현재 PDF canvas 의 화면 그대로를 뷰포트 고정 스냅샷으로 덮는다. 성공 여부를 돌려준다. */
    const createPdfSnapshotOverlay = (): boolean => {
        const outer = pdfOuterRef.current;
        const canvas = getPdfDocEl()?.querySelector("canvas");
        if (!outer || !canvas || !canvas.width || !canvas.height) return false;
        const snap = document.createElement("canvas");
        snap.width = canvas.width;
        snap.height = canvas.height;
        const ctx = snap.getContext("2d");
        if (!ctx) return false;
        ctx.drawImage(canvas, 0, 0);
        // getBoundingClientRect 는 핀치 transform 이 반영된 "보이는" 위치/크기 — 그 자리에 그대로 얹는다.
        // (부모는 스크롤하지 않으므로 이 좌표는 대기 동안 변하지 않는다)
        const rect = canvas.getBoundingClientRect();
        const outerRect = outer.getBoundingClientRect();
        Object.assign(snap.style, {
            position: "absolute",
            left: `${rect.left - outerRect.left}px`,
            top: `${rect.top - outerRect.top}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            pointerEvents: "none",
            zIndex: "1",
        });
        outer.appendChild(snap);
        pdfSnapshotRef.current = snap;
        return true;
    };

    /** 스냅샷 오버레이를 제거하고 숨겨둔 Document 를 되살린다. */
    const removePdfSnapshotOverlay = () => {
        pdfSnapshotRef.current?.remove();
        pdfSnapshotRef.current = null;
        const el = getPdfDocEl();
        if (el) el.style.visibility = "";
    };

    /** 현재 핀치 상태를 Document 의 transform 으로 반영한다(다음 프레임에 1회 — pointermove 스로틀). */
    const schedulePdfPinchApply = () => {
        if (pdfPinchFrameRef.current) return;
        pdfPinchFrameRef.current = requestAnimationFrame(() => {
            pdfPinchFrameRef.current = 0;
            const p = pdfPinchRef.current;
            const el = getPdfDocEl();
            if (!p || !el) return;
            el.style.transition = "none";
            el.style.transformOrigin = "top left"; // tx,ty 계산이 좌상단 기준이므로 origin 도 좌상단
            el.style.transform = `translate(${p.tx}px, ${p.ty}px) scale(${p.k})`;
            // 이 프레임에 화면에 칠해지는 상태를 기록 — 확정은 이 값 기준(위 pdfPinchAppliedRef 주석 참고).
            pdfPinchAppliedRef.current = { k: p.k, tx: p.tx, ty: p.ty, midX: p.lastMidX, midY: p.lastMidY };
        });
    };

    /** PDF 핀치 잔여물(transform·예약 프레임·앵커)을 정리한다. */
    const resetPdfPinch = () => {
        if (pdfPinchFrameRef.current) {
            cancelAnimationFrame(pdfPinchFrameRef.current);
            pdfPinchFrameRef.current = 0;
        }
        pdfPinchRef.current = null;
        pdfPinchRestoreRef.current = null;
        pdfPinchAppliedRef.current = null;
        removePdfSnapshotOverlay();
        const el = getPdfDocEl();
        if (el) {
            el.style.transform = "";
            el.style.willChange = "auto";
        }
    };

    /** 핀치 추적을 시작한다(현재 화면 기하를 실측해 기준으로 잡는다). */
    const startPdfPinch = (pts: readonly { x: number; y: number }[]) => {
        const el = getPdfDocEl();
        const viewer = pdfViewerRef.current;
        if (!el || !viewer) return;
        if (el.style.transform) el.style.transform = ""; // 고아 transform 방어(정상 흐름엔 없다)
        const rect = el.getBoundingClientRect(); // transform 없는 상태의 화면 위치
        const viewerRect = viewer.getBoundingClientRect();
        const midX = (pts[0].x + pts[1].x) / 2;
        const midY = (pts[0].y + pts[1].y) / 2;
        pdfPinchRef.current = {
            startDist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1,
            rectLeft: rect.left,
            rectTop: rect.top,
            pageW: rect.width,
            pageH: rect.height,
            viewerL: viewerRect.left,
            viewerT: viewerRect.top,
            viewerR: viewerRect.right,
            viewerB: viewerRect.bottom,
            startMidX: midX,
            startMidY: midY,
            lastMidX: midX,
            lastMidY: midY,
            k: 1,
            tx: 0,
            ty: 0,
        };
        // 시작 시점의 화면 상태 = 무변환. (첫 rAF 반영 전에 손을 떼면 이 값으로 확정 → 변화 없음)
        pdfPinchAppliedRef.current = { k: 1, tx: 0, ty: 0, midX, midY };
        el.style.willChange = "transform"; // 제스처 동안 합성 레이어로 승격
    };

    const handlePdfPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.pointerType !== "touch") return;
        pinchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const pts = [...pinchPointersRef.current.values()];
        if (pts.length === 2) {
            // 직전 확정의 재렌더를 기다리는 중이면(연달아 핀치) 시작을 미룬다 — 지금 스냅샷을 걷으면
            // react-pdf 가 숨겨둔(canvas visibility hidden)/미완성 canvas 가 드러나 흰 페이지가 번쩍인다.
            // 화면은 스냅샷으로 동결을 유지하고, 복원 프레임(finishPdfPinchCommit)에 포인터가 남아
            // 있으면 그때 새 기하를 실측해 핀치를 시작한다.
            if (pdfPinchRestoreRef.current || pdfSnapshotRef.current) return;
            startPdfPinch(pts);
        }
    };

    const handlePdfPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!pinchPointersRef.current.has(e.pointerId)) return;
        pinchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const p = pdfPinchRef.current;
        const pts = [...pinchPointersRef.current.values()];
        if (p && pts.length >= 2) {
            e.preventDefault();
            const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            // 전체 배율(scale×k)이 PDF 배율 한계를 넘지 않게 k 를 제한한다.
            const k = Math.min(
                Math.max(dist / p.startDist, PDF_MIN_SCALE / (scale || 1)),
                PDF_MAX_SCALE / (scale || 1)
            );
            const midX = (pts[0].x + pts[1].x) / 2;
            const midY = (pts[0].y + pts[1].y) / 2;
            // 초점 고정: 시작 중점이 가리키던 콘텐츠 지점이 현재 중점 아래에 오도록 이동을 보정한다.
            // (SvgZoomViewer 와 같은 식, origin 이 좌상단이라 중심 보정항만 rect 좌상단으로 대체)
            let tx = midX - p.rectLeft - k * (p.startMidX - p.rectLeft);
            let ty = midY - p.rectTop - k * (p.startMidY - p.rectTop);
            // 이동 제한: 페이지가 최소 PDF_OVERSCROLL_MIN_VISIBLE 만큼은 화면에 남게 한다.
            // 오버스크롤 여백으로 스크롤이 표현할 수 있는 범위와 정확히 일치시켜, 확정 시 위치가
            // 잘리지 않는다(= 손을 떼도 튀지 않는다).
            const minVis = PDF_OVERSCROLL_MIN_VISIBLE;
            tx = Math.min(p.viewerR - minVis - p.rectLeft, Math.max(p.viewerL + minVis - p.rectLeft - k * p.pageW, tx));
            ty = Math.min(p.viewerB - minVis - p.rectTop, Math.max(p.viewerT + minVis - p.rectTop - k * p.pageH, ty));
            p.k = k;
            p.tx = tx;
            p.ty = ty;
            p.lastMidX = midX;
            p.lastMidY = midY;
            schedulePdfPinchApply();
        }
    };

    const handlePdfPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        pinchPointersRef.current.delete(e.pointerId);
        if (pinchPointersRef.current.size >= 2) return;
        const p = pdfPinchRef.current;
        pdfPinchRef.current = null;
        if (!p) return;
        // 아직 화면에 안 칠해진 마지막 move 는 버린다(칠해진 적 없으니 버려도 사용자는 모른다).
        // 확정은 화면에 실제 보이는(applied) 상태 기준 — 미반영 값으로 확정하면 그 차이만큼 톡 튄다.
        if (pdfPinchFrameRef.current) {
            cancelAnimationFrame(pdfPinchFrameRef.current);
            pdfPinchFrameRef.current = 0;
        }
        const a = pdfPinchAppliedRef.current ?? { k: 1, tx: 0, ty: 0, midX: p.startMidX, midY: p.startMidY };
        pdfPinchAppliedRef.current = null;
        const committed = clampPdfScale(scale * a.k);
        // 배율이 사실상 그대로면 재렌더가 없어 onRenderSuccess 도 오지 않는다 — 여기서 바로 정리한다.
        // 두 손가락 팬만 한 경우(tx,ty≠0)는 transform 이동을 같은 프레임에 스크롤로 이어받아
        // 제자리를 유지한다(그냥 지우면 팬한 만큼 스냅백해 보인다).
        if (Math.abs(committed - scale) < 0.001) {
            const viewer = pdfViewerRef.current;
            resetPdfPinch();
            if (viewer) {
                viewer.scrollLeft -= a.tx;
                viewer.scrollTop -= a.ty;
            }
            return;
        }
        const viewer = pdfViewerRef.current;
        if (viewer) {
            // 화면에 칠해진 중점이 가리키던 옛 canvas 좌표(u,v)와 뷰포트상 위치를 앵커로 남긴다.
            const viewerRect = viewer.getBoundingClientRect();
            pdfPinchRestoreRef.current = {
                u: (a.midX - p.rectLeft - a.tx) / a.k,
                v: (a.midY - p.rectTop - a.ty) / a.k,
                offX: a.midX - viewerRect.left,
                offY: a.midY - viewerRect.top,
                factor: committed / (scale || 1), // 새 canvas 좌표 = 옛 좌표 × factor
            };
        }
        // 재렌더 대기 동안의 깜빡임 방지: 옛 canvas 비트맵을 스냅샷으로 그 자리에 덮어두고
        // Document 는 숨긴다(새 크기의 빈 canvas 가 스냅샷 밖으로 비치지 않게). 새 canvas 가
        // 그려지면(onRenderSuccess) 스냅샷을 걷고 스크롤을 이어받는다.
        if (createPdfSnapshotOverlay()) {
            const el = getPdfDocEl();
            if (el) {
                el.style.transform = "";
                el.style.visibility = "hidden";
            }
        }
        // (스냅샷 실패 시 폴백: transform 을 유지한 채 기다린다 — onRenderSuccess 에서 함께 걷는다)
        setScale(committed);
        // 캡 구간 등으로 렌더 폭이 그대로면 canvas 재렌더가 없어 onRenderSuccess 가 오지 않는다 —
        // React 가 새 CSS 표시 폭을 반영한 다음 프레임에 직접 복원한다(이미 복원됐으면 no-op).
        if (Math.round(Math.min(fitWidth * committed, maxRenderWidth)) === pdfRenderWidth) {
            requestAnimationFrame(() => finishPdfPinchCommit());
        }
    };

    // 오버스크롤 여백 때문에 콘텐츠가 항상 뷰포트보다 커서 m:auto 로는 가운데가 안 잡힌다 —
    // 첫 렌더·페이지 이동·화면맞추기 때 스크롤로 직접 센터를 잡는다(여백이 대칭이라 중앙 스크롤=문서 중앙).
    const pdfCenterPendingRef = useRef(true);
    const pdfLastPageKeyRef = useRef<string | null>(null); // 마지막으로 렌더된 "페이지:회전" — 바뀌면 재센터

    const centerPdfScroll = () => {
        const viewer = pdfViewerRef.current;
        if (!viewer) return;
        viewer.scrollLeft = (viewer.scrollWidth - viewer.clientWidth) / 2;
        viewer.scrollTop = (viewer.scrollHeight - viewer.clientHeight) / 2;
    };

    /**
     * 핀치 확정이 화면에 반영된 뒤(canvas 재렌더 완료, 또는 캡 구간의 CSS 폭 변경 반영 후) 스냅샷을
     * 걷어내고 앵커 지점이 같은 화면 위치에 오도록 스크롤을 이어받는다. 같은 동기 프레임에 처리해
     * 이음새가 없다. (스냅샷이 스크롤 오버플로를 붙잡고 있으므로 먼저 제거해야 스크롤 값이 정확하다)
     */
    const finishPdfPinchCommit = () => {
        const restore = pdfPinchRestoreRef.current;
        if (!restore) return;
        pdfPinchRestoreRef.current = null;
        const viewer = pdfViewerRef.current;
        const el = getPdfDocEl();
        if (!viewer || !el) return;
        removePdfSnapshotOverlay();
        el.style.transform = "";
        el.style.willChange = "auto";
        // 새 레이아웃 기준으로 앵커 지점의 현재 화면 위치를 실측해 오차만큼 스크롤한다.
        const docRect = el.getBoundingClientRect();
        const viewerRect = viewer.getBoundingClientRect();
        viewer.scrollLeft += docRect.left - viewerRect.left + restore.u * restore.factor - restore.offX;
        viewer.scrollTop += docRect.top - viewerRect.top + restore.v * restore.factor - restore.offY;
        // 재렌더 대기 중에 두 손가락이 이미 내려와 있었으면(핀치 시작을 미뤄둔 상태) 지금 시작한다.
        const pts = [...pinchPointersRef.current.values()];
        if (pts.length >= 2) startPdfPinch(pts);
    };

    /**
     * 재렌더된 PDF canvas 가 화면에 올라온 시점.
     * 핀치 확정 렌더면 스냅샷 정리+스크롤 이어받기, 새 문서/페이지 이동/회전이면 가운데 센터링.
     * 그 외(리사이즈 등)는 스크롤을 건드리지 않는다.
     */
    const handlePageRenderSuccess = () => {
        const pageKey = `${pageNumber}:${rotation}`;
        if (pdfPinchRestoreRef.current) {
            pdfLastPageKeyRef.current = pageKey;
            finishPdfPinchCommit();
            return;
        }
        if (pdfCenterPendingRef.current || pdfLastPageKeyRef.current !== pageKey) {
            pdfCenterPendingRef.current = false;
            pdfLastPageKeyRef.current = pageKey;
            centerPdfScroll();
        }
    };

    // 언마운트 시 예약된 핀치 프레임을 정리한다.
    useEffect(
        () => () => {
            if (pdfPinchFrameRef.current) {
                cancelAnimationFrame(pdfPinchFrameRef.current);
            }
        },
        []
    );

    // 회전
    const handleRotateLeft = () => {
        setRotation((prev) => prev - 90);
    };

    const handleRotateRight = () => {
        setRotation((prev) => prev + 90);
    };

    // 화면에 맞추기
    const handleFitScreen = () => {
        const fileType = resolveFileType(file?.name || "", detectedMime);

        // 핀치 미리보기 transform 이 남아 있으면 배율 1.0 위에 겹쳐 어긋난다. 함께 정리한다.
        resetPdfPinch();

        if (fileType === "text" || fileType === "html" || fileType === "code" || fileType === "spreadsheet") {
            // 텍스트, HTML, 코드, 스프레드시트 파일은 기본 폰트 크기로 초기화
            setTextFontSize(14);
        } else if (fileType === "pdf") {
            // PDF 는 배율 1.0 자체가 뷰어 영역에 꽉 맞는 크기이므로 배율만 되돌린다.
            setScale(1);
            if (scale === 1 && rotation === 0) {
                centerPdfScroll(); // 재렌더가 없을 것이므로 즉시 가운데로
            } else {
                pdfCenterPendingRef.current = true; // 재렌더 완료 시 가운데로
            }
        } else {
            // 이미지는 배율뿐 아니라 팬 이동값도 되돌려야 원래 자리로 온다(state 변화가 없어도 즉시 반영).
            resetImageGesture();
            imageViewRef.current = { scale: 1, tx: 0, ty: 0, rotation: 0 };
            applyImageView(true);
            setScale(1);
        }
        setRotation(0);
    };

    // 드래그 스크롤 이벤트 핸들러
    const handleMouseDown = (e: React.MouseEvent, element: HTMLElement) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        setScrollStart({ x: element.scrollLeft, y: element.scrollTop });
        e.preventDefault();
    };

    const handleMouseMove = useCallback(
        (e: MouseEvent, element: HTMLElement) => {
            if (!isDragging) return;

            const deltaX = e.clientX - dragStart.x;
            const deltaY = e.clientY - dragStart.y;

            element.scrollLeft = scrollStart.x - deltaX;
            element.scrollTop = scrollStart.y - deltaY;

            e.preventDefault();
        },
        [isDragging, dragStart, scrollStart]
    );

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        document.body.style.cursor = "default";
    }, []);

    // 전역 마우스 이벤트 리스너 등록
    useEffect(() => {
        if (isDragging) {
            const handleGlobalMouseMove = (e: MouseEvent) => {
                const scrollableElements = document.querySelectorAll(".draggable-scroll");
                scrollableElements.forEach((element) => {
                    handleMouseMove(e, element as HTMLElement);
                });
            };

            document.addEventListener("mousemove", handleGlobalMouseMove);
            document.addEventListener("mouseup", handleMouseUp);

            // 드래그 중 텍스트 선택 방지
            document.body.style.userSelect = "none";

            return () => {
                document.removeEventListener("mousemove", handleGlobalMouseMove);
                document.removeEventListener("mouseup", handleMouseUp);
                document.body.style.userSelect = "";
                document.body.style.webkitUserSelect = "";
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    // 로딩 완료 핸들러
    const handleLoadingComplete = useCallback(() => {
        setLoading(false);
        setShowLoading(false);
    }, []);

    // 워크시트 데이터 로드 함수
    const loadWorksheetData = useCallback(async (workbook: any, sheetName: string) => {
        setWorksheetLoading(true);
        setLoadingVisible(true);

        try {
            // 약간의 지연을 추가하여 로딩 효과를 보이게 함
            await new Promise((resolve) => setTimeout(resolve, 500));

            const worksheet = workbook.Sheets[sheetName];

            // range를 사용하여 실제 데이터 범위 확인
            const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
            console.debug("Excel range:", range);

            // header: 1 옵션으로 배열의 배열 형태로 변환
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                range: range,
                defval: "", // 빈 셀은 빈 문자열로 처리
            });

            // console.debug("Excel raw data:", jsonData);

            // react-spreadsheet 형식으로 변환
            const formattedData = jsonData.map((row: any) =>
                row.map((cell: any) => ({
                    value: cell != null ? String(cell) : "",
                }))
            );

            // console.debug("Excel formatted data:", formattedData);
            setSpreadsheetData(formattedData);

            // 데이터 로드 완료 후 페이드아웃 시작을 위해 약간의 지연
            await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (error) {
            console.error("워크시트 로드 오류:", error);
        } finally {
            // 페이드아웃 시작
            setLoadingVisible(false);
        }
    }, []);

    // 워크시트 로딩 완료 핸들러 (페이드아웃 완료 후 호출)
    const handleWorksheetLoadingComplete = useCallback(() => {
        setWorksheetLoading(false);
    }, []);

    // 워크시트 변경 핸들러
    const handleWorksheetChange = useCallback(
        (sheetName: string) => {
            if (workbookData) {
                setSelectedWorksheet(sheetName);
                loadWorksheetData(workbookData, sheetName);
            }
        },
        [workbookData, loadWorksheetData]
    );

    // 모달 닫기
    const handleClose = () => {
        // 제스처 도중 닫으면 포인터 캡처가 남아 이후 터치가 죽은 요소로 라우팅된다 — 먼저 정리한다.
        resetImageGesture();
        imageViewRef.current = { scale: 1, tx: 0, ty: 0, rotation: 0 };
        setCopyNotice("");
        // 모든 파일의 blob URL을 정리
        if (fileUrl) {
            URL.revokeObjectURL(fileUrl);
        }
        loadedBlobRef.current = null;
        setFileUrl("");
        setTextContent("");
        setHtmlContent("");
        setSpreadsheetData([]);
        setWorksheetNames([]);
        setSelectedWorksheet("");
        setWorkbookData(null);
        setWorksheetLoading(false);
        setScale(1.0); // 기본 스케일로 초기화
        setRotation(0);
        setError("");
        // PDF 상태 초기화
        setNumPages(undefined);
        setPageNumber(1);
        setPdfOrientation("portrait"); // PDF 방향성도 초기화
        setPageBaseRotation(0); // PDF 자체 회전값 초기화
        setPageAspect(0); // 페이지 비율 초기화
        onClose();
    };

    if (!file) return null;

    const fileType = resolveFileType(file.name, detectedMime);

    // PDF 렌더 회전값(자체 회전 + 사용자 회전)을 0/90/180/270 으로 정규화한다.
    const effectivePdfRotation = (((pageBaseRotation + rotation) % 360) + 360) % 360;

    // 90/270도 회전 시에는 화면상 가로/세로가 뒤집힌다.
    const displayAspect = rotation % 180 === 0 ? pageAspect : pageAspect > 0 ? 1 / pageAspect : 0;

    // 뷰어 영역에 꽉 차는 기준 폭(=배율 100%)을 구한다. 실측 전에는 임시 기본값을 쓴다.
    const availableWidth = Math.max(viewerSize.width - PDF_VIEWER_GUTTER, PDF_MIN_RENDER_WIDTH);
    const availableHeight = Math.max(viewerSize.height - PDF_VIEWER_GUTTER, PDF_MIN_RENDER_WIDTH);
    const fitWidth =
        viewerSize.width > 0 && displayAspect > 0
            ? Math.min(availableWidth, availableHeight * displayAspect)
            : pdfOrientation === "portrait"
              ? 600
              : 800;

    // 실제 렌더 폭 = 화면에 맞춘 폭 × 사용자 배율 (이 값으로 다시 래스터화되어 확대해도 선명하다).
    // 단 캔버스는 devicePixelRatio 가 곱해지므로, 큰 화면 + 최대 배율에서 브라우저 캔버스
    // 한계를 넘어 렌더가 통째로 실패하지 않도록 상한을 건다.
    const devicePixelRatio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const maxRenderWidth =
        (PDF_MAX_CANVAS_PX / devicePixelRatio) * (displayAspect > 0 ? Math.min(1, displayAspect) : 1);
    const pdfRenderWidth = Math.round(Math.min(fitWidth * scale, maxRenderWidth));
    // 화면 표시 폭 — 렌더 해상도가 canvas 한계로 캡돼도 표시 크기는 배율대로 커진다
    // (캡을 넘는 구간은 canvas 를 CSS 로 늘려 보여준다 → 고배율에서 약간 소프트).
    const pdfDisplayWidth = Math.round(fitWidth * scale);
    const pdfDisplayOverscaled = pdfDisplayWidth > pdfRenderWidth;

    // 모바일 PDF 오버스크롤 여백: 문서 둘레에 (뷰포트 − 최소가시폭)만큼 스크롤 여백을 둬서
    // 핀치/스크롤로 문서를 구석까지 밀어둘 수 있게 한다(최소 PDF_OVERSCROLL_MIN_VISIBLE 은 남음).
    // 데스크탑은 휠=페이지넘김·fit 배율 무스크롤 UX 를 유지해야 하므로 적용하지 않는다.
    const pdfOverscrollX = Math.max(16, Math.round(viewerSize.width) - PDF_OVERSCROLL_MIN_VISIBLE);
    const pdfOverscrollY = Math.max(16, Math.round(viewerSize.height) - PDF_OVERSCROLL_MIN_VISIBLE);

    // PDF 방향성에 따른 동적 크기 계산
    const sidebarWidth = pdfOrientation === "landscape" ? "200px" : "150px";
    const thumbnailScale = pdfOrientation === "landscape" ? 0.18 : 0.17;

    /** PDF 페이지 썸네일 사이드바(데스크탑은 인라인, 모바일은 드로어에서 재사용). */
    const renderPdfThumbnails = () =>
        numPages ? (
            <Box
                ref={sidebarRef}
                sx={{
                    width: sidebarWidth,
                    height: "100%",
                    backgroundColor: "grey.200",
                    borderRight: "1px solid",
                    borderColor: "grey.300",
                    overflow: "auto",
                    p: 2,
                }}
            >
                {Array.from({ length: numPages }, (_, index) => (
                    <Box
                        key={index + 1}
                        ref={(el: HTMLDivElement | null) => {
                            thumbnailRefs.current[index] = el;
                        }}
                    >
                        <Box
                            sx={{
                                mb: 0,
                                p: 1,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                border: pageNumber === index + 1 ? "2px solid" : "1px solid",
                                borderColor: pageNumber === index + 1 ? "primary.main" : "grey.400",
                                borderRadius: 1,
                                overflow: "hidden",
                                backgroundColor: "white",
                                "&:hover": {
                                    borderColor: "primary.main",
                                },
                                aspectRatio: pdfOrientation === "landscape" ? "4 / 3" : "3 / 4",
                            }}
                            onClick={() => {
                                setPageNumber(index + 1);
                                // 모바일: 썸네일로 페이지 이동 시 드로어를 닫는다.
                                if (isMobile) setThumbnailDrawerOpen(false);
                            }}
                        >
                            <Document file={fileUrl} options={pdfOptions} loading={<div style={{ display: "none" }} />}>
                                <Page
                                    pageNumber={index + 1}
                                    scale={thumbnailScale}
                                    loading={<div style={{ display: "none" }} />}
                                    // 썸네일은 텍스트/주석 레이어가 필요 없다 — 레이어 CSS 의존을 없애고 렌더도 가볍게.
                                    renderAnnotationLayer={false}
                                    renderTextLayer={false}
                                />
                            </Document>
                        </Box>
                        <Typography
                            variant="caption"
                            sx={{
                                display: "block",
                                textAlign: "center",
                                p: 0.5,
                                mb: 1,
                                color: pageNumber === index + 1 ? "primary.main" : "",
                                fontWeight: pageNumber === index + 1 ? "bold" : "normal",
                            }}
                        >
                            {index + 1}
                        </Typography>
                    </Box>
                ))}
            </Box>
        ) : null;

    // 파일 내용 렌더링
    const renderFileContent = () => {
        // 엑셀 파일의 경우 워크시트 로딩만 사용하고 기본 로딩은 표시하지 않음
        const fileType = resolveFileType(file?.name || "", detectedMime);
        const isSpreadsheet = fileType === "spreadsheet";

        if (showLoading && !isSpreadsheet) {
            return (
                <Box
                    sx={{
                        display: "flex",
                        height: "100%",
                        width: "100%",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <LoadingProgress visible={loading} exitDelay={100} onComplete={handleLoadingComplete} />
                </Box>
            );
        }

        if (error) {
            return (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight={400} flexDirection="column">
                    <Typography color="error" variant="h6">
                        {error}
                    </Typography>
                    <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                        파일을 다운로드하여 확인해주세요.
                    </Typography>
                </Box>
            );
        }

        if (!fileUrl) return null;

        switch (fileType) {
            case "image":
                return (
                    <Box
                        ref={imageViewportRef}
                        // 확대/이동/핀치를 Pointer 로 직접 처리한다(SvgZoomViewer 와 동일 방식).
                        // 자체 핀치를 쓰므로 전역 핀치 차단(blockPinchGesture)에서 제외한다.
                        data-allow-pinch="true"
                        onPointerDown={handleImagePointerDown}
                        onPointerMove={handleImagePointerMove}
                        onPointerUp={handleImagePointerUp}
                        onPointerCancel={handleImagePointerUp}
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            minHeight: 400,
                            // 변환(transform)은 레이아웃 크기를 바꾸지 않아 스크롤이 생기지 않는다 —
                            // 넘치는 부분은 잘라내고 이동은 팬 제스처가 담당한다.
                            overflow: "hidden",
                            height: "100%",
                            backgroundColor: "grey.100", // PDF와 동일한 배경색
                            p: 2, // 패딩 추가
                            // 브라우저 기본 제스처(스크롤·확대)를 끄고 팬/핀치를 우리가 처리한다.
                            touchAction: "none",
                            overscrollBehavior: "contain",
                            userSelect: "none",
                            "&:active": { cursor: "grabbing" },
                        }}
                    >
                        <img
                            ref={attachImageContent}
                            src={fileUrl}
                            alt={file.name}
                            draggable={false}
                            style={{
                                maxWidth: "100%",
                                maxHeight: "100%",
                                objectFit: "contain",
                                display: "block",
                                // 변환값은 applyImageView 가 DOM style 로 직접 기록한다(리렌더 없이 손가락을 따라오게).
                                transform: "translate(0px, 0px) scale(1) rotate(0deg)",
                                transformOrigin: "center center",
                                pointerEvents: "none", // 드래그 중 이미지 선택 방지
                            }}
                        />
                    </Box>
                );

            case "pdf":
                return (
                    <>
                        <Box
                            ref={pdfOuterRef}
                            sx={{
                                width: "100%",
                                height: "calc(100vh - 60px)",
                                display: "flex",
                                backgroundColor: "grey.100",
                                // 핀치 확정 대기용 스냅샷(absolute·뷰포트 고정)의 기준 + 스냅샷이 영역 밖(헤더 등)을
                                // 덮지 않게 잘라낸다.
                                position: "relative",
                                overflow: "hidden",
                            }}
                        >
                            {/* 썸네일 사이드바 — 데스크탑은 인라인, 모바일은 헤더 메뉴 아이콘으로 여는 드로어(아래)로 표시. */}
                            {!isMobile && renderPdfThumbnails()}

                            {/* 메인 PDF 뷰어 */}
                            <Box
                                ref={attachPdfViewer}
                                className="draggable-scroll"
                                onMouseDown={(e) => {
                                    const element = e.currentTarget;
                                    handleMouseDown(e, element);
                                }}
                                // 모바일 두 손가락 핀치 줌 — SvgZoomViewer 방식(초점 고정 + DOM transform 직접 기록).
                                // canvas 재렌더가 무거우므로 핀치 중에는 미리보기 transform 만 주고 손을 뗄 때 확정한다.
                                data-allow-pinch="true"
                                onPointerDown={handlePdfPointerDown}
                                onPointerMove={handlePdfPointerMove}
                                onPointerUp={handlePdfPointerUp}
                                onPointerCancel={handlePdfPointerUp}
                                sx={{
                                    flex: 1,
                                    display: "flex",
                                    flexDirection: "column",
                                    overflow: "auto",
                                    height: "100%",
                                    // 데스크탑: 상하 숨통 패딩. 모바일: 오버스크롤 여백이 대신하고,
                                    // 뷰어 패딩이 있으면 핀치 이동 클램프(뷰어 경계 기준)와 어긋난다.
                                    py: isMobile ? 0 : 2,
                                    // 콘텐츠 크기가 바뀔 때 브라우저의 스크롤 자동보정(scroll anchoring)이
                                    // 핀치 확정의 수동 스크롤 보정과 겹쳐 이중 보정(흔들림)을 만든다 — 끈다.
                                    overflowAnchor: "none",
                                    // 두 손가락 제스처를 브라우저 기본 확대에 뺏기지 않고 우리가 처리한다(한 손가락 팬 스크롤은 유지).
                                    touchAction: "pan-x pan-y",
                                    // 확대로 컨텐츠가 넘칠 때 flex center 는 시작 부분을 잘라먹으므로
                                    // margin auto 로 가운데 정렬한다(넘치면 스크롤 가능).
                                    // 핀치 미리보기 transform 은 sx 가 아니라 핀치 핸들러가 안쪽 Page 의 DOM style 에
                                    // 직접 기록한다(매 move 리렌더 없이 손가락을 따라가게 — schedulePdfPinchApply 참고).
                                    // 모바일은 Document 에 오버스크롤 여백을 줘서 문서를 구석까지 밀 수 있게 한다.
                                    "& > .react-pdf__Document": {
                                        m: "auto",
                                        ...(isMobile && {
                                            px: `${pdfOverscrollX}px`,
                                            py: `${pdfOverscrollY}px`,
                                        }),
                                        // 렌더 해상도 캡을 넘는 배율: canvas 를 CSS 로 표시 폭까지 늘린다.
                                        // (react-pdf 가 canvas 에 inline width/height 를 박으므로 !important 필요)
                                        ...(pdfDisplayOverscaled && {
                                            "& .react-pdf__Page__canvas": {
                                                width: `${pdfDisplayWidth}px !important`,
                                                height: "auto !important",
                                            },
                                        }),
                                    },
                                }}
                            >
                                <Document
                                    file={fileUrl}
                                    onLoadSuccess={onDocumentLoadSuccess}
                                    onLoadError={(error) => {
                                        console.error("PDF 로드 오류:", error);
                                        setError("PDF 파일을 불러올 수 없습니다.");
                                    }}
                                    loading={<div style={{ display: "none" }} />} // 로딩 표시 숨김
                                    error={
                                        <Box sx={{ textAlign: "center", p: 4 }}>
                                            <Typography color="error" variant="h6" sx={{ mb: 2 }}>
                                                PDF를 불러올 수 없습니다.
                                            </Typography>
                                            <Typography color="text.secondary" variant="body2">
                                                파일을 다운로드하여 확인해주세요.
                                            </Typography>
                                        </Box>
                                    }
                                    options={pdfOptions}
                                >
                                    <Page
                                        pageNumber={pageNumber}
                                        width={pdfRenderWidth} // 뷰어 크기에 맞춘 실제 렌더 해상도(CSS 확대 아님)
                                        // 사용자가 회전하지 않았으면 넘기지 않는다. 넘기면 PDF 자체 회전값을
                                        // 덮어써, 로드 완료 전 첫 렌더에서 세로/가로가 잘못 잡힌다.
                                        rotate={rotation === 0 ? undefined : effectivePdfRotation}
                                        loading={<div style={{ display: "none" }} />} // 페이지 로딩 표시 숨김
                                        renderAnnotationLayer={false} // 드래그와 충돌 방지
                                        renderTextLayer={false} // 드래그와 충돌 방지
                                        onLoadSuccess={onPageLoadSuccess} // 페이지 로드 시 방향성 검사
                                        // 새 배율의 canvas 가 실제로 그려진 시점 — 이때 스크롤 앵커 복원 + 미리보기 해제
                                        onRenderSuccess={handlePageRenderSuccess}
                                        // 렌더 실패 시에도 같은 복원을 태워 스냅샷/숨김이 영영 안 걷히는 것을 방지
                                        // (취소(Abort)는 react-pdf 가 삼키고 새 렌더가 이어지므로 여기 안 온다)
                                        onRenderError={handlePageRenderSuccess}
                                    />
                                </Document>
                            </Box>
                        </Box>
                        {/* 모바일: 페이지 썸네일을 왼쪽 드로어로 표시(헤더 메뉴 아이콘 토글).
                        fullScreen Dialog(zIndex modal) 위에 뜨도록 zIndex 를 한 단계 올린다. */}
                        {isMobile && (
                            <Drawer
                                anchor="left"
                                open={thumbnailDrawerOpen}
                                onClose={() => setThumbnailDrawerOpen(false)}
                                sx={{ zIndex: (theme) => theme.zIndex.modal + 2 }}
                            >
                                {renderPdfThumbnails()}
                            </Drawer>
                        )}
                    </>
                );

            case "text":
            case "code":
                return (
                    <Box
                        sx={{
                            width: "100%",
                            height: "calc(100vh - 60px)",
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        {textContent ? (
                            <Box
                                sx={{
                                    flex: 1,
                                    height: "100%",
                                    overflow: "hidden",
                                }}
                            >
                                <Editor
                                    height="100%"
                                    language={getEditorLanguage(file.name)}
                                    value={textContent}
                                    theme="vs-dark"
                                    loading={false}
                                    options={{
                                        readOnly: true,
                                        domReadOnly: true, // DOM 레벨에서도 읽기 전용으로 설정
                                        minimap: { enabled: true },
                                        scrollBeyondLastLine: false,
                                        automaticLayout: true,
                                        folding: true,
                                        foldingHighlight: false, // 폴딩 하이라이트 비활성화
                                        formatOnPaste: true,
                                        formatOnType: true,
                                        wordWrap: "on",
                                        lineNumbers: "on",
                                        lineNumbersMinChars: 4, // 라인 번호 영역 최소 너비
                                        glyphMargin: false, // 글리프 마진 비활성화로 공간 절약
                                        renderLineHighlight: "none", // 라인 하이라이트 제거
                                        renderWhitespace: "selection",
                                        fontFamily: "'Roboto', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
                                        fontSize: textFontSize,
                                        lineHeight: Math.round(textFontSize * 1.5),
                                        scrollbar: {
                                            vertical: "auto",
                                            horizontal: "auto",
                                        },
                                        // 라인 번호와 내용 사이 구분선 스타일
                                        lineDecorationsWidth: 10, // 라인 데코레이션 영역 너비
                                    }}
                                    onMount={(editor, _monaco) => {
                                        // 읽기 전용 모드에서 에러 메시지 억제
                                        editor.onDidAttemptReadOnlyEdit(() => {
                                            // 아무것도 하지 않음 (에러 메시지 표시 안함)
                                        });

                                        // 라인 번호와 내용 영역 사이에 구분선 추가
                                        const editorElement = editor.getDomNode();
                                        if (editorElement) {
                                            const style = document.createElement("style");
                                            style.textContent = `
                                                .monaco-editor .margin-view-overlays {
                                                    border-right: 1px solid #3c3c3c;
                                                }
                                                .monaco-editor.vs-dark .margin-view-overlays {
                                                    border-right: 1px solid #3c3c3c;
                                                }
                                                .monaco-editor.vs .margin-view-overlays {
                                                    border-right: 1px solid #d4d4d4;
                                                }
                                                .monaco-editor .view-lines {
                                                    padding-left: 15px !important;
                                                }
                                                .monaco-editor .monaco-editor-background {
                                                    padding-left: 15px !important;
                                                }
                                                .monaco-editor .view-line {
                                                    padding-left: 0 !important;
                                                }
                                                .monaco-editor .cursor {
                                                    margin-left: 15px !important;
                                                }
                                                .monaco-editor .cursors-layer {
                                                    padding-left: 15px !important;
                                                }
                                                .monaco-editor .overlay.cursor-layer {
                                                    padding-left: 15px !important;
                                                }
                                            `;
                                            editorElement.appendChild(style);
                                        }
                                    }}
                                />
                            </Box>
                        ) : (
                            <Box
                                sx={{
                                    height: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <Typography color="text.secondary">파일을 읽을 수 없습니다.</Typography>
                            </Box>
                        )}
                    </Box>
                );

            case "html":
                return (
                    <Box
                        sx={{
                            width: "100%",
                            // 명시 높이가 없으면 내부 height:100% → Monaco height:100% 가 기준을 잃고
                            // 소스코드 모드 에디터가 얇은 띠로 붕괴한다 — 다른 타입과 같은 고정 높이를 준다.
                            height: "calc(100vh - 60px)",
                            overflow: "hidden",
                            borderRadius: 1,
                        }}
                    >
                        {htmlContent ? (
                            <Box
                                sx={{
                                    width: "100%",
                                    height: "100%",
                                    display: "flex",
                                    flexDirection: "column",
                                }}
                            >
                                {/* HTML 뷰 모드 전환 버튼 */}
                                <Box
                                    sx={{
                                        display: "flex",
                                        gap: 1,
                                        p: 1,
                                        borderBottom: "1px solid",
                                        borderColor: "grey.300",
                                        backgroundColor: "grey.50",
                                    }}
                                >
                                    <Button
                                        variant={htmlViewMode === "preview" ? "contained" : "outlined"}
                                        size="small"
                                        onClick={() => setHtmlViewMode("preview")}
                                    >
                                        미리보기
                                    </Button>
                                    <Button
                                        variant={htmlViewMode === "source" ? "contained" : "outlined"}
                                        size="small"
                                        onClick={() => setHtmlViewMode("source")}
                                    >
                                        소스코드
                                    </Button>
                                </Box>

                                {/* HTML 콘텐츠 */}
                                {htmlViewMode === "preview" ? (
                                    <Box
                                        sx={{
                                            flex: 1,
                                            overflow: "auto",
                                            backgroundColor: "white",
                                            border: "1px solid",
                                            borderColor: "grey.300",
                                            fontSize: `${textFontSize}px`,
                                            p: 2,
                                        }}
                                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                                    />
                                ) : (
                                    <Box
                                        sx={{
                                            flex: 1,
                                            height: "100%",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <Editor
                                            height="100%"
                                            language="html"
                                            value={htmlContent}
                                            theme="vs-dark"
                                            options={{
                                                readOnly: true,
                                                domReadOnly: true, // DOM 레벨에서도 읽기 전용으로 설정
                                                minimap: { enabled: true },
                                                scrollBeyondLastLine: false,
                                                automaticLayout: true,
                                                folding: true,
                                                foldingHighlight: false, // 폴딩 하이라이트 비활성화
                                                wordWrap: "on",
                                                lineNumbers: "on",
                                                lineNumbersMinChars: 4, // 라인 번호 영역 최소 너비
                                                glyphMargin: false, // 글리프 마진 비활성화로 공간 절약
                                                renderLineHighlight: "none", // 라인 하이라이트 제거
                                                renderWhitespace: "selection",
                                                fontFamily: "'Roboto', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
                                                fontSize: textFontSize,
                                                lineHeight: Math.round(textFontSize * 1.5),
                                                scrollbar: {
                                                    vertical: "auto",
                                                    horizontal: "auto",
                                                },
                                                // 라인 번호와 내용 사이 구분선 스타일
                                                lineDecorationsWidth: 10, // 라인 데코레이션 영역 너비
                                            }}
                                            onMount={(editor, _monaco) => {
                                                // 읽기 전용 모드에서 에러 메시지 억제
                                                editor.onDidAttemptReadOnlyEdit(() => {
                                                    // 아무것도 하지 않음 (에러 메시지 표시 안함)
                                                });

                                                // 라인 번호와 내용 영역 사이에 구분선 추가
                                                const editorElement = editor.getDomNode();
                                                if (editorElement) {
                                                    const style = document.createElement("style");
                                                    style.textContent = `
                                                        .monaco-editor .margin-view-overlays {
                                                            border-right: 1px solid #3c3c3c;
                                                        }
                                                        .monaco-editor.vs-dark .margin-view-overlays {
                                                            border-right: 1px solid #3c3c3c;
                                                        }
                                                        .monaco-editor.vs .margin-view-overlays {
                                                            border-right: 1px solid #d4d4d4;
                                                        }
                                                        .monaco-editor .view-lines {
                                                            padding-left: 15px !important;
                                                        }
                                                        .monaco-editor .monaco-editor-background {
                                                            padding-left: 15px !important;
                                                        }
                                                        .monaco-editor .view-line {
                                                            padding-left: 0 !important;
                                                        }
                                                        .monaco-editor .cursor {
                                                            margin-left: 15px !important;
                                                        }
                                                        .monaco-editor .cursors-layer {
                                                            padding-left: 15px !important;
                                                        }
                                                        .monaco-editor .overlay.cursor-layer {
                                                            padding-left: 15px !important;
                                                        }
                                                    `;
                                                    editorElement.appendChild(style);
                                                }
                                            }}
                                        />
                                    </Box>
                                )}
                            </Box>
                        ) : (
                            <Box
                                sx={{
                                    backgroundColor: "white",
                                    p: 2,
                                    borderRadius: 1,
                                    border: "1px solid",
                                    borderColor: "grey.300",
                                    minHeight: "400px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <Typography color="text.secondary">HTML 파일을 읽을 수 없습니다.</Typography>
                            </Box>
                        )}
                    </Box>
                );

            case "video":
                return (
                    <Box
                        className="draggable-scroll"
                        onMouseDown={(e) => {
                            const element = e.currentTarget;
                            handleMouseDown(e, element);
                        }}
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            minHeight: 400,
                            overflow: "auto",
                        }}
                    >
                        <video
                            src={fileUrl}
                            controls
                            style={{
                                maxWidth: "100%",
                                maxHeight: "70vh",
                                transform: `scale(${scale}) rotate(${rotation}deg)`,
                                transition: "transform 0.3s ease",
                                pointerEvents: scale > 1 ? "none" : "auto", // 확대 시에만 드래그 가능
                            }}
                        >
                            브라우저가 비디오를 지원하지 않습니다.
                        </video>
                    </Box>
                );

            case "spreadsheet":
                return (
                    <Box
                        sx={{
                            width: "100%",
                            height: "calc(100vh - 60px)", // 전체 높이에서 헤더 높이 제외
                            display: "flex",
                            flexDirection: "column",
                            overflow: "hidden",
                        }}
                    >
                        {/* 스프레드시트 데이터 */}
                        {spreadsheetData.length > 0 || worksheetLoading ? (
                            <Box
                                sx={{
                                    flex: 1,
                                    position: "relative",
                                    overflow: "scroll", // 가로세로 스크롤 활성화
                                    backgroundColor: "white",
                                    minHeight: "400px", // 최소 높이 확보
                                    minWidth: "100%", // 최소 너비 확보
                                    // 스크롤바 스타일 커스터마이징 (더 큰 스크롤바로 조작성 향상)
                                    "&::-webkit-scrollbar": {
                                        width: "18px",
                                        height: "18px",
                                    },
                                    "&::-webkit-scrollbar-track": {
                                        backgroundColor: "#f1f1f1",
                                        borderRadius: "10px",
                                    },
                                    "&::-webkit-scrollbar-thumb": {
                                        backgroundColor: "#888",
                                        borderRadius: "10px",
                                        border: "2px solid #f1f1f1",
                                        "&:hover": {
                                            backgroundColor: "#555",
                                        },
                                    },
                                    "&::-webkit-scrollbar-corner": {
                                        backgroundColor: "#f1f1f1",
                                    },
                                }}
                            >
                                {spreadsheetData.length > 0 && (
                                    <Box
                                        sx={{
                                            minWidth: "max-content", // 콘텐츠 너비에 맞게 확장
                                            minHeight: "max-content", // 콘텐츠 높이에 맞게 확장
                                        }}
                                    >
                                        <Spreadsheet data={spreadsheetData} darkMode={false} />
                                    </Box>
                                )}
                                {/* 워크시트 전환 로딩 - 절대 위치로 중앙 배치 */}
                                {worksheetLoading && (
                                    <Box
                                        sx={{
                                            position: "absolute",
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            backgroundColor: "rgba(255, 255, 255, 0.8)",
                                            zIndex: 1000,
                                        }}
                                    >
                                        <LoadingProgress
                                            visible={loadingVisible}
                                            exitDelay={200}
                                            fadeoutDuration={300}
                                            onComplete={handleWorksheetLoadingComplete}
                                        />
                                    </Box>
                                )}
                            </Box>
                        ) : (
                            <Box
                                sx={{
                                    flex: 1,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <Typography color="text.secondary">
                                    스프레드시트 데이터를 불러올 수 없습니다.
                                </Typography>
                            </Box>
                        )}

                        {/* 워크시트 탭 - 하단으로 이동 */}
                        {worksheetNames.length > 1 && (
                            <Box
                                sx={{
                                    borderTop: 1,
                                    borderColor: "divider",
                                    backgroundColor: "#e0e0e0",
                                    padding: "0 8px 8px 8px",
                                }}
                            >
                                <Tabs
                                    value={selectedWorksheet}
                                    onChange={(_, newValue) => handleWorksheetChange(newValue)}
                                    variant="scrollable"
                                    scrollButtons="auto"
                                    sx={{
                                        minHeight: "36px",
                                        "& .MuiTabs-flexContainer": {
                                            gap: "6px",
                                        },
                                        "& .MuiTabs-indicator": {
                                            display: "none", // 기본 indicator 숨김
                                        },
                                        "& .MuiTab-root": {
                                            minHeight: "32px",
                                            fontSize: "0.875rem",
                                            textTransform: "none",
                                            padding: "6px 16px",
                                            margin: "0",
                                            backgroundColor: "white",
                                            border: "1px solid #d0d0d0",
                                            borderRadius: "0 0 4px 4px",
                                            color: "#666",
                                            minWidth: "80px",
                                            transition: "all 0.2s ease",
                                            "&:hover": {
                                                backgroundColor: "#f8f8f8",
                                                color: "#333",
                                            },
                                            "&.Mui-selected": {
                                                backgroundColor: "primary.main",
                                                color: "white",
                                                border: "1px solid",
                                                borderColor: "primary.dark",
                                                fontWeight: 600,
                                                "&:hover": {
                                                    backgroundColor: "primary.dark",
                                                },
                                            },
                                        },
                                    }}
                                >
                                    {worksheetNames.map((sheetName) => (
                                        <Tab key={sheetName} label={sheetName} value={sheetName} />
                                    ))}
                                </Tabs>
                            </Box>
                        )}
                    </Box>
                );

            case "audio":
                return (
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            minHeight: 400,
                            flexDirection: "column",
                        }}
                    >
                        <Typography variant="h6" sx={{ mb: 2 }}>
                            {file.name}
                        </Typography>
                        <audio
                            src={fileUrl}
                            controls
                            style={{
                                width: "100%",
                                maxWidth: "500px",
                            }}
                        >
                            브라우저가 오디오를 지원하지 않습니다.
                        </audio>
                    </Box>
                );

            default:
                return (
                    <Box
                        display="flex"
                        justifyContent="center"
                        alignItems="center"
                        minHeight={400}
                        flexDirection="column"
                    >
                        <Typography variant="h6" color="text.secondary">
                            미리보기를 지원하지 않는 파일 형식입니다
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            파일을 다운로드하여 확인해주세요.
                        </Typography>
                    </Box>
                );
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="lg" fullScreen>
            <DialogTitle
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: "grey.800",
                    color: "white",
                    height: "60px",
                    // 본문 높이 계산(calc(100vh - 60px))의 기준 — 전역 리셋(CssBaseline) 없이
                    // content-box 로 렌더되면 패딩만큼 60px 를 넘어 하단(시트 탭 등)이 잘린다.
                    boxSizing: "border-box",
                    userSelect: "none",
                    // 모바일: 좌우 패딩을 줄여 메뉴 아이콘/닫기 버튼이 화면 끝에 붙게 한다.
                    px: isMobile ? 1 : 3,
                }}
                onContextMenu={(e) => e.preventDefault()} // 우클릭 방지
            >
                {/* 헤더 왼쪽: 메뉴(모바일 — 썸네일 드로어) + 페이지 네비게이션. */}
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: isNarrow ? 0.35 : 1,
                        flexShrink: 0,
                        "& .MuiSvgIcon-root": { fontSize: isMobile ? "1.7rem" : undefined },
                    }}
                >
                    {/* 다중 파일 탐색 — ◀ n/m ▶ (여러 파일을 넘겨받았을 때만) */}
                    {fileList.length > 1 ? (
                        <Box sx={{ display: "flex", alignItems: "center", gap: isMobile ? 0 : 0.5 }}>
                            <Tooltip title="이전 파일">
                                <span style={{ display: "inline-flex" }}>
                                    <IconButton
                                        onClick={() => setFileIndex((index) => Math.max(index - 1, 0))}
                                        disabled={fileIndex <= 0}
                                        size="medium"
                                        sx={{
                                            color: "grey.300",
                                            "&:hover": { color: "white", backgroundColor: "rgba(255, 255, 255, 0.08)" },
                                            "&.Mui-disabled": { color: "rgba(255, 255, 255, 0.3)" },
                                        }}
                                    >
                                        <KeyboardArrowLeftIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <Typography variant="body2" sx={{ color: "grey.300", minWidth: 40, textAlign: "center", userSelect: "none" }}>
                                {fileIndex + 1} / {fileList.length}
                            </Typography>
                            <Tooltip title="다음 파일">
                                <span style={{ display: "inline-flex" }}>
                                    <IconButton
                                        onClick={() => setFileIndex((index) => Math.min(index + 1, fileList.length - 1))}
                                        disabled={fileIndex >= fileList.length - 1}
                                        size="medium"
                                        sx={{
                                            color: "grey.300",
                                            "&:hover": { color: "white", backgroundColor: "rgba(255, 255, 255, 0.08)" },
                                            "&.Mui-disabled": { color: "rgba(255, 255, 255, 0.3)" },
                                        }}
                                    >
                                        <KeyboardArrowRightIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Box>
                    ) : null}
                    {isMobile && fileType === "pdf" && numPages ? (
                        <Tooltip title="페이지 목록">
                            <IconButton
                                onClick={() => setThumbnailDrawerOpen((prev) => !prev)}
                                size="medium"
                                sx={{ color: "grey.300", "&:hover": { color: "white" } }}
                            >
                                <MenuIcon />
                            </IconButton>
                        </Tooltip>
                    ) : null}
                    {fileType === "pdf" && numPages ? (
                        <Box sx={{ display: "flex", alignItems: "center", gap: isMobile ? 0 : 0.5 }}>
                            {/* disabled 버튼은 이벤트가 없어 Tooltip 이 직접 못 붙는다 — span 으로 감싼다. */}
                            <Tooltip title="이전 페이지">
                                <span style={{ display: "inline-flex" }}>
                                    <IconButton
                                        onClick={goToPrevPage}
                                        disabled={pageNumber <= 1}
                                        size="medium"
                                        sx={{
                                            color: "grey.300",
                                            "&:hover": {
                                                color: "white",
                                                backgroundColor: "rgba(255, 255, 255, 0.08)",
                                                transform: "scale(1.1)",
                                            },
                                            // MUI 기본 disabled 색은 검정 계열이라 어두운 헤더에서 안 보여
                                            // 버튼이 사라진 것처럼 보인다 — 흐린 흰색으로 항상 보이게 한다.
                                            // (hover 뒤에 둬서 터치 탭 후 남는 hover 잔상보다 우선)
                                            "&.Mui-disabled": { color: "rgba(255, 255, 255, 0.3)" },
                                            transition: "all 0.2s ease-in-out",
                                        }}
                                    >
                                        <KeyboardArrowLeftIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <Typography
                                variant="body2"
                                sx={{
                                    minWidth: isMobile ? "auto" : "80px",
                                    textAlign: "center",
                                    color: "white",
                                    px: isMobile ? 0.5 : 1,
                                    fontSize: isMobile ? "1.05rem" : undefined,
                                    fontWeight: isMobile ? 600 : undefined,
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {isNarrow ? pageNumber : `${pageNumber} / ${numPages}`}
                            </Typography>
                            <Tooltip title="다음 페이지">
                                <span style={{ display: "inline-flex" }}>
                                    <IconButton
                                        onClick={goToNextPage}
                                        disabled={pageNumber >= numPages}
                                        size="medium"
                                        sx={{
                                            color: "grey.300",
                                            "&:hover": {
                                                color: "white",
                                                backgroundColor: "rgba(255, 255, 255, 0.08)",
                                                transform: "scale(1.1)",
                                            },
                                            // 위 이전 페이지 버튼과 동일 — 어두운 배경에서도 흐리게 보이는 비활성색
                                            "&.Mui-disabled": { color: "rgba(255, 255, 255, 0.3)" },
                                            transition: "all 0.2s ease-in-out",
                                        }}
                                    >
                                        <KeyboardArrowRightIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Box>
                    ) : null}
                </Box>
                {/* 파일 아이콘 + 이름 — sm 이하에서는 숨긴다(공간 확보). flexGrow 스페이서는 유지해 툴바를 오른쪽에 붙인다. */}
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        flexGrow: 1,
                        mr: isNarrow ? 0 : 2,
                        overflow: "hidden",
                    }}
                >
                    {!isNarrow && (
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 1.5,
                                fontSize: "1rem",
                            }}
                        >
                            {getFileIcon(fileType)}
                            {file.name}
                        </Box>
                    )}
                </Box>

                {/* 툴바 — sm 이하에서 아이콘 간격을 좁힌다. */}
                <Box
                    className="toolbar"
                    sx={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: isNarrow ? 0.35 : 1,
                        // 모바일: 툴바 아이콘 글리프를 조금 키운다.
                        "& .MuiSvgIcon-root": { fontSize: isMobile ? "1.7rem" : undefined },
                    }}
                >
                    {/* 페이지 네비게이션은 헤더 왼쪽(메뉴 옆)으로 이동, 세로 구분선 제거.
                        ⚠️ 확대/축소(+/-) 버튼은 모바일에서 핀치 줌이 되는 타입(이미지·PDF)만 숨긴다.
                        텍스트/HTML/코드/스프레드시트는 핀치가 없으므로 숨기면 확대 수단이 통째로 사라진다. */}
                    {(fileType === "image" ||
                        fileType === "pdf" ||
                        fileType === "text" ||
                        fileType === "html" ||
                        fileType === "code" ||
                        fileType === "spreadsheet") && (
                        <>
                            {!(isMobile && (fileType === "image" || fileType === "pdf")) && (
                                <>
                                    <Tooltip title="확대">
                                        <IconButton
                                            onClick={handleZoomIn}
                                            size="medium"
                                            sx={{
                                                color: "grey.300",
                                                "&:hover": {
                                                    color: "white",
                                                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                                                    transform: "scale(1.1)",
                                                },
                                                transition: "all 0.2s ease-in-out",
                                            }}
                                        >
                                            <AddIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="축소">
                                        <IconButton
                                            onClick={handleZoomOut}
                                            size="medium"
                                            sx={{
                                                color: "grey.300",
                                                "&:hover": {
                                                    color: "white",
                                                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                                                    transform: "scale(1.1)",
                                                },
                                                transition: "all 0.2s ease-in-out",
                                            }}
                                        >
                                            <RemoveIcon />
                                        </IconButton>
                                    </Tooltip>
                                </>
                            )}
                            {!isMobile && (
                                <Tooltip title="화면에 맞추기">
                                    <IconButton
                                        onClick={handleFitScreen}
                                        size="medium"
                                        sx={{
                                            color: "grey.300",
                                            "&:hover": {
                                                color: "white",
                                                backgroundColor: "rgba(255, 255, 255, 0.08)",
                                                transform: "scale(1.1)",
                                            },
                                            transition: "all 0.2s ease-in-out",
                                        }}
                                    >
                                        <FitScreenIcon />
                                    </IconButton>
                                </Tooltip>
                            )}
                            {/* 이미지와 PDF 파일일 때만 회전 버튼 표시(데스크탑). 모바일은 MoreHoriz 메뉴로 접는다. */}
                            {!isMobile && (fileType === "image" || fileType === "pdf") && (
                                <>
                                    <Tooltip title="왼쪽으로 회전">
                                        <IconButton
                                            onClick={handleRotateLeft}
                                            size="medium"
                                            sx={{
                                                color: "grey.300",
                                                "&:hover": {
                                                    color: "white",
                                                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                                                    transform: "scale(1.1)",
                                                },
                                                transition: "all 0.2s ease-in-out",
                                            }}
                                        >
                                            <RotateLeftIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="오른쪽으로 회전">
                                        <IconButton
                                            onClick={handleRotateRight}
                                            size="medium"
                                            sx={{
                                                color: "grey.300",
                                                "&:hover": {
                                                    color: "white",
                                                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                                                    transform: "scale(1.1)",
                                                },
                                                transition: "all 0.2s ease-in-out",
                                            }}
                                        >
                                            <RotateRightIcon />
                                        </IconButton>
                                    </Tooltip>
                                </>
                            )}
                        </>
                    )}

                    {/* 다운로드: 데스크탑은 인라인, 모바일은 아래 MoreHoriz 메뉴로 접는다. */}
                    {!isMobile && (
                        <Tooltip title="다운로드">
                            <IconButton
                                onClick={handleDownload}
                                size="medium"
                                sx={{
                                    color: "grey.300",
                                    "&:hover": {
                                        color: "white",
                                        backgroundColor: "rgba(255, 255, 255, 0.08)",
                                        transform: "scale(1.1)",
                                    },
                                    transition: "all 0.2s ease-in-out",
                                }}
                            >
                                <DownloadIcon />
                            </IconButton>
                        </Tooltip>
                    )}

                    {/* 모바일: 폭이 좁아 회전/다운로드를 접는 MoreHoriz 오버플로 메뉴. */}
                    {isMobile && (
                        <>
                            <Tooltip title="더보기">
                                <IconButton
                                    onClick={(e) => setMoreMenuAnchor(e.currentTarget)}
                                    size="medium"
                                    sx={{ color: "grey.300", "&:hover": { color: "white" } }}
                                >
                                    <MoreHorizIcon />
                                </IconButton>
                            </Tooltip>
                            <Menu
                                anchorEl={moreMenuAnchor}
                                open={Boolean(moreMenuAnchor)}
                                onClose={() => setMoreMenuAnchor(null)}
                            >
                                {/* 모바일은 +/- 버튼을 숨기고 핀치 줌만 쓰므로, 배율을 되돌릴 수단을 여기 남긴다. */}
                                {fileType === "image" || fileType === "pdf" ? (
                                    <MenuItem
                                        onClick={() => {
                                            handleFitScreen();
                                            setMoreMenuAnchor(null);
                                        }}
                                    >
                                        <ListItemIcon>
                                            <FitScreenIcon fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText>화면에 맞추기</ListItemText>
                                    </MenuItem>
                                ) : null}
                                {fileType === "image" || fileType === "pdf" ? (
                                    <MenuItem
                                        onClick={() => {
                                            handleRotateLeft();
                                            setMoreMenuAnchor(null);
                                        }}
                                    >
                                        <ListItemIcon>
                                            <RotateLeftIcon fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText>왼쪽으로 회전</ListItemText>
                                    </MenuItem>
                                ) : null}
                                {fileType === "image" || fileType === "pdf" ? (
                                    <MenuItem
                                        onClick={() => {
                                            handleRotateRight();
                                            setMoreMenuAnchor(null);
                                        }}
                                    >
                                        <ListItemIcon>
                                            <RotateRightIcon fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText>오른쪽으로 회전</ListItemText>
                                    </MenuItem>
                                ) : null}
                                <MenuItem
                                    onClick={() => {
                                        handleDownload();
                                        setMoreMenuAnchor(null);
                                    }}
                                >
                                    <ListItemIcon>
                                        <DownloadIcon fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText>다운로드</ListItemText>
                                </MenuItem>
                            </Menu>
                        </>
                    )}

                    <Tooltip title="닫기">
                        <IconButton
                            onClick={handleClose}
                            size="medium"
                            sx={{
                                color: "grey.300",
                                "&:hover": {
                                    color: "white",
                                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                                    transform: "scale(1.1)",
                                },
                                transition: "all 0.2s ease-in-out",
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            </DialogTitle>
            {/* 다중 파일 — 본문 좌우 오버레이 화살표(헤더 ◀ n/m ▶ 와 같은 탐색). 끝에서는 해당 방향을 숨긴다. */}
            {fileList.length > 1 && fileIndex > 0 ? (
                <IconButton
                    aria-label="이전 파일"
                    onClick={() => setFileIndex((index) => Math.max(index - 1, 0))}
                    sx={{
                        position: "fixed",
                        left: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        zIndex: 10,
                        color: "white",
                        backgroundColor: "rgba(0, 0, 0, 0.35)",
                        "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.55)" },
                        width: 44,
                        height: 44,
                    }}
                >
                    <KeyboardArrowLeftIcon sx={{ fontSize: 30 }} />
                </IconButton>
            ) : null}
            {fileList.length > 1 && fileIndex < fileList.length - 1 ? (
                <IconButton
                    aria-label="다음 파일"
                    onClick={() => setFileIndex((index) => Math.min(index + 1, fileList.length - 1))}
                    sx={{
                        position: "fixed",
                        right: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        zIndex: 10,
                        color: "white",
                        backgroundColor: "rgba(0, 0, 0, 0.35)",
                        "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.55)" },
                        width: 44,
                        height: 44,
                    }}
                >
                    <KeyboardArrowRightIcon sx={{ fontSize: 30 }} />
                </IconButton>
            ) : null}

            <DialogContent
                sx={{
                    p: "0 !important",
                    overflow: "hidden",
                    userSelect: "none",
                }}
                onContextMenu={(e) => e.preventDefault()}
            >
                {renderFileContent()}
            </DialogContent>

            {/* Ctrl+C 이미지 복사 결과 안내 */}
            <Snackbar
                open={Boolean(copyNotice)}
                autoHideDuration={2000}
                onClose={() => setCopyNotice("")}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                message={copyNotice}
                sx={{ "& .MuiSnackbarContent-message": { fontSize: "0.95rem" } }}
            />
        </Dialog>
    );
};

export default FileViewer;
