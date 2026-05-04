import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import superjson from "superjson";
import type { AppRouter } from "../../api/router";
import type { ReactNode } from "react";
import { logger } from "@/lib/logger";

export const trpc = createTRPCReact<AppRouter>();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount) => failureCount < 2,
    },
  },
});

// IPC fetch for Electron, HTTP fetch for browser — checked at call time
const customFetch: typeof globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : (input instanceof URL ? input.pathname + input.search : (input as Request).url);
  const method = init?.method || 'GET';
  const headers: Record<string, string> = {};
  if (init?.headers) {
    const h = init.headers;
    if (h instanceof Headers) { h.forEach((v, k) => { headers[k] = v; }); }
    else if (Array.isArray(h)) { h.forEach(([k, v]) => { headers[k] = v; }); }
    else { Object.assign(headers, h); }
  }
  let body: string | null = null;
  if (init?.body) {
    if (typeof init.body === 'string') body = init.body;
    else if (init.body instanceof FormData) body = new URLSearchParams([...(init.body as unknown as [string, string][])]).toString();
    else body = await (init.body as ReadableStream<Uint8Array>).getReader().read().then(r => r.value ? new TextDecoder().decode(r.value) : '');
  }

  // Use Electron IPC if available
  const api = window.electronAPI;
  if (api?.fetch) {
    try {
      const r = await api.fetch(url, { method, headers, body });
      if (r.status >= 400) {
        logger.warn("tRPC", `${method} ${url} → ${r.status}`, r.body?.substring?.(0, 500))
      }
      return new Response(r.body, { status: r.status, statusText: r.statusText, headers: new Headers(r.headers) });
    } catch (e) {
      logger.error("tRPC:IPC", `${method} ${url} 失败`, e instanceof Error ? e.message : String(e))
      throw e
    }
  }

  // Browser mode
  try {
    return await globalThis.fetch(input, init);
  } catch (e) {
    const urlStr = typeof input === 'string' ? input : (input instanceof URL ? input.pathname : (input as Request).url)
    logger.error("tRPC:HTTP", `${method} ${urlStr} 网络错误`, e instanceof Error ? e.message : String(e))
    throw e
  }
};

const trpcClient = trpc.createClient({
  links: [httpBatchLink({ url: "/api/trpc", transformer: superjson, fetch: customFetch })],
});

export function TRPCProvider({ children }: { children: ReactNode }) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
