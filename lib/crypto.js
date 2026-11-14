import crypto from "crypto";

// AES-256-GCM: Gmail-tokens worden versleuteld opgeslagen in de database.
function key() {
  const k = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY || "", "base64");
  if (k.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY moet 32 bytes (base64) zijn. Maak er een met: npm run genkey");
  return k;
}

export function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(String(text), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(".");
}

export function decrypt(payload) {
  const [iv, tag, enc] = String(payload).split(".").map((x) => Buffer.from(x, "base64"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
