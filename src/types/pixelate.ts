export type CharsetId = "binary" | "ascii" | "blocks";

export interface WorkspaceSettings {
  charsetId: CharsetId;
  resolution: number; // 1 (Low) to 10 (High)
  speed: number; // 1 (Slow) to 10 (Fast)
}

export interface ExportResult {
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export const CHARSET_RAMP: Record<CharsetId, string> = {
  binary: " 01",
  ascii: " .:+*#@",
  blocks: " ░▒▓█",
};

export const CHARSET_LABELS: {
  id: CharsetId;
  label: string;
  sample: string;
}[] = [
  { id: "binary", label: "01 Binary", sample: "010110" },
  { id: "ascii", label: "@#*+ ASCII", sample: "@#*+:. " },
  { id: "blocks", label: "█▓▒░ Blocks", sample: "█▓▒░ " },
];
