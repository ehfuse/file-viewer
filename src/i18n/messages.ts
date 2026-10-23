/** 뷰어가 기본으로 아는 화면 언어 */
export type ViewerLocale = "ko" | "en" | "ja" | "mn" | "kk";

/** 뷰어 화면 문구 */
export interface ViewerLabels {
    back: string; // 뒤로(폰 닫기)
    close: string; // 닫기
    prevFile: string; // 이전 파일
    nextFile: string; // 다음 파일
    pageList: string; // 페이지 목록
    prevPage: string; // 이전 페이지
    nextPage: string; // 다음 페이지
    zoomIn: string; // 확대
    zoomOut: string; // 축소
    fitToScreen: string; // 화면에 맞추기
    rotateLeft: string; // 왼쪽으로 회전
    rotateRight: string; // 오른쪽으로 회전
    download: string; // 다운로드
    share: string; // 공유
    print: string; // 인쇄
    unsupported: string; // 미리보기를 지원하지 않는 형식
    downloadToCheck: string; // 내려받아 확인하라는 안내
    loadFailed: string; // 파일을 불러올 수 없음
    previewFailed: string; // 미리보기를 만들지 못함(변환 실패)
    pdfLoadFailed: string; // PDF 파일을 불러올 수 없음(오류 줄)
    pdfCannotLoad: string; // PDF 를 불러올 수 없음(문서 자리)
    pdfPasswordNeeded: string; // 암호가 걸린 PDF
    pdfPasswordWrong: string; // 암호가 틀림
    pdfPassword: string; // PDF 암호 칸 이름
    open: string; // 열기
    cannotReadFile: string; // 텍스트 파일을 읽을 수 없음
    cannotReadHtml: string; // HTML 파일을 읽을 수 없음
    htmlPreview: string; // HTML 미리보기 단추
    htmlSource: string; // HTML 소스코드 단추
    videoUnsupported: string; // 브라우저가 비디오를 지원하지 않음
    audioUnsupported: string; // 브라우저가 오디오를 지원하지 않음
    spreadsheetFailed: string; // 스프레드시트를 불러올 수 없음
    imageCopied: string; // 이미지를 클립보드에 복사함
    imageCopyFailed: string; // 이미지를 복사할 수 없음
}

/** 언어별 기본 문구 */
export const VIEWER_MESSAGES: Record<ViewerLocale, ViewerLabels> = {
    ko: {
        back: "뒤로", close: "닫기", prevFile: "이전 파일", nextFile: "다음 파일", pageList: "페이지 목록", prevPage: "이전 페이지", nextPage: "다음 페이지",
        zoomIn: "확대", zoomOut: "축소", fitToScreen: "화면에 맞추기", rotateLeft: "왼쪽으로 회전", rotateRight: "오른쪽으로 회전", download: "다운로드", share: "공유", print: "인쇄",
        unsupported: "미리보기를 지원하지 않는 파일 형식입니다", downloadToCheck: "파일을 다운로드하여 확인해주세요.", loadFailed: "파일을 불러올 수 없습니다.",
        previewFailed: "미리보기를 만들지 못했습니다.", pdfLoadFailed: "PDF 파일을 불러올 수 없습니다.", pdfCannotLoad: "PDF를 불러올 수 없습니다.",
        pdfPasswordNeeded: "암호가 걸린 PDF 입니다", pdfPasswordWrong: "암호가 맞지 않습니다", pdfPassword: "PDF 암호", open: "열기",
        cannotReadFile: "파일을 읽을 수 없습니다.", cannotReadHtml: "HTML 파일을 읽을 수 없습니다.", htmlPreview: "미리보기", htmlSource: "소스코드",
        videoUnsupported: "브라우저가 비디오를 지원하지 않습니다.", audioUnsupported: "브라우저가 오디오를 지원하지 않습니다.",
        spreadsheetFailed: "스프레드시트 데이터를 불러올 수 없습니다.", imageCopied: "이미지를 클립보드에 복사했습니다.", imageCopyFailed: "이미지를 복사할 수 없습니다.",
    },
    en: {
        back: "Back", close: "Close", prevFile: "Previous file", nextFile: "Next file", pageList: "Pages", prevPage: "Previous page", nextPage: "Next page",
        zoomIn: "Zoom in", zoomOut: "Zoom out", fitToScreen: "Fit to screen", rotateLeft: "Rotate left", rotateRight: "Rotate right", download: "Download", share: "Share", print: "Print",
        unsupported: "Preview is not available for this file type", downloadToCheck: "Please download the file to view it.", loadFailed: "Could not load the file.",
        previewFailed: "Could not create a preview.", pdfLoadFailed: "Could not load the PDF file.", pdfCannotLoad: "Could not load the PDF.",
        pdfPasswordNeeded: "This PDF is password-protected", pdfPasswordWrong: "The password is incorrect", pdfPassword: "PDF password", open: "Open",
        cannotReadFile: "Could not read the file.", cannotReadHtml: "Could not read the HTML file.", htmlPreview: "Preview", htmlSource: "Source",
        videoUnsupported: "Your browser does not support video.", audioUnsupported: "Your browser does not support audio.",
        spreadsheetFailed: "Could not load the spreadsheet data.", imageCopied: "Image copied to the clipboard.", imageCopyFailed: "Could not copy the image.",
    },
    ja: {
        back: "戻る", close: "閉じる", prevFile: "前のファイル", nextFile: "次のファイル", pageList: "ページ一覧", prevPage: "前のページ", nextPage: "次のページ",
        zoomIn: "拡大", zoomOut: "縮小", fitToScreen: "画面に合わせる", rotateLeft: "左に回転", rotateRight: "右に回転", download: "ダウンロード", share: "共有", print: "印刷",
        unsupported: "このファイル形式はプレビューできません", downloadToCheck: "ファイルをダウンロードしてご確認ください。", loadFailed: "ファイルを読み込めません。",
        previewFailed: "プレビューを作成できませんでした。", pdfLoadFailed: "PDFファイルを読み込めません。", pdfCannotLoad: "PDFを読み込めません。",
        pdfPasswordNeeded: "パスワード付きのPDFです", pdfPasswordWrong: "パスワードが正しくありません", pdfPassword: "PDFパスワード", open: "開く",
        cannotReadFile: "ファイルを読み取れません。", cannotReadHtml: "HTMLファイルを読み取れません。", htmlPreview: "プレビュー", htmlSource: "ソースコード",
        videoUnsupported: "お使いのブラウザは動画に対応していません。", audioUnsupported: "お使いのブラウザは音声に対応していません。",
        spreadsheetFailed: "スプレッドシートのデータを読み込めません。", imageCopied: "画像をクリップボードにコピーしました。", imageCopyFailed: "画像をコピーできません。",
    },
    mn: {
        back: "Буцах", close: "Хаах", prevFile: "Өмнөх файл", nextFile: "Дараах файл", pageList: "Хуудсууд", prevPage: "Өмнөх хуудас", nextPage: "Дараах хуудас",
        zoomIn: "Томруулах", zoomOut: "Жижигрүүлэх", fitToScreen: "Дэлгэцэнд тааруулах", rotateLeft: "Зүүн тийш эргүүлэх", rotateRight: "Баруун тийш эргүүлэх", download: "Татах", share: "Хуваалцах", print: "Хэвлэх",
        unsupported: "Энэ төрлийн файлыг урьдчилан харах боломжгүй", downloadToCheck: "Файлыг татаж аваад үзнэ үү.", loadFailed: "Файлыг ачаалж чадсангүй.",
        previewFailed: "Урьдчилан харах хувилбарыг үүсгэж чадсангүй.", pdfLoadFailed: "PDF файлыг ачаалж чадсангүй.", pdfCannotLoad: "PDF-ийг ачаалж чадсангүй.",
        pdfPasswordNeeded: "Нууц үгтэй PDF байна", pdfPasswordWrong: "Нууц үг буруу байна", pdfPassword: "PDF нууц үг", open: "Нээх",
        cannotReadFile: "Файлыг уншиж чадсангүй.", cannotReadHtml: "HTML файлыг уншиж чадсангүй.", htmlPreview: "Урьдчилан харах", htmlSource: "Эх код",
        videoUnsupported: "Таны хөтөч видеог дэмжихгүй байна.", audioUnsupported: "Таны хөтөч дууг дэмжихгүй байна.",
        spreadsheetFailed: "Хүснэгтийн өгөгдлийг ачаалж чадсангүй.", imageCopied: "Зургийг санах ойд хуулсан.", imageCopyFailed: "Зургийг хуулж чадсангүй.",
    },
    kk: {
        back: "Артқа", close: "Жабу", prevFile: "Алдыңғы файл", nextFile: "Келесі файл", pageList: "Беттер", prevPage: "Алдыңғы бет", nextPage: "Келесі бет",
        zoomIn: "Үлкейту", zoomOut: "Кішірейту", fitToScreen: "Экранға сыйдыру", rotateLeft: "Солға бұру", rotateRight: "Оңға бұру", download: "Жүктеп алу", share: "Бөлісу", print: "Басып шығару",
        unsupported: "Бұл файл түрін алдын ала қарау мүмкін емес", downloadToCheck: "Файлды жүктеп алып қараңыз.", loadFailed: "Файлды жүктеу мүмкін болмады.",
        previewFailed: "Алдын ала қарау нұсқасын жасау мүмкін болмады.", pdfLoadFailed: "PDF файлын жүктеу мүмкін болмады.", pdfCannotLoad: "PDF жүктеу мүмкін болмады.",
        pdfPasswordNeeded: "Құпиясөзбен қорғалған PDF", pdfPasswordWrong: "Құпиясөз қате", pdfPassword: "PDF құпиясөзі", open: "Ашу",
        cannotReadFile: "Файлды оқу мүмкін болмады.", cannotReadHtml: "HTML файлын оқу мүмкін болмады.", htmlPreview: "Алдын ала қарау", htmlSource: "Бастапқы код",
        videoUnsupported: "Браузеріңіз бейнені қолдамайды.", audioUnsupported: "Браузеріңіз дыбысты қолдамайды.",
        spreadsheetFailed: "Кесте деректерін жүктеу мүмкін болмады.", imageCopied: "Сурет алмасу буферіне көшірілді.", imageCopyFailed: "Суретті көшіру мүмкін болмады.",
    },
};

/** 언어 코드("en-US" 도 받는다)와 덮어쓸 문구로 화면 문구를 정한다 — 모르는 언어는 영어, 언어를 안 주면 한국어(예전 동작) */
export function resolveViewerLabels(locale: string | undefined, labels?: Partial<ViewerLabels>): ViewerLabels {
    const base = (locale ?? "ko").toLowerCase().split(/[-_]/)[0] as ViewerLocale;
    return { ...(VIEWER_MESSAGES[base] ?? VIEWER_MESSAGES.en), ...labels };
}
