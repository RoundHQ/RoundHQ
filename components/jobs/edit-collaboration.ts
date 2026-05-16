export type EditableResourceType = "customer" | "quote" | "invoice";

export type EditInactiveAction = "notify" | "auto_save" | "auto_discard";

export type EditResource = {
  type: EditableResourceType;
  id: string;
  label: string;
};

export type EditSessionRecord = {
  sessionId: string;
  resourceKey: string;
  resourceType: EditableResourceType;
  resourceId: string;
  resourceLabel: string;
  editorUserId: string;
  editorStaffId?: number | null;
  editorName: string;
  editorEmail?: string | null;
  editorPhone?: string | null;
  editorIsAdmin: boolean;
  dirty: boolean;
  status: "active" | "saved" | "discarded" | "finished";
  draft?: unknown;
  startedAt: string;
  lastActiveAt: string;
  updatedAt: string;
  finishedAt?: string;
  finishedByUserId?: string | null;
};

export type EditFormCollaboration<TDraft = unknown> = {
  saveRequestId: number;
  discardRequestId: number;
  onDraftChange: (draft: TDraft, dirty: boolean) => void;
  onSaveComplete: () => void;
  onDiscardComplete: () => void;
};

export function getEditResourceKey(resource: EditResource) {
  return `${resource.type}:${resource.id}`;
}

export function normalizeEditInactiveMinutes(value: unknown, fallback = 5) {
  const numericValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(60, Math.max(1, Math.round(numericValue)));
}

export function normalizeEditInactiveAction(value: unknown): EditInactiveAction {
  return value === "auto_save" || value === "auto_discard" ? value : "notify";
}
