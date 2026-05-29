const { getAllFaqs, getBotFlowSteps, getBotFlowState, getMessages } = require("../api/db");

async function generateAIReply({ tenantId, tenant, conversationId, messageText, senderId }) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!apiKey || !tenant?.ai_enabled) return null;

  const systemPrompt = tenant?.ai_system_prompt || "You are a helpful business assistant. Keep replies short, friendly, and useful.";
  const language = tenant?.ai_language || "en";
  const tone = tenant?.ai_tone || "friendly";

  // Build context from recent messages + FAQs + flow state
  const faqs = await getAllFaqs(tenantId);
  const flowSteps = await getBotFlowSteps(tenantId);
  const flowState = await getBotFlowState(conversationId);
  const recentMessages = await getMessages(tenantId, conversationId, { limit: 10 });

  let context = `Business: ${tenant?.brand_name || tenant?.name || "A business"}\n`;
  context += `You speak in: ${language}. Tone: ${tone}.\n\n`;

  if (faqs.length > 0) {
    context += "FAQ Knowledge:\n";
    faqs.forEach(f => {
      context += `Q: ${f.question}\nA: ${f.answer}\n\n`;
    });
    context += "Use these FAQs when relevant. Only match if the question clearly relates.\n\n";
  }

  if (flowState && !flowState.is_complete && flowSteps.length > 0) {
    const currentStep = flowSteps.find(s => s.step_key === flowState.current_step);
    if (currentStep) {
      context += `Current conversation step: "${currentStep.step_label}"\n`;
      context += `We're asking: "${currentStep.prompt_message || 'Please respond'}".\n`;
      context += `Collected so far: ${JSON.stringify(flowState.collected_data || {})}\n`;
      context += `The customer should respond to this step. Help them if stuck, but don't skip steps.\n\n`;
    }
  }

  context += "Recent conversation:\n";
  recentMessages.forEach(m => {
    const who = m.sender_type === "customer" ? "Customer" : m.sender_type === "bot" ? "You" : "System";
    context += `${who}: ${m.content}\n`;
  });
  context += `Customer latest: ${messageText}\n\n`;
  context += "Reply to the customer (keep it short, 1-3 sentences, don't use markdown):";

  // Try Gemini first
  if (process.env.GEMINI_API_KEY) {
    try {
      return await callGemini(process.env.GEMINI_API_KEY, systemPrompt + "\n\n" + context);
    } catch (e) {
      console.warn("Gemini failed, trying fallback:", e.message);
    }
  }

  // Try OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      return await callOpenAI(process.env.OPENAI_API_KEY, systemPrompt, context);
    } catch (e) {
      console.warn("OpenAI failed:", e.message);
    }
  }

  // Try DeepSeek
  if (process.env.DEEPSEEK_API_KEY) {
    try {
      return await callDeepSeek(process.env.DEEPSEEK_API_KEY, systemPrompt, context);
    } catch (e) {
      console.warn("DeepSeek failed:", e.message);
    }
  }

  return null;
}

async function callGemini(apiKey, prompt) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-2.0-flash" });
  const result = await model.generateContent(prompt);
  const response = result.response.text();
  return response?.trim() || null;
}

async function callOpenAI(apiKey, systemPrompt, context) {
  const { OpenAI } = require("openai");
  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: context },
    ],
    max_tokens: 200,
    temperature: 0.7,
  });
  return completion.choices[0]?.message?.content?.trim() || null;
}

async function callDeepSeek(apiKey, systemPrompt, context) {
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: context },
      ],
      max_tokens: 200,
      temperature: 0.7,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

async function testAIConnection(apiKey) {
  try {
    if (!apiKey) return { ok: false, error: "No API key configured" };
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent("Say 'OK' if you can read this.");
    return { ok: true, response: result.response.text()?.trim() };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { generateAIReply, testAIConnection };
