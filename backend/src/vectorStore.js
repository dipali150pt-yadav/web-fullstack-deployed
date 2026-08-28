import crypto from "crypto";
import fs from "fs";
import path from "path";
import { DATA_DIR } from "./config.js";
import { getAllDocuments } from "./db.js";

const EMBEDDING_DIMENSIONS = 768;

/**
 * Deterministic normalized dense embedding matching the Python implementation
 */
export function getEmbedding(text, dim = EMBEDDING_DIMENSIONS) {
  const vec = new Float64Array(dim);
  const words = (text || "").toLowerCase().match(/\w+/g) || [];
  if (words.length === 0) return Array.from(vec);

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    // 1-gram hash
    const h1Hex = crypto.createHash("sha256").update(w).digest("hex").slice(0, 16);
    const h1 = BigInt("0x" + h1Hex);
    const idx1 = Number(h1 % BigInt(dim));
    const sign1 = (h1 >> 16n) & 1n ? 1.0 : -1.0;
    vec[idx1] += sign1 * 1.0;

    // 2-gram context hash
    if (i + 1 < words.length) {
      const bigram = `${w}_${words[i + 1]}`;
      const h2Hex = crypto.createHash("sha256").update(bigram).digest("hex").slice(0, 16);
      const h2 = BigInt("0x" + h2Hex);
      const idx2 = Number(h2 % BigInt(dim));
      const sign2 = (h2 >> 16n) & 1n ? 1.0 : -1.0;
      vec[idx2] += sign2 * 1.5;
    }
  }

  let sumSq = 0;
  for (let i = 0; i < dim; i++) {
    sumSq += vec[i] * vec[i];
  }
  const norm = Math.sqrt(sumSq);
  if (norm > 0) {
    for (let i = 0; i < dim; i++) {
      vec[i] /= norm;
    }
  }

  return Array.from(vec);
}

function cosineSimilarity(vecA, vecB) {
  let dot = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
  }
  return dot;
}

export function cleanDocumentText(text) {
  if (!text) return "";
  let clean = text.replace(/\r\n/g, "\n");

  // 1. Fix broken hyphenated line breaks (e.g. "pro-\ncessor" -> "processor")
  clean = clean.replace(/([a-zA-Z]{2,})-\s*\n\s*([a-zA-Z]{2,})/g, "$1$2");

  // 2. Strip OEM PDF header lines (e.g. 'www.samsung.com English. 01/2026. Rev.1.0')
  clean = clean.replace(/\b(?:www\.[a-z0-9-]+\.[a-z]{2,})\s*(?:English|Spanish|French|German)?\.?\s*\d{1,2}\/\d{2,4}\.?\s*Rev(?:\.|\s*)\d+(?:\.\d+)?/gi, "");
  clean = clean.replace(/\b(?:English|Spanish|French|German)\.\s*\d{1,2}\/\d{2,4}\.?\s*Rev(?:\.|\s*)\d+(?:\.\d+)?/gi, "");
  clean = clean.replace(/\b[0-9a-zA-Z_-]+\.(?:indd|ai|qxd|psd|eps|pdf)\b[^\n]*/gi, "");

  // 3. Remove date/time stamps (e.g. "5/26/11 3:28:58 PM")
  clean = clean.replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\b/gi, "");

  // 4. Remove page numbers & headers/footers
  clean = clean.replace(/--\s*\d+\s+of\s+\d+\s*--/gi, "");
  clean = clean.replace(/\b(?:Page|page|PAGE)\s+\d+(?:\s+of\s+\d+)?\b/g, "");
  clean = clean.replace(/\b\d+\s+of\s+\d+\b/gi, "");

  // 5. Remove copyright & boilerplate lines
  clean = clean.replace(/(?:©|Copyright|\(c\))\s*\d{4}[^\n]*/gi, "");
  clean = clean.replace(/All rights reserved[^\n]*/gi, "");

  // 6. Clean excess spaces
  clean = clean
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join("\n");

  return clean;
}

export function sanitizeFaqText(text) {
  if (!text) return "";
  let clean = text;

  const replacements = [
    [/\{\{Currency Symbol\}\}/gi, "$"],
    [/\{\{Customer Support Phone Number\}\}/gi, "1-800-555-0199"],
    [/\{\{Customer Support Hours\}\}/gi, "24/7 Support"],
    [/\{\{Website URL\}\}/gi, "https://support.example.com"],
    [/\{\{Online Company Portal Info\}\}/gi, "support.example.com"],
    [/\{\{Online Order Interaction\}\}/gi, "Order Management Portal"],
    [/\[phone number\]/gi, "1-800-555-0199"],
    [/\[email address\]/gi, "support@example.com"],
    [/\[working hours\]/gi, "Mon-Fri 9:00 AM - 6:00 PM EST"],
    [/\[customer support phone number or email\]/gi, "support@example.com or 1-800-555-0199"],
    [/\{\{Person Name\}\}/gi, "Customer Support Team"],
    [/\{\{Salutation\}\}/gi, "Hello"],
    [/\{\{Client First Name\}\}/gi, "Valued Customer"],
    [/\{\{Client Last Name\}\}/gi, ""],
    [/\{\{contact_method\}\}/gi, "email or phone"],
    [/\{\{Account Type\}\}/gi, "standard"],
    [/\{\{Account Category\}\}/gi, "customer"],
    [/\[Provide detailed steps to cancel the.*?account\]/gi, "Go to Settings > Account > Cancel Account and follow the on-screen instructions."],
    [/\{\{Delivery Country\}\}/gi, "your country"],
    [/\{\{Delivery City\}\}/gi, "your city"],
    [/\{\{Date Range\}\}/gi, "3-5 business days"],
    [/\{\{Store Location\}\}/gi, "authorized retail store"],
    [/\[Company Website URL\]/gi, "https://support.example.com"],
    [/\{\{User Account Recovery\}\}/gi, "Account Recovery portal"],
    [/\{\{Reset Key\}\}/gi, "verification code"],
    [/\{\{Login Page URL\}\}/gi, "https://support.example.com/login"],
    [/\{\{Forgot Password\}\}/gi, "Forgot Password link"],
    [/\{\{Account Recovery\}\}/gi, "Account Recovery"],
    [/\{\{Forgot PIN\}\}/gi, "PIN Reset"],
    [/\{\{Account Recovery Page URL\}\}/gi, "https://support.example.com/recovery"],
    [/\{\{Forgot Key\}\}/gi, "Key Recovery"],
    [/\[Insert Login Page URL\]/gi, "https://support.example.com/login"],
    [/\{\{Forgot Access Key\}\}/gi, "Access Key Recovery"],
    [/\[productfeedback@company\.com\]/gi, "feedback@example.com"],
    [/\[Company Name\]/gi, "Support AI"],
    [/\[Feedback Department\]/gi, "Customer Feedback Team"],
    [/\[Address\]/gi, "100 Tech Blvd"],
    [/\[City, State\/Province, ZIP\/Postal Code\]/gi, "San Francisco, CA 94107"],
    [/\[Country\]/gi, "USA"],
    [/\{\{Feedback Email Address\}\}/gi, "feedback@example.com"],
    [/\{\{Settings\}\}/gi, "Settings"],
    [/\{\{Profile\}\}/gi, "Profile"],
    [/\{\{Upgrade Account\}\}/gi, "Account Upgrade"],
    [/\{\{Account Change\}\}/gi, "Account Settings"],
    [/\{\{Profile Type\}\}/gi, "Standard"],
    [/\{\{Order Status\}\}/gi, "Order Status"],
    [/\{\{Order Tracking\}\}/gi, "Order Tracking"],
    [/\{\{[^}]+\}\}/g, ""],
    [/\[([^\]]+)\]/g, "$1"],
    [/\[Name\]/gi, "Customer Support"]
  ];

  for (const [pattern, replacement] of replacements) {
    clean = clean.replace(pattern, replacement);
  }

  return clean.replace(/\(\s*\)/g, "").replace(/  +/g, " ").trim();
}

export function normalizeQuery(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getFaqKeywords(str) {
  const stopWords = new Set([
    "what", "is", "are", "the", "a", "an", "to", "in", "for", "of", "and",
    "with", "on", "at", "by", "from", "i", "my", "me", "you", "your", "we",
    "our", "do", "does", "did", "can", "could", "how", "when", "where", "why",
    "who", "please", "tell", "want", "need", "would", "like", "there", "any",
    "some", "got", "have", "has", "had", "this", "that", "it"
  ]);
  const words = normalizeQuery(str).split(" ").filter((w) => w.length >= 2 && !stopWords.has(w));
  return new Set(words);
}

// In-memory store cached from data directories
export let productDocuments = []; // Array of { id, text, embedding, metadata: { product_id, product_name, hardware_version, source_name, section, page } }
export let faqDocuments = [];      // Array of { id, text, embedding, metadata: { category, question, answer } }
export let exactFaqMap = new Map(); // normalized question -> FAQ object
export let approvedMemory = [];    // Array of { id, text, embedding, metadata: { product_id, question, answer, url } }

export function clearProductDocuments() {
  productDocuments.length = 0;
}

export async function loadAndIndexAll() {
  console.log("Vector store initialized on the go (in-memory mode)...");
  productDocuments = [];
  faqDocuments = [];
  exactFaqMap.clear();

  const dataPath = path.join(DATA_DIR, "faq");
  
  if (fs.existsSync(dataPath)) {
    const files = fs.readdirSync(dataPath);
    for (const f of files) {
      if (f.endsWith(".jsonl") || f.endsWith(".json")) {
        const fullPath = path.join(dataPath, f);
        const raw = fs.readFileSync(fullPath, "utf-8");
        if (f.endsWith(".jsonl")) {
          const lines = raw.split("\n").filter((l) => l.trim());
          for (const line of lines) {
            try {
              const item = JSON.parse(line);
              indexFaqItem(item);
            } catch (e) {}
          }
        } else {
          try {
            const items = JSON.parse(raw);
            if (Array.isArray(items)) {
              items.forEach(indexFaqItem);
            }
          } catch (e) {}
        }
      }
    }
  }

  // Fallback default FAQs if empty
  if (faqDocuments.length === 0) {
    const defaultFaqs = [
      { category: "returns", question: "What is your return policy?", answer: "Items can be returned within 30 days of receipt in original packaging for a full refund." },
      { category: "shipping", question: "How long does standard shipping take?", answer: "Standard shipping typically takes 3-5 business days across the continental US." },
      { category: "orders", question: "How do I cancel my order?", answer: "You can cancel your order within 1 hour of placing it from your account order management page." },
      { category: "warranty", question: "What is the hardware warranty period?", answer: "All hardware devices include a 1-year standard manufacturer limited warranty." },
    ];
    defaultFaqs.forEach(indexFaqItem);
  }

  // Reload previously uploaded product manuals from Turso (persists across restarts/redeploys)
  try {
    const docs = await getAllDocuments();
    for (const doc of docs) {
      if (doc.content) {
        chunkAndIndexDocument(doc.product_id, doc.filename, doc.content, doc.hardware_version || "");
      }
    }
    console.log(`[VectorStore] Reloaded ${docs.length} document(s) from Turso on boot.`);
  } catch (err) {
    console.error("[VectorStore] Failed to reload documents from Turso:", err.message);
  }

  console.log(`Node Vector Store ready: ${productDocuments.length} product chunks, ${faqDocuments.length} FAQs indexed.`);
}

export function chunkText(text, maxWords = 300, overlapWords = 50) {
  if (!text) return [];
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (clean.length < 15) return [];

  // Split into lines/paragraphs
  const rawParagraphs = clean.split(/\n+/).map((p) => p.trim()).filter((p) => p.length > 0);
  const chunks = [];
  let currentWords = [];

  for (const para of rawParagraphs) {
    const paraWords = para.split(/\s+/).filter((w) => w.length > 0);
    if (paraWords.length === 0) continue;

    if (currentWords.length + paraWords.length <= maxWords) {
      currentWords.push(...paraWords);
    } else {
      if (currentWords.length >= 15) {
        chunks.push(currentWords.join(" "));
        currentWords = currentWords.slice(-overlapWords);
      }
      if (paraWords.length > maxWords) {
        // If a single paragraph is huge, split it with sliding window
        for (let i = 0; i < paraWords.length; i += (maxWords - overlapWords)) {
          const slice = paraWords.slice(i, i + maxWords);
          if (slice.length >= 15) {
            chunks.push(slice.join(" "));
          }
          if (i + maxWords >= paraWords.length) break;
        }
        currentWords = [];
      } else {
        currentWords.push(...paraWords);
      }
    }
  }

  if (currentWords.length >= 15) {
    chunks.push(currentWords.join(" "));
  }

  return chunks.length > 0 ? chunks : [clean.slice(0, 1500)];
}

export function chunkAndIndexDocument(productId, filename, content, customHwVersion = "") {
  // Clean PDF publishing and layout artifacts
  const cleanContent = cleanDocumentText(content || "");
  const subChunks = chunkText(cleanContent, 150, 50);
  let chunkIdx = 0;

  let docHwVersion = customHwVersion || "";
  if (!docHwVersion) {
    const verMatch = cleanContent.slice(0, 3000).match(/\b(?:V|Version|Rev|Revision)\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (verMatch) {
      docHwVersion = `V${verMatch[1]}`;
    }
  }

  const createdChunks = [];

  for (const chunk of subChunks) {
    const trimmed = chunk.trim();
    if (!trimmed || trimmed.length < 15) continue;

    const lines = trimmed.split("\n").filter((l) => l.trim());
    let cleanSection = null;
    if (lines[0] && lines[0].startsWith("#")) {
      cleanSection = lines[0].replace(/^#+\s*/, "").slice(0, 30).trim();
    }

    const embedding = getEmbedding(trimmed);
    const docItem = {
      id: `${productId}-${filename}-${chunkIdx++}`,
      text: trimmed,
      embedding,
      metadata: {
        product_id: productId,
        product_name: productId.replace(/-/g, " ").toUpperCase(),
        hardware_version: docHwVersion,
        source_name: filename,
        section: cleanSection || null,
        page: "",
        source_url: "",
      },
    };
    productDocuments.push(docItem);
    createdChunks.push(docItem);
  }

  return createdChunks;
}

function indexFaqItem(item) {
  const q = item.question || item.query || item.q || "";
  const a = item.answer || item.response || item.a || "";
  if (!q || !a) return;

  const cleanAnswer = sanitizeFaqText(a);
  const cleanQuestion = q.trim();
  const normQ = normalizeQuery(cleanQuestion);

  const faqObj = {
    id: `faq-${faqDocuments.length}`,
    text: `Question: ${cleanQuestion}\nAnswer: ${cleanAnswer}`,
    embedding: getEmbedding(`Question: ${cleanQuestion}\nAnswer: ${cleanAnswer}`),
    metadata: {
      category: item.category || item.intent || "general",
      question: cleanQuestion,
      normalized_question: normQ,
      answer: cleanAnswer,
    },
  };

  faqDocuments.push(faqObj);
  if (normQ && !exactFaqMap.has(normQ)) {
    exactFaqMap.set(normQ, faqObj);
  }
}

export function isLikelyEnglish(text) {
  if (!text || text.trim().length === 0) return true;
  const lower = ` ${text.toLowerCase().replace(/[^a-z0-9áéíóúñüçàâêîôûè]+/gi, " ")} `;

  const englishCommon = [
    " the ", " is ", " and ", " of ", " to ", " in ", " with ", " for ", " on ",
    " this ", " you ", " your ", " are ", " from ", " at ", " by ", " be ",
    " have ", " has ", " will ", " can ", " not ", " but ", " all ", " device ",
    " power ", " port ", " button ", " system ", " guide ", " user ", " manual "
  ];

  const foreignCommon = [
    " que ", " los ", " las ", " por ", " como ", " este ", " esta ", " estos ",
    " estas ", " una ", " uno ", " unos ", " unas ", " se ", " su ", " sus ",
    " pero ", " más ", " informacion ", " información ", " mexicana ", " méxico ",
    " descripcion ", " descripción ", " français ", " pour ", " avec ", " dans ",
    " sur ", " vous ", " votre ", " vos ", " guide de démarrage ", " guía ",
    " conforme ", " alimentation ", " altavoz ", " dactilares ", " puerto ",
    " bateria ", " batería ", " de la ", " del ", " para ", " con ", " sobre ",
    " número ", " requisitos ", " norma oficial ", " importador ", " iluminación "
  ];

  let engCount = 0;
  for (const w of englishCommon) {
    if (lower.includes(w)) engCount++;
  }

  let foreignCount = 0;
  for (const w of foreignCommon) {
    if (lower.includes(w)) foreignCount++;
  }

  // If foreign words detected and exceed/equal English words, reject
  if (foreignCount > 0 && foreignCount >= engCount) {
    return false;
  }

  // If foreign words dominate or English words are missing in multi-word text
  if (foreignCount > 1 && engCount < 2) {
    return false;
  }

  return true;
}

export function normalizeTypos(text) {
  if (!text) return "";
  let s = text.toLowerCase();

  const typoMap = [
    [/\b(decribe|describ|desribe|desccribe|discribe|discrib)\b/g, "describe"],
    [/\b(featires|featres|fetures|feturs|feutures|featuers|featurs)\b/g, "features"],
    [/\b(specificatoin|specifcation|specfications|secification|specefications|speces|speck|specks)\b/g, "specifications"],
    [/\b(warrnty|waranty|warrenty|guarrenty|garanty|wareenty|warenty|wranty|warrany|warannty)\b/g, "warranty"],
    [/\b(servce|servise|servic|centr|centre|cntr)\b/g, "service"],
    [/\b(batry|battey|batterry|batri|battry)\b/g, "battery"],
    [/\b(dispaly|disply|scren|screeen|displa)\b/g, "display"],
    [/\b(charegr|chargng|powre|pwer|charg)\b/g, "power"],
    [/\b(hardwre|hadware|hardwar)\b/g, "hardware"],
    [/\b(overveiw|overiew|summry|sumary)\b/g, "overview"],
    [/\b(loaction|loction|locatoin)\b/g, "location"],
    [/\b(troubleshot|troubleshoting|trobleshoot)\b/g, "troubleshooting"],
    [/\b(conect|conection|conectivity)\b/g, "connectivity"],
    [/\b(blutooth|bluetoth)\b/g, "bluetooth"],
    [/\b(storag|storgae|memry|memmory)\b/g, "storage"],
  ];

  for (const [regex, replacement] of typoMap) {
    s = s.replace(regex, replacement);
  }
  return s;
}

export function isOverviewQuery(text) {
  if (!text) return false;
  const q = normalizeTypos(text).toLowerCase().trim();
  const cleanQ = q.replace(/\.[a-z0-9]{2,4}\b/g, "").replace(/[^a-z0-9\s]/g, " ").trim();

  if (/\b(summarize|summarise|summary|overview|describe|description|brief|introduction|highlights)\b/i.test(cleanQ)) {
    return true;
  }
  if (/\btell\s+me\s+(more|moe|about|everything|details)\b/i.test(cleanQ)) {
    return true;
  }
  if (/\b(what\s+is\s+this|what\s+does\s+this|what\s+is\s+in\s+this|about\s+this)\b/i.test(cleanQ)) {
    return true;
  }
  if (/^(tell me|details|info|information|specs|specifications|features|help|explain|overview|summary)$/i.test(cleanQ)) {
    return true;
  }
  return false;
}

export function queryProductDocuments({ query, productId, hardwareVersion = "", topK = 6 }) {
  const normalizedQuery = normalizeTypos(query);
  const targetPid = (productId || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");

  // If Overview / Summary / "Tell me more" query, return top representative document chunks
  if (isOverviewQuery(query) && productDocuments.length > 0) {
    let docs = productDocuments;
    if (targetPid) {
      const filtered = docs.filter((d) => {
        const docPid = (d.metadata?.product_id || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
        return docPid === targetPid || docPid.includes(targetPid) || targetPid.includes(docPid);
      });
      if (filtered.length > 0) docs = filtered;
    }
    return docs.slice(0, topK).map((doc, idx) => ({
      text: doc.text,
      metadata: doc.metadata,
      score: 0.95 - idx * 0.05,
      isEnglish: isLikelyEnglish(doc.text),
    }));
  }

  const queryVec = getEmbedding(normalizedQuery);
  const qLower = normalizedQuery.toLowerCase();
  const queryWords = new Set(qLower.match(/\w+/g) || []);

  // Technical domain synonym expansion for high-precision retrieval
  if (qLower.includes("ram") || qLower.includes("rom") || qLower.includes("storage") || qLower.includes("memory") || qLower.includes("ssd")) {
    queryWords.add("memory");
    queryWords.add("storage");
    queryWords.add("ram");
    queryWords.add("rom");
    queryWords.add("capacity");
    queryWords.add("internal");
    queryWords.add("gb");
    queryWords.add("ssd");
  }
  if (qLower.includes("display") || qLower.includes("screen") || qLower.includes("panel")) {
    queryWords.add("screen");
    queryWords.add("display");
    queryWords.add("resolution");
    queryWords.add("panel");
    queryWords.add("fhd");
    queryWords.add("qhd");
    queryWords.add("hz");
  }
  if (qLower.includes("battery") || qLower.includes("charge") || qLower.includes("charging") || qLower.includes("power")) {
    queryWords.add("battery");
    queryWords.add("charging");
    queryWords.add("power");
    queryWords.add("adapter");
    queryWords.add("fast");
  }
  if (qLower.includes("port") || qLower.includes("ports") || qLower.includes("usb") || qLower.includes("hdmi") || qLower.includes("slot") || qLower.includes("connect")) {
    queryWords.add("port");
    queryWords.add("ports");
    queryWords.add("usb");
    queryWords.add("hdmi");
    queryWords.add("slot");
    queryWords.add("jack");
    queryWords.add("type-c");
    queryWords.add("audio");
  }

  let candidateChunks = [];

  for (const doc of productDocuments) {
    // Case-insensitive and slug-tolerant product matching
    if (targetPid) {
      const docPid = (doc.metadata.product_id || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
      if (docPid !== targetPid && !docPid.includes(targetPid) && !targetPid.includes(docPid)) {
        continue;
      }
    }

    // Only filter by hardware version if BOTH query and doc specify incompatible versions
    if (
      hardwareVersion &&
      doc.metadata.hardware_version &&
      doc.metadata.hardware_version.toLowerCase() !== hardwareVersion.toLowerCase()
    ) {
      continue;
    }

    const cosine = cosineSimilarity(queryVec, doc.embedding);
    
    // Exact whole-word and root-stem token matching
    const docWords = new Set(doc.text.toLowerCase().match(/\b[a-z0-9]{3,}\b/g) || []);
    let matchCount = 0;
    for (const w of queryWords) {
      const rootW = w.replace(/(ing|ed|s|es)$/, "");
      if (w.length >= 3 && docWords.has(w)) {
        matchCount += 1.5;
      } else if (rootW.length >= 3 && docWords.has(rootW)) {
        matchCount += 1.0;
      }
    }

    // Require genuine relevance: must have at least 1 exact whole-word match OR strong cosine similarity (>= 0.35)
    let score = 0.0;
    if (matchCount > 0) {
      score = cosine + Math.min(0.6, matchCount * 0.18);
    } else if (cosine >= 0.35) {
      score = cosine;
    }

    if (score >= 0.08) {
      candidateChunks.push({
        text: doc.text,
        metadata: doc.metadata,
        score,
        isEnglish: isLikelyEnglish(doc.text),
      });
    }
  }

  candidateChunks.sort((a, b) => b.score - a.score);

  // If no explicit productId was requested, isolate to the single best matching product
  if (!targetPid && candidateChunks.length > 0) {
    const dominantProduct = candidateChunks[0].metadata.product_id;
    candidateChunks = candidateChunks.filter(
      (c) => c.metadata.product_id === dominantProduct
    );
  }

  // Ensure English chunks appear first
  const englishOnly = candidateChunks.filter((c) => c.isEnglish);
  if (englishOnly.length >= 2) {
    candidateChunks = englishOnly;
  }

  // Check if overview intent
  const isOverview = isOverviewQuery(normalizedQuery);

  if (targetPid && (isOverview || candidateChunks.length === 0)) {
    const productChunks = productDocuments.filter((d) => {
      const p = (d.metadata.product_id || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
      return p === targetPid || p.includes(targetPid) || targetPid.includes(p);
    });
    if (productChunks.length > 0) {
      const topIntroChunks = productChunks.filter(c => isLikelyEnglish(c.text)).slice(0, 3);
      for (let i = topIntroChunks.length - 1; i >= 0; i--) {
        const intro = topIntroChunks[i];
        candidateChunks = candidateChunks.filter(c => c.text !== intro.text);
        candidateChunks.unshift({
          text: intro.text,
          metadata: intro.metadata,
          score: 1.0,
          isEnglish: true,
        });
      }
    }
  }

  return candidateChunks.slice(0, topK);
}

export function queryFaqDocuments({ query, topK = 4 }) {
  const normQuery = normalizeQuery(query);
  const queryWords = getFaqKeywords(query);

  // 1. Instant O(1) 100% exact normalized match
  if (exactFaqMap.has(normQuery)) {
    const exactDoc = exactFaqMap.get(normQuery);
    return [{
      text: exactDoc.text,
      metadata: exactDoc.metadata,
      score: 1.0,
      exactMatch: true,
    }];
  }

  const queryVec = getEmbedding(query);
  const results = [];

  for (const doc of faqDocuments) {
    const docNormQ = doc.metadata.normalized_question || normalizeQuery(doc.metadata.question);
    
    // Check exact match on metadata question
    if (docNormQ === normQuery) {
      return [{
        text: doc.text,
        metadata: doc.metadata,
        score: 1.0,
        exactMatch: true,
      }];
    }

    // Check substring / inclusion match
    let substringBoost = 0;
    if (normQuery.length >= 10 && docNormQ.includes(normQuery)) {
      substringBoost = 0.95;
    } else if (docNormQ.length >= 10 && normQuery.includes(docNormQ)) {
      substringBoost = 0.95;
    }

    // Keyword overlap & Jaccard similarity
    const docWords = getFaqKeywords(doc.metadata.question);
    let keywordOverlapScore = 0;
    if (queryWords.size > 0 && docWords.size > 0) {
      let overlap = 0;
      for (const w of queryWords) {
        if (docWords.has(w)) {
          overlap += 1.0;
        } else {
          const rootW = w.replace(/(ing|ed|s|es)$/, "");
          for (const dw of docWords) {
            if (dw.startsWith(rootW) || rootW.startsWith(dw.replace(/(ing|ed|s|es)$/, ""))) {
              overlap += 0.8;
              break;
            }
          }
        }
      }
      const coverage = overlap / queryWords.size;
      const jaccard = overlap / (queryWords.size + docWords.size - overlap);
      keywordOverlapScore = (coverage * 0.6) + (jaccard * 0.4);
    }

    const cosine = cosineSimilarity(queryVec, doc.embedding);

    // Compute composite high-precision confidence score
    let score = 0;
    if (substringBoost > 0) {
      score = substringBoost;
    } else if (keywordOverlapScore >= 0.70) {
      score = Math.max(keywordOverlapScore, cosine + 0.35);
    } else {
      score = (cosine * 0.5) + (keywordOverlapScore * 0.5);
    }

    results.push({
      text: doc.text,
      metadata: doc.metadata,
      score,
      exactMatch: false,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}

export function queryApprovedMemory({ query, productId, topK = 2 }) {
  const queryVec = getEmbedding(query);
  const results = [];

  for (const doc of approvedMemory) {
    if (productId && doc.metadata.product_id !== productId) continue;
    const score = cosineSimilarity(queryVec, doc.embedding);
    results.push({
      text: doc.text,
      metadata: doc.metadata,
      score: Math.max(0.0, score),
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}

export function addApprovedMemory({ productId, question, answer, url = "" }) {
  const text = `Q: ${question}\nA: ${answer}`;
  approvedMemory.push({
    id: `mem-${Date.now()}`,
    text,
    embedding: getEmbedding(text),
    metadata: {
      product_id: productId,
      question,
      answer,
      url,
    },
  });
}