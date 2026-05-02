import path from "path";

let native: any = null;
try {
  native = require(path.join(process.cwd(), "native"));
} catch (err: any) {
  throw new Error(`Native addon is required. ${err.message}`);
}

export { native };
