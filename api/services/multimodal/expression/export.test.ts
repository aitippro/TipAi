import { describe, it, expect } from "vitest";
import {
  exportToJSON,
  exportToCSV,
  exportToFacsXML,
  exportToPromptText,
  exportTimeline,
} from "./export";
import { generateExpressionTimeline } from "./timeline";
import type { PunctuationProfile } from "../types/expression";

describe("T4: Export Engine", () => {
  const profiles: PunctuationProfile[] = [
    { punctuation: "，", auCodes: ["AU1+2"], intensity: 0.4, gazeState: "FOCUS", duration: 200, easingCurve: "linear" },
    { punctuation: "！", auCodes: ["AU20", "AU5"], intensity: 0.9, gazeState: "EMPHASIS", duration: 300, easingCurve: "linear" },
  ];
  const frames = generateExpressionTimeline("Hi，world！", profiles);
  const metadata = {
    sourceText: "Hi，world！",
    language: "en",
    sentimentScore: 0.5,
    speakerId: "test",
    totalDuration: frames[frames.length - 1]?.timestamp ?? 0,
    frameRate: 30,
  };

  it("JSON: valid parseable output with version", () => {
    const json = exportToJSON(frames, metadata, profiles);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe("tpema-0.2");
    expect(parsed.frames).toBeInstanceOf(Array);
  });

  it("JSON: empty frames", () => {
    const json = exportToJSON([], metadata, profiles);
    const parsed = JSON.parse(json);
    expect(parsed.frames).toEqual([]);
  });

  it("CSV: header contains all AU keys", () => {
    const csv = exportToCSV(frames);
    const lines = csv.split("\n");
    expect(lines[0]).toContain("timestamp");
    expect(lines[0]).toContain("AU1");
    expect(lines[0]).toContain("AU2");
  });

  it("CSV: consistent column count", () => {
    const csv = exportToCSV(frames);
    const lines = csv.split("\n");
    const colCount = lines[0].split(",").length;
    for (let i = 1; i < lines.length; i++) {
      expect(lines[i].split(",").length).toBe(colCount);
    }
  });

  it("FACS-XML: contains XML declaration", () => {
    const xml = exportToFacsXML(frames, { sourceText: "Test", sentimentScore: 0 });
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
  });

  it("FACS-XML: escapes special chars", () => {
    const xml = exportToFacsXML(frames, { sourceText: "A < B & C > D", sentimentScore: 0 });
    expect(xml).not.toContain("A < B");
    expect(xml).toContain("A &lt; B");
  });

  it("Prompt-Text: contains prefix", () => {
    const text = exportToPromptText(frames, "Hello");
    expect(text).toContain("Facial expression control for:");
  });

  it("Unified export: all formats return string", () => {
    for (const fmt of ["json", "csv", "facs-xml", "prompt-text"] as const) {
      const result = exportTimeline(frames, fmt, metadata, profiles);
      expect(typeof result).toBe("string");
    }
  });
});
