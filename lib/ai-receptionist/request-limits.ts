export type RequestTextResult =
  | {
      ok: true;
      text: string;
    }
  | {
      ok: false;
      status: 413;
      error: string;
    };

function formatByteLimit(maxBytes: number) {
  if (maxBytes >= 1024 * 1024) {
    return `${Math.round(maxBytes / (1024 * 1024))} MB`;
  }

  return `${Math.round(maxBytes / 1024)} KB`;
}

export async function readRequestTextWithLimit(
  request: Request,
  maxBytes: number
): Promise<RequestTextResult> {
  const contentLength = Number(request.headers.get("content-length") ?? "");

  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return {
      ok: false,
      status: 413,
      error: `Request body must be ${formatByteLimit(maxBytes)} or smaller.`,
    };
  }

  const text = await request.text();

  if (new TextEncoder().encode(text).length > maxBytes) {
    return {
      ok: false,
      status: 413,
      error: `Request body must be ${formatByteLimit(maxBytes)} or smaller.`,
    };
  }

  return {
    ok: true,
    text,
  };
}
