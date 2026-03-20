// api/parse-cv.js
// ─────────────────────────────────────────────────────────────────────────────
// Serverless function that accepts a CV file upload (PDF, DOCX, DOC, TXT)
// and returns the extracted plain text.
//
// Strategy by file type:
//   .txt          → read buffer as UTF-8 string directly
//   .pdf          → use pdf-parse (no native bindings, pure JS)
//   .docx         → use mammoth  (pure JS, no LibreOffice needed)
//   .doc (legacy) → mammoth handles many .doc files too; fallback to raw text
//
// Vercel deployment note:
//   Add these to package.json dependencies before deploying:
//     "pdf-parse": "^1.1.1"
//     "mammoth":   "^1.7.0"
//   Then run: npm install
// ─────────────────────────────────────────────────────────────────────────────

import formidable from "formidable";
import fs from "fs";
import path from "path";

// Disable Vercel's default body parser so formidable can handle multipart
export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  // ── Parse the incoming multipart form ──────────────────────────────────────
  const form = formidable({
    maxFileSize: 5 * 1024 * 1024, // 5 MB
    keepExtensions: true,
  });

  let fields, files;
  try {
    [fields, files] = await form.parse(req);
  } catch (err) {
    return res.status(400).json({ error: `File upload error: ${err.message}` });
  }

  const uploaded = files?.cv?.[0] || files?.file?.[0];
  if (!uploaded) {
    return res.status(400).json({ error: "No file received. Send the file as field name 'cv'." });
  }

  const filePath = uploaded.filepath;
  const originalName = uploaded.originalFilename || "";
  const ext = path.extname(originalName).toLowerCase();

  try {
    let extractedText = "";

    // ── TXT ────────────────────────────────────────────────────────────────
    if (ext === ".txt") {
      extractedText = fs.readFileSync(filePath, "utf-8");
    }

    // ── PDF ────────────────────────────────────────────────────────────────
    else if (ext === ".pdf") {
      const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
      const buffer = fs.readFileSync(filePath);
      const parsed = await pdfParse(buffer);
      extractedText = parsed.text;
    }

    // ── DOCX / DOC ─────────────────────────────────────────────────────────
    else if (ext === ".docx" || ext === ".doc") {
      const mammoth = (await import("mammoth")).default;
      const buffer = fs.readFileSync(filePath);
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    }

    // ── Unknown ────────────────────────────────────────────────────────────
    else {
      return res.status(400).json({
        error: `Unsupported file type "${ext}". Please upload PDF, DOCX, DOC, or TXT.`,
      });
    }

    // ── Clean up the temp file ─────────────────────────────────────────────
    try { fs.unlinkSync(filePath); } catch (_) {}

    // ── Normalise whitespace ───────────────────────────────────────────────
    const cleaned = extractedText
      .replace(/\r\n/g, "\n")         // Windows line endings
      .replace(/\r/g, "\n")           // old Mac line endings
      .replace(/\n{3,}/g, "\n\n")     // collapse excessive blank lines
      .trim();

    if (!cleaned) {
      return res.status(422).json({
        error:
          "The file was parsed but no text could be extracted. " +
          "It may be a scanned image PDF. Please paste your CV text manually.",
      });
    }

    return res.status(200).json({ text: cleaned, filename: originalName });

  } catch (err) {
    // Clean up on error
    try { fs.unlinkSync(filePath); } catch (_) {}
    console.error("CV parse error:", err);
    return res.status(500).json({
      error: `Could not parse the file: ${err.message}. Please paste your CV text manually.`,
    });
  }
}
