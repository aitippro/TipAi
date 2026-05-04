import path from "path";
import { createRequire } from "module";
import { nativePolyfill } from "./native-polyfill";

const _require = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let native: any = null;

function loadNativeAddon() {
  // 1. Electron packaged: main process sets this env var before loading backend
  if (process.env.TIPAI_NATIVE_PATH) {
    try {
      return _require(process.env.TIPAI_NATIVE_PATH);
    } catch (e) {
      console.warn(`[native] TIPAI_NATIVE_PATH failed: ${e}`);
    }
  }

  // 2. Try cwd (dev / non-packaged)
  try {
    return _require(path.join(process.cwd(), "native"));
  } catch (_e) {
    // Expected in dev without Rust addon built — silently fall through
  }

  // 3. Try Electron resourcesPath (last resort for packaged)
  const resourcesPath = (process as unknown as Record<string, string | undefined>).resourcesPath;
  if (resourcesPath) {
    try {
      return _require(path.join(resourcesPath, "app.asar.unpacked", "native"));
    } catch (e) {
      console.warn(`[native] resourcesPath fallback failed: ${e}`);
    }
  }

  throw new Error("Native addon not found in any known location");
}

try {
  native = loadNativeAddon();
  console.log(`[native] Rust addon loaded: v${native.version()}`);
} catch (err) {
  const errMsg = err instanceof Error ? err.message : String(err);
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    native = {};
  } else if (process.env.TIPAI_ELECTRON) {
    // Electron production: surface the error clearly — polyfill is a last resort
    console.error(
      `[native] Rust addon load FAILED: ${errMsg}. Falling back to JS polyfill. ` +
      "Check that native/*.node is included in asarUnpack and the file exists."
    );
    native = nativePolyfill;
  } else {
    // Dev / CLI: Rust addon not built — polyfill expected
    console.warn(
      `[native] Rust addon not found (${errMsg}). ` +
      "Falling back to native-polyfill (better-sqlite3, not mock). " +
      "Run 'npm run native:build' for production-native performance."
    );
    native = nativePolyfill;
  }
}

export { native };
