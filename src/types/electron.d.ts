interface ElectronAPI {
  platform?: string;
  fetch(path: string, opts: { method: string; headers: Record<string, string>; body: string | null }): Promise<{ status: number; statusText: string; headers: Record<string, string>; body: string }>;
}

interface Window {
  electronAPI?: ElectronAPI;
}
