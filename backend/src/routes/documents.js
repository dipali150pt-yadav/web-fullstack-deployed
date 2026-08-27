import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { createRequire } from "module";
import { v4 as uuidv4 } from "uuid";
import { DATA_DIR } from "../config.js";
import { chunkAndIndexDocument, clearProductDocuments } from "../vectorStore.js";
import { saveDocumentRecord, allAsync } from "../db.js";

const require = createRequire(import.meta.url);
const pdfModule = require("pdf-parse");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });

async function extractTextFromPdfBuffer(buffer) {
  try {
    if (pdfModule.PDFParse) {
      const parser = new pdfModule.PDFParse({ data: buffer });
      const res = await parser.getText();
      await parser.destroy();
      return typeof res === "string" ? res : res.text || "";
    } else if (typeof pdfModule === "function") {
      const res = await pdfModule(buffer);
      return res.text || "";
    }
  } catch (err) {
    console.error("PDF Parsing error:", err);
    throw new Error(`Failed to parse PDF: ${err.message}`);
  }
  return "";
}

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const {
      productId: rawProductId,
      productName,
      manufacturer = "General",
      model = "",
      hardwareVersion = "",
    } = req.body;

    const productId = (
      rawProductId ||
      (productName ? productName.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "custom-product")
    ).replace(/-+$/, "");

    let extractedText = "";

    if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) {
      extractedText = await extractTextFromPdfBuffer(file.buffer);
    } else {
      extractedText = file.buffer.toString("utf-8");
    }

    if (!extractedText || extractedText.trim().length < 10) {
      return res.status(400).json({ error: "Failed to extract readable text from document." });
    }

    // Reset in-memory product index to strictly use this uploaded manual
    clearProductDocuments();

    // Chunk and index into vector store in-memory on the go
    const indexed = chunkAndIndexDocument(productId, file.originalname, extractedText, hardwareVersion);
    const chunksCount = Array.isArray(indexed) ? indexed.length : 1;

    // NEW: persist to Turso so it survives redeploys/restarts
    try {
      await saveDocumentRecord({
        id: uuidv4(),
        productId,
        productName: productName || productId,
        filename: file.originalname,
        content: extractedText,
        hardwareVersion,
        totalChunks: chunksCount,
      });
      console.log(`[Documents] Persisted '${file.originalname}' to Turso (${chunksCount} chunks).`);
    } catch (dbErr) {
      // Don't fail the whole upload if persistence fails — the in-memory index still works for this session
      console.error("[Documents] Failed to persist document to Turso:", dbErr.message);
    }

    return res.json({
      success: true,
      message: `Document '${file.originalname}' successfully indexed on the go!`,
      productId,
      productName: productName || productId,
      hardwareVersion,
      chunksCount,
      extractedCharacters: extractedText.length,
    });
  } catch (err) {
    console.error("Document upload error:", err);
    return res.status(500).json({ error: err.message || "Failed to process document" });
  }
});

router.get("/", async (req, res) => {
  try {
    const rows = await allAsync(
      `SELECT d.*, p.name as product_name FROM documents d LEFT JOIN products p ON d.product_id = p.id ORDER BY d.created_at DESC`
    );
    return res.json({ documents: rows || [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;