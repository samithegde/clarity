import { describe, expect, it } from "vitest";
import {
  normalizeMermaidInText,
  stripFencedCodeForSpeech,
} from "../../src/renderer/modules/markdown.js";

const PERIODIC_TRENDS = `graph TD
    A[Periodic Trends]
    A --> B{Across a Period (Left to Right)}
    A --> C{Down a Group (Top to Bottom)}

    B --> B1[Atomic Radius: Decreases]
    B --> B2[Ionization Energy: Increases]
    B --> B3[Electronegativity: Increases]

    C --> C1[Atomic Radius: Increases]
    C --> C2[Ionization Energy: Decreases]
    C --> C3[Electronegativity: Decreases]`;

describe("markdown tutor helpers", () => {
  it("stripFencedCodeForSpeech removes fenced blocks", () => {
    const text = "Hello ```mermaid\ngraph LR\n  A-->B\n``` world";
    expect(stripFencedCodeForSpeech(text)).toBe("Hello world");
  });

  it("stripFencedCodeForSpeech removes generic code fences", () => {
    const text = "See ```js\nconst x = 1;\n``` for details.";
    expect(stripFencedCodeForSpeech(text)).toBe("See for details.");
  });

  it("normalizeMermaidInText wraps bare graph syntax in mermaid fences", () => {
    const normalized = normalizeMermaidInText(PERIODIC_TRENDS);
    expect(normalized).toMatch(/^```mermaid\ngraph TD/);
    expect(normalized).toMatch(/```$/);
  });

  it("normalizeMermaidInText upgrades generic code fences with graph syntax", () => {
    const normalized = normalizeMermaidInText(`Trends:\n\n\`\`\`\n${PERIODIC_TRENDS}\n\`\`\``);
    expect(normalized).toContain("```mermaid");
    expect(normalized).toContain("graph TD");
  });

  it("normalizeMermaidInText wraps bare graph after a single-line intro", () => {
    const normalized = normalizeMermaidInText(`Periodic trends:\n${PERIODIC_TRENDS}`);
    expect(normalized).toContain("Periodic trends:");
    expect(normalized).toContain("```mermaid");
    expect(normalized).toContain("graph TD");
  });
});
