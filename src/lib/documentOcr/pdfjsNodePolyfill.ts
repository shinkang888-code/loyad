/**
 * pdfjs-dist v6+ 는 DOMMatrix 등 브라우저 API를 모듈 로드 시점에 참조한다.
 * Node.js(Next.js API Route)에서는 import 전에 최소 polyfill을 주입해야 한다.
 */

import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

let polyfilled = false;
let workerHandlerReady: Promise<void> | null = null;

/** getTextContent용 최소 DOMMatrix — canvas 렌더링은 하지 않음 */
class DOMMatrixPolyfill {
  a = 1;
  b = 0;
  c = 0;
  d = 1;
  e = 0;
  f = 0;

  constructor(init?: string | number[]) {
    if (Array.isArray(init) && init.length >= 6) {
      [this.a, this.b, this.c, this.d, this.e, this.f] = init;
    }
  }

  multiply(): this {
    return this;
  }

  inverse(): this {
    return this;
  }

  translate(): this {
    return this;
  }

  scale(): this {
    return this;
  }

  rotate(): this {
    return this;
  }

  transformPoint<T extends { x: number; y: number }>(point: T): T {
    return point;
  }

  static fromMatrix(): DOMMatrixPolyfill {
    return new DOMMatrixPolyfill();
  }
}

export function ensurePdfjsNodePolyfills(): void {
  if (polyfilled) return;
  if (typeof globalThis.DOMMatrix === "undefined") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).DOMMatrix = DOMMatrixPolyfill;
  }
  polyfilled = true;
}

/** Node.js에서 pdf.worker.mjs 경로 설정 */
export function configurePdfjsWorker(GlobalWorkerOptions: { workerSrc: string }): void {
  if (GlobalWorkerOptions.workerSrc) return;
  const require = createRequire(import.meta.url);
  const workerPath = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
  GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
}

type PdfjsWorkerGlobal = {
  pdfjsWorker?: {
    WorkerMessageHandler?: unknown;
  };
};

/**
 * Vercel 서버리스에서 fake worker가 workerSrc 경로를 dynamic import 하면
 * pdf.worker.mjs가 배포 번들에 없어 실패한다.
 * WorkerMessageHandler를 미리 주입하면 file URL import를 우회한다.
 */
export async function ensurePdfjsWorkerMessageHandler(): Promise<void> {
  const g = globalThis as PdfjsWorkerGlobal;
  if (g.pdfjsWorker?.WorkerMessageHandler) return;

  if (!workerHandlerReady) {
    workerHandlerReady = (async () => {
      const workerMod = (await import("pdfjs-dist/legacy/build/pdf.worker.mjs")) as {
        WorkerMessageHandler?: unknown;
      };
      if (!workerMod.WorkerMessageHandler) {
        throw new Error("pdfjs WorkerMessageHandler를 불러오지 못했습니다.");
      }
      g.pdfjsWorker = { WorkerMessageHandler: workerMod.WorkerMessageHandler };
    })();
  }

  await workerHandlerReady;
}
