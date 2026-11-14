import fs from "node:fs/promises";
import path from "node:path";

/* cv-bestanden op schijf. Standaard in ./data/cv; zet UPLOAD_DIR in .env.local om een andere map te kiezen.
   Een pad in de database is altijd "<gebruiker-id>/cv.pdf" en wordt hier gecontroleerd voordat het bestand wordt aangeraakt. */

const MAP = () => path.resolve(process.env.UPLOAD_DIR || "./data/cv");
const PAD = /^[0-9a-f-]{36}\/cv\.(pdf|docx)$/;

function volledig(rel) {
  if (!PAD.test(rel)) throw new Error("Ongeldig bestandspad");
  return path.join(MAP(), rel);
}

export async function bewaarCv(rel, buffer) {
  const p = volledig(rel);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, buffer);
}
export async function leesCv(rel) {
  return fs.readFile(volledig(rel));
}
export async function verwijderCv(rel) {
  try { await fs.rm(volledig(rel), { force: true }); } catch {}
}
export async function verwijderAlleCvs(userId) {
  if (!/^[0-9a-f-]{36}$/.test(userId)) return;
  try { await fs.rm(path.join(MAP(), userId), { recursive: true, force: true }); } catch {}
}
