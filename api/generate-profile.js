import { readFile } from "node:fs/promises";
import { join } from "node:path";

const apiBase = (process.env.STUDENT_IMAGE_API_BASE_URL || "https://gpt-students.belagent.com/v1").replace(/\/$/, "");
const apiKey = process.env.STUDENT_IMAGE_API_KEY || "";
const model = process.env.STUDENT_IMAGE_MODEL || "gpt-image-2";

function clean(value, max = 140) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}

function studentData(value = {}) {
  return {
    name: clean(value.name, 60),
    age: clean(value.age, 3),
    feeling: clean(value.feeling, 60),
    favoriteColor: clean(value.favoriteColor, 30),
    pet: clean(value.pet, 40),
    hobbies: Array.isArray(value.hobbies) ? value.hobbies.slice(0, 3).map((item) => clean(item, 40)).filter(Boolean) : [],
    choices: Array.isArray(value.choices) ? value.choices.slice(0, 3).map((item) => clean(item, 40)).filter(Boolean) : [],
    goal: clean(value.goal, 80),
    markers: Array.isArray(value.markers) ? value.markers.slice(0, 8).map((item) => clean(item, 50)).filter(Boolean) : [],
    sceneAnswer: clean(value.sceneAnswer, 120),
    imagination: clean(value.imagination, 120),
    teacherNote: clean(value.teacherNote, 160),
  };
}

function photoBuffer(value) {
  if (!value) return null;
  const match = String(value).match(/^data:(image\/(?:jpeg|png|webp));base64,([\s\S]+)$/i);
  if (!match) return null;
  const buffer = Buffer.from(match[2], "base64");
  return buffer.length && buffer.length <= 8 * 1024 * 1024 ? { mime: match[1].toLowerCase(), buffer } : null;
}

function promptFor(student, hasPhoto) {
  const identity = hasPhoto
    ? "Image 1 is the student's photo. Preserve identity, face shape, hair, age, skin tone, and natural expression."
    : "There is no student photo. Create a new age-appropriate student character. Do not copy the person from the style reference.";
  return [
    "Use case: stylized-concept.",
    "Asset type: unique portrait illustration for a student's final English lesson dossier.",
    "Input images: Image 1 is the student's photo when supplied; the last image is a style and composition reference from a retro comic dossier.",
    `Create one warm, brave, age-appropriate student hero portrait shaped by the student's answers. ${identity}`,
    `Student signals: name ${student.name || "New student"}; age ${student.age || "not provided"}; feeling ${student.feeling || "curious"}; favorite color ${student.favoriteColor || "not provided"}; pet ${student.pet || "not provided"}; hobbies ${student.hobbies.join(", ") || "curiosity"}; choices ${student.choices.join(", ") || "not provided"}; goal ${student.goal || "speak English with confidence"}; observed markers ${student.markers.join(", ") || "first English phrases"}.`,
    "Style: printed 1960s comic-book dossier, strong ink outlines, halftone grain, hand-painted blocks of deep navy, coral orange, mustard yellow, leaf green, and lilac, tactile paper texture, expressive but kind.",
    "Composition: a single clear portrait with room around the head and shoulders, landscape-friendly framing, subject centered, visual motifs from hobbies and goal in the background.",
    "Constraints: no text, letters, numbers, logos, watermark, UI panels, extra people, horror, weapons, sexualized styling, or exact copy of the reference person. Return only the image.",
  ].join("\n");
}

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });
  if (!apiKey) return response.status(500).json({ error: "STUDENT_IMAGE_API_KEY is not configured in Vercel." });

  try {
    const body = typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
    const student = studentData(body.student);
    const photo = body.photo ? photoBuffer(body.photo) : null;
    if (body.photo && !photo) return response.status(400).json({ error: "Photo must be a valid JPG, PNG, or WebP image under 8 MB." });

    const reference = await readFile(join(process.cwd(), "assets", "student-profile-reference.jpg"));
    const form = new FormData();
    form.set("model", model);
    form.set("prompt", promptFor(student, Boolean(photo)));
    form.set("n", "1");
    form.set("size", "1536x1024");
    form.set("quality", "high");
    form.set("output_format", "png");
    if (photo) form.append("image", new Blob([photo.buffer], { type: photo.mime }), `student-photo.${photo.mime.split("/")[1]}`);
    form.append("image", new Blob([reference], { type: "image/jpeg" }), "style-reference.jpg");

    const upstream = await fetch(`${apiBase}/images/edits`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(150000),
    });
    const raw = await upstream.text();
    let payload = {};
    try { payload = JSON.parse(raw); } catch { /* handled below */ }
    if (!upstream.ok) return response.status(502).json({ error: payload.error?.message || `Image service returned ${upstream.status}.` });

    const item = payload.data?.[0];
    if (item?.b64_json) return response.status(200).json({ image: `data:image/png;base64,${item.b64_json}` });
    if (item?.url) {
      const imageResponse = await fetch(item.url, { signal: AbortSignal.timeout(30000) });
      if (!imageResponse.ok) throw new Error("Generated image could not be downloaded.");
      const mime = imageResponse.headers.get("content-type")?.split(";")[0] || "image/png";
      return response.status(200).json({ image: `data:${mime};base64,${Buffer.from(await imageResponse.arrayBuffer()).toString("base64")}` });
    }
    throw new Error("Image service returned no image.");
  } catch (error) {
    return response.status(error.name === "AbortError" ? 504 : 500).json({ error: error.message || "Unexpected server error." });
  }
}
