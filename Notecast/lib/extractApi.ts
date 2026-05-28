export function getExtractApiUrl(): string {
  const url = process.env.EXTRACT_API_URL;
  if (!url?.trim()) {
    throw new Error("EXTRACT_API_URL is not configured");
  }
  return url.replace(/\/$/, "");
}

export async function callExtract(
  body: Record<string, unknown>,
  timeoutMs = 180_000,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${getExtractApiUrl()}/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error("Extraction failed");
    }

    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function embedQuery(text: string): Promise<number[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(`${getExtractApiUrl()}/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error("Embedding failed");
    }

    const data = await res.json();
    return data.embedding as number[];
  } finally {
    clearTimeout(timeout);
  }
}
