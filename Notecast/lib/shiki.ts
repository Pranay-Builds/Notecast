// lib/shiki.ts
let highlighter: any;

export async function getShiki() {
  if (!highlighter) {
    const { getSingletonHighlighter } = await import("shiki");
    highlighter = await getSingletonHighlighter({
      themes: ["github-dark"],
      langs: ["js","ts","jsx","tsx","html","css","json","bash"],
    });
  }
  return highlighter;
}