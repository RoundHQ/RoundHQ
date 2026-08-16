const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

function normalizeOrigin(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }

    url.pathname = "";
    url.search = "";
    url.hash = "";
    return url.origin;
  } catch {
    return "";
  }
}

export function getCanonicalBaseUrl(
  requestUrl?: string | null,
  environment: NodeJS.ProcessEnv = process.env
) {
  const configured = [
    environment.NEXT_PUBLIC_SITE_URL,
    environment.ROUNDHQ_PUBLIC_BASE_URL,
    environment.VERCEL_PROJECT_PRODUCTION_URL,
  ]
    .map((value) => normalizeOrigin(value ?? ""))
    .find(Boolean);

  if (configured) {
    return configured;
  }

  const requestOrigin = normalizeOrigin(requestUrl ?? "");

  if (requestOrigin) {
    return requestOrigin;
  }

  return "http://localhost:3000";
}

export function isSafePublicOrigin(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !LOCAL_HOSTNAMES.has(url.hostname.toLowerCase()) &&
      !url.hostname.endsWith(".local")
    );
  } catch {
    return false;
  }
}

export function buildCanonicalUrl(
  pathname: string,
  requestUrl?: string | null,
  environment: NodeJS.ProcessEnv = process.env
) {
  const baseUrl = getCanonicalBaseUrl(requestUrl, environment);
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return new URL(normalizedPath, `${baseUrl}/`).toString();
}

export function buildSecureDocumentUrl(
  token: string,
  requestUrl?: string | null,
  environment: NodeJS.ProcessEnv = process.env
) {
  return buildCanonicalUrl(
    `/share/${encodeURIComponent(token)}`,
    requestUrl,
    environment
  );
}

export function getSafeInternalPath(value: string | null | undefined) {
  const candidate = value?.trim() ?? "";

  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return "/dashboard";
  }

  try {
    const parsed = new URL(candidate, "https://roundhq.invalid");
    return parsed.origin === "https://roundhq.invalid"
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : "/dashboard";
  } catch {
    return "/dashboard";
  }
}
