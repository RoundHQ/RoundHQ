import crypto from "node:crypto";

const ENCRYPTED_SECRET_PREFIX = "enc:v1:";
const IV_BYTES = 12;

function getEncryptionKey() {
  const configuredKey = process.env.AI_RECEPTIONIST_SECRET_ENCRYPTION_KEY?.trim();

  if (!configuredKey) {
    throw new Error(
      "AI_RECEPTIONIST_SECRET_ENCRYPTION_KEY is required to encrypt AI Receptionist provider secrets."
    );
  }

  return crypto.createHash("sha256").update(configuredKey).digest();
}

function toBase64Url(value: Buffer) {
  return value.toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url");
}

export function isEncryptedAiReceptionistSecret(value: string | null | undefined) {
  return Boolean(value?.startsWith(ENCRYPTED_SECRET_PREFIX));
}

export function encryptAiReceptionistSecretForStorage(value: string) {
  const secret = value.trim();

  if (!secret) {
    return "";
  }

  if (isEncryptedAiReceptionistSecret(secret)) {
    return secret;
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    ENCRYPTED_SECRET_PREFIX,
    toBase64Url(iv),
    toBase64Url(tag),
    toBase64Url(ciphertext),
  ].join(".");
}

export function decryptAiReceptionistSecretFromStorage(
  value: string | null | undefined
) {
  const storedValue = value?.trim() ?? "";

  if (!storedValue) {
    return "";
  }

  if (!isEncryptedAiReceptionistSecret(storedValue)) {
    return storedValue;
  }

  const [, ivValue, tagValue, ciphertextValue] = storedValue.split(".");

  if (!ivValue || !tagValue || !ciphertextValue) {
    return "";
  }

  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    fromBase64Url(ivValue)
  );
  decipher.setAuthTag(fromBase64Url(tagValue));

  return Buffer.concat([
    decipher.update(fromBase64Url(ciphertextValue)),
    decipher.final(),
  ]).toString("utf8");
}
