import { createServer } from "node:http";
import { readFile, readFileSync } from "node:fs";
import { readFile as readFileAsync } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
loadLocalEnv();

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";
const apiBase = (process.env.STUDENT_IMAGE_API_BASE_URL || "https://gpt-students.belagent.com/v1").replace(/\/$/, "");
const apiKey = process.env.STUDENT_IMAGE_API_KEY || "";
const model = process.env.STUDENT_IMAGE_MODEL || "gpt-image-2";
const referencePath = join(root, "assets", "student-profile-reference.jpg");
const maxBodySize = 12 * 1024 * 1024;

function loadLocalEnv() {
  try {
    const envText = requireEnvText();
    envText.split(/\r?\n/).forEach((line) => {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!match || process.env[match[1]]) return;
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    });
  } catch {
    // `.env.local` is optional. The process environment still works in production.
  }
}

function requireEnvText() {
  return readFileSync(join(root, ".env.local"), "utf8");
}

function cleanText(value, max = 140) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}

function normalizeStudent(value = {}) {
  return {
    name: cleanText(value.name, 60),
    age: cleanText(value.age, 3),
    feeling: cleanText(value.feeling, 60),
    favoriteColor: cleanText(value.favoriteColor, 30),
    pet: cleanText(value.pet, 40),
    hobbies: Array.isArray(value.hobbies) ? value.hobbies.slice(0, 3).map((item) => cleanText(item, 40)).filter(Boolean) : [],
    choices: Array.isArray(value.choices) ? value.choices.slice(0, 3).map((item) => cleanText(item, 40)).filter(Boolean) : [],
    goal: cleanText(value.goal, 80),
    markers: Array.isArray(value.markers) ? value.markers.slice(0, 8).map((item) => cleanText(item, 50)).filter(Boolean) : [],
    sceneAnswer: cleanText(value.sceneAnswer, 120),
    imagination: cleanText(value.imagination, 120),
    teacherNote: cleanText(value.teacherNote, 160),
  };
}

function decodeImageDataUrl(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([\s\S]+)$/i);
  if (!match) return null;
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > 8 * 1024 * 1024) return null;
  return { mime: match[1].toLowerCase(), buffer };
}

function promptFor(student, hasPhoto) {
  const identity = hasPhoto
    ? "Image 1 is the student's photo. Preserve the student's identity, face shape, hair, age, skin tone, and natural expression. Do not add another person."
    : "There is no student photo. Create a new age-appropriate student character and do not copy the person from the style reference.";
  return [
    "Use case: stylized-concept.",
    "Asset type: a unique portrait illustration for a student's final English lesson dossier.",
    "Input images: Image 1 is the student's photo when supplied; the last image is a style and composition reference from a retro comic teacher dossier.",
    `Primary request: create one warm, brave, age-appropriate student hero portrait shaped by the student's answers. ${identity}`,
    `Student signals: name ${student.name || "New student"}; age ${student.age || "not provided"}; feeling ${student.feeling || "curious"}; favorite color ${student.favoriteColor || "not provided"}; pet ${student.pet || "not provided"}; hobbies ${student.hobbies.join(", ") || "curiosity"}; choices ${student.choices.join(", ") || "not provided"}; goal ${student.goal || "speak English with confidence"}; observed markers ${student.markers.join(", ") || "first English phrases"}.`,
    "Style: printed 1960s comic-book dossier, strong ink outlines, halftone grain, hand-painted blocks of deep navy, coral orange, mustard yellow, leaf green, and lilac, tactile paper texture, expressive but kind, polished enough for a classroom keepsake.",
    "Composition: a single clear portrait with a little room around the head and shoulders, readable as a landscape card image, subject centered, visual motifs from the hobbies and goal in the background, no dense layout.",
    "Constraints: no text, no letters, no numbers, no logos, no watermark, no UI panels, no extra people, no horror, no weapons, no sexualized styling, no exact copy of the reference person. Return only the image.",
  ].join("\n");
}

async function requestImage(student, photo) {
  const reference = await readFileAsync(referencePath);
  const form = new FormData();
  form.set("model", model);
  form.set("prompt", promptFor(student, Boolean(photo)));
  form.set("n", "1");
  form.set("size", "1536x1024");
  form.set("quality", "high");
  form.set("output_format", "png");
  if (photo) form.append("image", new Blob([photo.buffer], { type: photo.mime }), `student-photo.${photo.mime.split("/")[1]}`);
  form.append("image", new Blob([reference], { type: "image/jpeg" }), "style-reference.jpg");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 150000);
  let response;
  try {
    response = await fetch(`${apiBase}/images/edits`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal,
    });
  } catch (error) {
    throw new Error(error.name === "AbortError" ? "Image service timed out after 150 seconds." : `Image service is unavailable: ${error.message}`);
  } finally {
    clearTimeout(timeout);
  }
  const raw = await response.text();
  let payload = {};
  try { payload = JSON.parse(raw); } catch { /* handled below */ }
  if (!response.ok) throw new Error(payload.error?.message || `Image service returned ${response.status}.`);
  const item = payload.data?.[0];
  if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
  if (item?.url) {
    const imageResponse = await fetch(item.url, { signal: AbortSignal.timeout(30000) });
    if (!imageResponse.ok) throw new Error("Generated image could not be downloaded.");
    const mime = imageResponse.headers.get("content-type")?.split(";")[0] || "image/png";
    return `data:${mime};base64,${Buffer.from(await imageResponse.arrayBuffer()).toString("base64")}`;
  }
  throw new Error("Image service returned no image.");
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodySize) throw new Error("Request is too large.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function sendJson(response, status, data) {
  const body = JSON.stringify(data);
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(body);
}

const mimeTypes = { ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".ico": "image/x-icon" };

async function serveStatic(request, response) {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = resolve(root, normalize(relative));
  if (!filePath.startsWith(resolve(root))) return sendJson(response, 404, { error: "Not found" });
  try {
    const file = await readFileAsync(filePath);
    response.writeHead(200, { "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream", "Cache-Control": "no-cache" });
    response.end(file);
  } catch {
    sendJson(response, 404, { error: "Not found" });
  }
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/api/health") return sendJson(response, 200, { ok: true, configured: Boolean(apiKey) });
    if (request.method === "POST" && request.url === "/api/generate-profile") {
      if (!apiKey) return sendJson(response, 500, { error: "Image generation is not configured. Add STUDENT_IMAGE_API_KEY to .env.local." });
      const body = await readJson(request);
      const student = normalizeStudent(body.student);
      const photo = body.photo ? decodeImageDataUrl(body.photo) : null;
      if (body.photo && !photo) return sendJson(response, 400, { error: "Photo must be a valid JPG, PNG, or WebP image under 8 MB." });
      const image = await requestImage(student, photo);
      return sendJson(response, 200, { image });
    }
    if (request.method === "GET") return serveStatic(request, response);
    return sendJson(response, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error.message);
    sendJson(response, 500, { error: error.message || "Unexpected server error." });
  }
});

function lanUrls() {
  return Object.values(networkInterfaces()).flatMap((addresses) => (addresses || [])
    .filter((address) => address.family === "IPv4" && !address.internal)
    .map((address) => `http://${address.address}:${port}`));
}

server.listen(port, host, () => {
  console.log(`Quest English is running at http://127.0.0.1:${port}`);
  lanUrls().forEach((url) => console.log(`LAN access: ${url}`));
});
