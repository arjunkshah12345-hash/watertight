// Per-deal encrypted storage. Each deal gets its own random AES-256-GCM data key
// that lives only in memory. Revoking a deal destroys the key (crypto-shredding),
// so the ciphertext left on disk can never be opened again.
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { mkdir, writeFile, readFile, rm, readdir } from "node:fs/promises";
import { join } from "node:path";

export const VAULT_DIR = new URL("../.vault/", import.meta.url).pathname;

export function newKey() {
  return randomBytes(32);
}

export function seal(key, plaintext, aad) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(aad));
  const body = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]);
}

export function open(key, blob, aad) {
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(blob.subarray(28)), decipher.final()]);
}

export async function sealRoomIntoVault(dealId, key, files) {
  const dir = join(VAULT_DIR, dealId);
  await mkdir(dir, { recursive: true });
  const out = [];
  for (const { name, data } of files) {
    const blob = seal(key, data, `${dealId}/${name}`);
    await writeFile(join(dir, `${name}.enc`), blob);
    out.push({ name, bytes: data.length, cipherBytes: blob.length, preview: blob.subarray(28, 60).toString("hex") });
  }
  return out;
}

export async function openVault(dealId, key) {
  const dir = join(VAULT_DIR, dealId);
  const names = (await readdir(dir)).filter((n) => n.endsWith(".enc"));
  const files = [];
  for (const n of names) {
    const name = n.slice(0, -4);
    files.push({ name, text: open(key, await readFile(join(dir, n)), `${dealId}/${name}`).toString("utf8") });
  }
  return files;
}

export async function shredVault(dealId) {
  const dir = join(VAULT_DIR, dealId);
  let count = 0;
  try {
    count = (await readdir(dir)).length;
  } catch {}
  await rm(dir, { recursive: true, force: true });
  return count;
}
