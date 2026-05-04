/**
 * TPEMA v0.2 — Multi-format Export Engine (T4)
 * Zero external dependencies.
 */

import type { TimelineFrame } from "./timeline";
import type { PunctuationProfile } from "../types/expression";

export type ExportFormat = "json" | "csv" | "facs-xml" | "prompt-text";

export interface JSONExportPayload {
  version: string;
  metadata: {
    sourceText: string;
    language: string;
    sentimentScore: number;
    speakerId: string;
    totalDuration: number;
    frameRate: number;
  };
  frames: Array<{
    timestamp: number;
    auState: Record<string, number>;
    headPose: { pitch: number; yaw: number; roll: number };
    gazeState: string;
  }>;
  punctuationProfiles: Array<{
    punctuation: string;
    auCodes: string[];
    intensity: number;
    duration: number;
  }>;
}

export function exportToJSON(
  frames: TimelineFrame[],
  metadata: JSONExportPayload["metadata"],
  profiles: PunctuationProfile[],
): string {
  const payload: JSONExportPayload = {
    version: "tpema-0.2",
    metadata,
    frames: frames.map((f) => ({
      timestamp: f.timestamp,
      auState: f.auState,
      headPose: f.headPose,
      gazeState: f.gazeState,
    })),
    punctuationProfiles: profiles.map((p) => ({
      punctuation: p.punctuation,
      auCodes: p.auCodes,
      intensity: p.intensity,
      duration: p.duration,
    })),
  };
  return JSON.stringify(payload, null, 2);
}

export function exportToCSV(frames: TimelineFrame[]): string {
  const auKeys = new Set<string>();
  for (const f of frames) {
    Object.keys(f.auState).forEach((k) => auKeys.add(k));
  }
  const sortedAuKeys = Array.from(auKeys).sort();

  const headers = [
    "timestamp",
    ...sortedAuKeys,
    "headPitch",
    "headYaw",
    "headRoll",
    "gazeState",
  ];

  const rows = frames.map((f) => {
    const auVals = sortedAuKeys.map((k) => f.auState[k] ?? 0);
    return [
      f.timestamp,
      ...auVals,
      f.headPose.pitch,
      f.headPose.yaw,
      f.headPose.roll,
      f.gazeState,
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

export function exportToFacsXML(
  frames: TimelineFrame[],
  metadata: { sourceText: string; sentimentScore: number },
): string {
  const framesXML = frames
    .map(
      (f) => `
  <frame timestamp="${f.timestamp}">
    ${Object.entries(f.auState)
      .map(([code, val]) => `    <au code="${code}" intensity="${val.toFixed(3)}" />`)
      .join("\n")}
    <head pose="${f.headPose.pitch},${f.headPose.yaw},${f.headPose.roll}" />
    <gaze state="${f.gazeState}" />
  </frame>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<facs-sequence version="1.0">
  <metadata>
    <sourceText>${escapeXml(metadata.sourceText)}</sourceText>
    <sentiment>${metadata.sentimentScore}</sentiment>
  </metadata>
${framesXML}
</facs-sequence>`;
}

export function exportToPromptText(frames: TimelineFrame[], text: string): string {
  const segments: string[] = [];
  let lastGaze = "";

  for (const frame of frames) {
    if (frame.gazeState !== lastGaze) {
      const auDesc = Object.entries(frame.auState)
        .filter(([_, v]) => v > 0.3)
        .map(([code, v]) => `${code}(${Math.round(v * 100)}%)`)
        .join(", ");

      if (auDesc) {
        segments.push(`${frame.gazeState.toLowerCase()} gaze: ${auDesc}`);
      }
      lastGaze = frame.gazeState;
    }
  }

  return `Facial expression control for: "${text}"

${segments.join("; ")}

Natural language: ${generateNaturalLanguage(frames, text)}`;
}

function generateNaturalLanguage(frames: TimelineFrame[], text: string): string {
  const gazeChanges = new Set<string>();
  let last = "";
  for (const f of frames) {
    if (f.gazeState !== last) {
      gazeChanges.add(f.gazeState);
      last = f.gazeState;
    }
  }
  const states = Array.from(gazeChanges);
  if (states.length === 0) return "Neutral expression throughout.";
  return `Expression shifts through ${states.join(", ")} states across ${text.length} characters.`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function exportTimeline(
  frames: TimelineFrame[],
  format: ExportFormat,
  metadata: {
    sourceText: string;
    language: string;
    sentimentScore: number;
    speakerId: string;
    totalDuration: number;
    frameRate: number;
  },
  profiles: PunctuationProfile[],
): string {
  switch (format) {
    case "json":
      return exportToJSON(frames, metadata, profiles);
    case "csv":
      return exportToCSV(frames);
    case "facs-xml":
      return exportToFacsXML(frames, {
        sourceText: metadata.sourceText,
        sentimentScore: metadata.sentimentScore,
      });
    case "prompt-text":
      return exportToPromptText(frames, metadata.sourceText);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}
