import path from "path";
import { nativePolyfill } from "./native-polyfill";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let native: any = null;

function loadNativeAddon() {
  // 1. Electron packaged: main process sets this env var before loading backend
  if (process.env.TIPAI_NATIVE_PATH) {
    try {
      return require(process.env.TIPAI_NATIVE_PATH);
    } catch (e) {
      console.warn(`[native] TIPAI_NATIVE_PATH failed: ${e}`);
    }
  }

  // 2. Try cwd (dev / non-packaged)
  try {
    return require(path.join(process.cwd(), "native"));
  } catch (e) {
    console.warn(`[native] cwd fallback failed: ${e}`);
  }

  // 3. Try Electron resourcesPath (last resort for packaged)
  // @ts-expect-error resourcesPath is Electron-specific
  if (process.resourcesPath) {
    try {
      return require(path.join(process.resourcesPath, "app.asar.unpacked", "native"));
    } catch (e) {
      console.warn(`[native] resourcesPath fallback failed: ${e}`);
    }
  }

  throw new Error("Native addon not found in any known location");
}

try {
  native = loadNativeAddon();
} catch (err) {
  // In test environment, provide an empty object so tests can mock native functions
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    native = {};
  } else {
    // Production: Native binary missing — load polyfill with REAL SQLite implementations.
    // This is NOT a mock. Every function performs genuine database CRUD.
    // When the Rust binary is compiled and present, it is preferred over this polyfill.
    console.warn(
      `[native] Rust binary not found (${err instanceof Error ? err.message : String(err)}). ` +
        "Falling back to native-polyfill (real SQLite, not mock)."
    );
    native = nativePolyfill;
  }
}

export { native };
