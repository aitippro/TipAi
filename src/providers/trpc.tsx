import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import superjson from "superjson";
import type { AppRouter } from "../../api/router";
import type { ReactNode } from "react";

export const trpc = createTRPCReact<AppRouter>();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const err = error as { data?: { code?: string } };
        if (err?.data?.code === "UNAUTHORIZED") return false;
        return failureCount < 2;
      },
    },
  },
});

// Custom fetch: uses Electron IPC in desktop, HTTP in browser
function createFetch() {
  const isElectron = typeof window !== 'undefined' && (window as any).electronAPI?.fetch;

  if (isElectron) {
    return async function ipcFetch(input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname + input.search : (input as Request).url;
      const method = init?.method || 'GET';
      const headers: Record<string, string> = {};
      if (init?.headers) {
        if (init.headers instanceof Headers) {
          init.headers.forEach((v, k) => { headers[k] = v; });
        } else if (Array.isArray(init.headers)) {
          init.headers.forEach(([k, v]) => { headers[k] = v; });
        } else {
          Object.assign(headers, init.headers);
        }
      }
      const body = init?.body ? (typeof init.body === 'string' ? init.body : await (init.body as Blob).text()) : null;

      const result = await (window as any).electronAPI.fetch(url, { method, headers, body });
      return new Response(result.body, {
        status: result.status,
        statusText: result.statusText,
        headers: new Headers(result.headers),
      });
    };
  }

  return (input: RequestInfo | URL, init?: RequestInit) =>
    globalThis.fetch(input, { ...(init ?? {}), credentials: "include" });
}

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch: createFetch(),
    }),
  ],
});

export function TRPCProvider({ children }: { children: ReactNode }) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
