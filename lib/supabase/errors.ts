type SupabaseErrorLike = {
  code?: string | null;
  details?: string | null;
  hint?: string | null;
  message?: string | null;
};

function getErrorText(error: SupabaseErrorLike) {
  return [error.message, error.details, error.hint]
    .filter((part): part is string => typeof part === "string")
    .join(" ")
    .toLowerCase();
}

export function isMissingColumnError(error: unknown, columnName: string) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const errorLike = error as SupabaseErrorLike;
  const code = errorLike.code ?? "";
  const messageText = getErrorText(errorLike);
  const normalizedColumnName = columnName.toLowerCase();

  if (code === "42703") {
    return !messageText || messageText.includes(normalizedColumnName);
  }

  return code === "PGRST204" && messageText.includes(normalizedColumnName);
}
