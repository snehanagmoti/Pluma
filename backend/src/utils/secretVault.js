const crypto = require("crypto");

const PREFIX = "enc:v1:";

const getKey = () => {
  const secret = process.env.AI_KEYS_ENCRYPTION_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error("AI_KEYS_ENCRYPTION_SECRET or JWT_SECRET is required");
  return crypto.createHash("sha256").update(secret).digest();
};

const encryptSecret = value => {
  if (!value || String(value).startsWith(PREFIX)) return value || "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
};

const decryptSecret = value => {
  if (!value || !String(value).startsWith(PREFIX)) return value || ""; // legacy plaintext migration
  const [ivText, tagText, encryptedText] = String(value).slice(PREFIX.length).split(".");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64url")),
    decipher.final(),
  ]).toString("utf8");
};

const decryptKeyMap = apiKeys => Object.fromEntries(
  Object.entries(apiKeys || {}).map(([provider, value]) => [provider, decryptSecret(value)])
);

module.exports = { encryptSecret, decryptSecret, decryptKeyMap };
