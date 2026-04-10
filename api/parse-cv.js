// api/parse-cv.js
// Serverless function — accepts CV file upload and returns extracted plain text.

import formidable from "formidable";
import fs from "fs";
import path from "path";

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

  const form = formidable({
    maxFileSize: 5 * 1024 * 1024,
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

    if (ext === ".txt") {
      extractedText = fs.readFileSync(filePath, "utf-8");
    } else if (ext === ".pdf") {
      const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
      const buffer = fs.readFileSync(filePath);
      const parsed = await pdfParse(buffer);
      extractedText = parsed.text;
    } else if (ext === ".docx" || ext === ".doc") {
      const mammoth = (await import("mammoth")).default;
      const buffer = fs.readFileSync(filePath);
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else {
      return res.status(400).json({
        error: `Unsupported file type "${ext}". Please upload PDF, DOCX, DOC, or TXT.`,
      });
    }

    try { fs.unlinkSync(filePath); } catch (_) {}

    const cleaned = extractedText
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
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
    try { fs.unlinkSync(filePath); } catch (_) {}
    console.error("CV parse error:", err);
    return res.status(500).json({
      error: `Could not parse the file: ${err.message}. Please paste your CV text manually.`,
    });
  }
<<<<<<< HEAD
}
=======
}
>>>>>>> staging
