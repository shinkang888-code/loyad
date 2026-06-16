/**
 * Vercel 서버리스: pdfjs fake worker가 worker.mjs 파일 경로를 dynamic import 하면
 * 배포 번들에 worker 파일이 없어 실패한다.
 * WorkerMessageHandler를 모듈 로드 시점에 주입해 우회한다.
 */
import { ensurePdfjsNodePolyfills } from "@/lib/documentOcr/pdfjsNodePolyfill";
import * as pdfWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";

ensurePdfjsNodePolyfills();

const g = globalThis as {
  pdfjsWorker?: {
    WorkerMessageHandler?: unknown;
  };
};

if (!g.pdfjsWorker?.WorkerMessageHandler) {
  g.pdfjsWorker = {
    WorkerMessageHandler: pdfWorker.WorkerMessageHandler,
  };
}
