import { GROK_API_KEY } from "./config.js";
import { generateGroundedAnswer } from "./llm.js";
import {
  queryProductDocuments,
  queryFaqDocuments,
  productDocuments,
  normalizeTypos,
  isOverviewQuery,
} from "./vectorStore.js";
import { logInteraction } from "./interactions.js";

function buildProductContext({ chunks, visualInfo = "" }) {
  const parts = [];
  if (visualInfo) {
    parts.push(`=== Hardware Inspection Note ===\n${visualInfo}`);
  }
  parts.push("=== Uploaded Document Evidence ===");
  let totalWords = 0;
  for (const chunk of chunks) {
    const text = chunk.text || "";
    const words = text.split(/\s+/).length;
    if (totalWords + words > 1200) break;
    totalWords += words;
    const meta = chunk.metadata || {};
    parts.push(`[Section: ${meta.section || "General"}]\n${text}`);
  }
  return parts.join("\n\n");
}

function buildDocumentCitations(chunks) {
  const seen = new Set();
  const citations = [];
  for (const chunk of chunks) {
    const title = chunk.metadata?.source_name || "Uploaded Document";
    const url = chunk.metadata?.source_url || "";
    const key = `${title}:${url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    citations.push({
      title,
      url,
      section: chunk.metadata?.section || null,
      source_type: "document",
      score: chunk.score,
    });
  }
  return citations.slice(0, 3);
}

export async function processChat({
  question,
  history = [],
  activeProduct = null,
  activeVersion = null,
  visualInfo = "",
}) {
  const normalizedQuestion = normalizeTypos(question);
  const qLower = normalizedQuestion.toLowerCase();
  const isOverview = isOverviewQuery(question);

  // 1. If visual inspection photo is attached
  if (visualInfo) {
    console.log(`[ChatService] Visual diagnostic attached: "${question}"`);
    const visualAnswer =
      `📸 **Hardware Visual Diagnostic**:\n\n${visualInfo}\n\n` +
      `*You can ask specific questions about this device's setup, power rating, ports, or upload its PDF manual for technical schematics.*`;

    const interactionId = await logInteraction({
      productId: "visual-inspection",
      productName: "Visual Hardware Inspection",
      question,
      answer: visualAnswer,
      citations: [],
      escalated: false,
    });

    return {
      answer: visualAnswer,
      citations: [],
      escalated: false,
      productName: "Visual Hardware Inspection",
      hardwareVersion: null,
      usedSearch: false,
      usedMemory: false,
      interactionId,
    };
  }

  // 2. Pure RAG: Query uploaded in-memory PDF / Markdown documentation
  let effectiveProduct = activeProduct || (productDocuments.length > 0 ? productDocuments[0].metadata?.product_id : null);
  const effectiveVersion = activeVersion || "";

  if (productDocuments.length > 0) {
    console.log(`[ChatService] [RAG] Searching manual for: "${effectiveProduct || "all"}", query: "${question}" (overview: ${isOverview})`);

    const docChunks = queryProductDocuments({
      query: question,
      productId: effectiveProduct,
      hardwareVersion: effectiveVersion,
      topK: 8,
    });

    if (docChunks.length > 0 && docChunks[0].score >= 0.12) {
      let rawAnswer = "";

      // Call Groq LLM API with retrieved context
      if (GROK_API_KEY && GROK_API_KEY !== "your_groq_api_key_here") {
        try {
          const strictPrompt = isOverview
            ? `You are an expert technical support assistant.
The user is asking for an overall summary, description, or introduction of the uploaded document ("${question}").
Based on the provided document excerpts, provide a rich, well-structured overview:
1. State the device name / main topic covered in the document.
2. Group the key capabilities and specifications under clean bold headers (e.g., **Product Overview**, **Key Hardware Specifications**, **Display & Performance**, **Connectivity & Ports**, **Troubleshooting & Maintenance**).
3. Present all points in concise, crisp bullet points.
4. Do NOT say "This information is not available" — summarize the actual specifications and details found in the excerpts.`
            : `You are an expert technical support assistant.
Answer the user's question directly, crisply, and in clear bullet points based ONLY on the provided document excerpts.

GUIDELINES:
1. Provide a direct, helpful, and well-structured answer in concise bullet points.
2. If the user asks for features, specifications, connectivity, ports, battery, or setup, synthesize the exact details from the provided document excerpts.
3. Group points with clean bold headers (e.g., **Key Features**, **Specifications**, **Battery & Charging**, **Camera System**, **Connectivity & Ports**) where appropriate.
4. If the question cannot be answered from the provided excerpts, reply strictly with: "This information is not available in the uploaded document."
5. Keep points crisp, up-to-the-mark, and easy to read. Do NOT write long paragraphs.`;

          const context = buildProductContext({ chunks: docChunks.slice(0, 6) });
          rawAnswer = await generateGroundedAnswer({
            systemInstruction: strictPrompt,
            context,
            question,
          });
        } catch (err) {
          console.warn(`[ChatService] Grounded LLM error: ${err.message}`);
        }
      }

      if (rawAnswer && rawAnswer.trim().length > 0 && !rawAnswer.toLowerCase().includes("not available in the uploaded document")) {
        const citations = buildDocumentCitations(docChunks);
        const interactionId = await logInteraction({
          productId: effectiveProduct || "document",
          productName: docChunks[0].metadata?.product_name || effectiveProduct,
          question,
          answer: rawAnswer,
          citations,
          escalated: false,
        });

        return {
          answer: rawAnswer,
          citations,
          escalated: false,
          productName: docChunks[0].metadata?.product_name || effectiveProduct,
          hardwareVersion: effectiveVersion,
          usedSearch: false,
          usedMemory: false,
          interactionId,
        };
      }
    }
  }

  // 3. High-Priority FAQ & Support Dataset Lookup (686 verified entries)
  const faqChunks = queryFaqDocuments({ query: question, topK: 3 });
  if (faqChunks.length > 0 && (faqChunks[0].exactMatch || faqChunks[0].score >= 0.40)) {
    const topFaq = faqChunks[0];
    const faqAnswer = topFaq.metadata?.answer || topFaq.text;
    console.log(`[ChatService] Matched support dataset FAQ (score: ${topFaq.score.toFixed(3)}, exact: ${Boolean(topFaq.exactMatch)}): "${topFaq.metadata?.question}"`);

    const interactionId = await logInteraction({
      productId: effectiveProduct || "faq",
      productName: effectiveProduct || "Support Knowledge Base",
      question,
      answer: faqAnswer,
      citations: [
        {
          title: "Support Knowledge Base",
          url: "",
          source_type: "faq",
          score: topFaq.score,
        },
      ],
      escalated: false,
    });

    return {
      answer: faqAnswer,
      citations: [
        {
          title: "Support Knowledge Base",
          url: "",
          source_type: "faq",
          score: topFaq.score,
        },
      ],
      escalated: false,
      productName: effectiveProduct || null,
      hardwareVersion: effectiveVersion || null,
      usedSearch: false,
      usedMemory: false,
      interactionId,
    };
  }

  // 4. Strict Fallback when query is not present in support dataset or documentation
  const notFoundAnswer = productDocuments.length > 0
    ? "This information is not available in the uploaded document or support knowledge base."
    : "I don't know. This information is not present in the support dataset or uploaded documentation.";

  const interactionId = await logInteraction({
    productId: effectiveProduct || "unknown",
    productName: effectiveProduct || "Not Found",
    question,
    answer: notFoundAnswer,
    citations: [],
    escalated: false,
  });

  return {
    answer: notFoundAnswer,
    citations: [],
    escalated: false,
    productName: effectiveProduct || null,
    hardwareVersion: effectiveVersion || null,
    usedSearch: false,
    usedMemory: false,
    interactionId,
  };
}

export default { processChat };
