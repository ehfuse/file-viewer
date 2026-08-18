import { build } from "esbuild";
import { readFileSync, writeFileSync } from "fs";

const packageJson = JSON.parse(readFileSync("./package.json", "utf8"));

// 외부 의존성 목록: peerDependencies 에서 자동 생성 + 서브패스(import "pkg/...") 도 외부화
const externalFromPeerDeps = Object.keys(packageJson.peerDependencies || {});
const external = [...new Set(externalFromPeerDeps.flatMap((name) => [name, `${name}/*`]))];

const sharedConfig = {
    entryPoints: ["src/index.ts"],
    bundle: true,
    external,
    platform: "browser",
    target: ["es2020"],
    minify: true, // 코드 압축 및 난독화
    sourcemap: false, // 소스맵 제거
    treeShaking: true,
    keepNames: false, // 함수/클래스 이름 난독화
    legalComments: "none", // 라이센스 주석 제거
};

// cjs + esm 산출물을 모두 빌드한다
async function buildAll() {
    try {
        // CommonJS 빌드
        await build({
            ...sharedConfig,
            outfile: "dist/index.js",
            format: "cjs",
        });

        // ESM 빌드
        await build({
            ...sharedConfig,
            outfile: "dist/index.esm.js",
            format: "esm",
        });

        // ESM 파일에서 require 제거
        let esmContent = readFileSync("dist/index.esm.js", "utf8");
        esmContent = esmContent.replaceAll("require", "undefined");
        writeFileSync("dist/index.esm.js", esmContent, "utf8");

        console.log("\n✅ Build completed successfully!");
        console.log("  ✓ CommonJS build: dist/index.js");
        console.log("  ✓ ESM build: dist/index.esm.js (require removed)");
    } catch (error) {
        console.error("Build failed:", error);
        process.exit(1);
    }
}

buildAll();
