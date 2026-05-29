const crypto = require("node:crypto");
const {
  getTenantBySlug, getOrCreateConversation, logMessage, isBotEnabled, getAllFaqs,
  getCustomFields, getBotFlowSteps, getBotFlowState, updateBotFlowState,
} = require("./db");
const { processMessageWithBotFlow, startBotFlow } = require("../lib/bot-flow-engine");
const { generateAIReply } = require("../lib/ai-reply");

function getAppSecretProof(accessToken) {
  if (!process.env.FB_APP_SECRET || !accessToken) return "";
  return crypto.createHmac("sha256", process.env.FB_APP_SECRET).update(accessToken).digest("hex");
}

module.exports = async function webhookHandler(req, res) {
  if (req.method === "GET") {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === process.env.FB_VERIFY_TOKEN) {
      res.writeHead(200, { "Content-Type": "text/plain" });
      return res.end(url.searchParams.get("hub.challenge") || "");
    }
    res.writeHead(403);
    return res.end("Forbidden");
  }

  if (req.method !== "POST") { res.writeHead(405); return res.end("Method not allowed"); }

  let body = "";
  req.on("data", chunk => { body += chunk; });
  req.on("end", async () => {
    try {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("EVENT_RECEIVED");
      await processWebhookEvents(JSON.parse(body)).catch(err => console.error("Webhook error:", err.message));
    } catch (e) {
      console.error("Webhook parse error:", e.message);
      res.writeHead(400);
      res.end("Bad request");
    }
  });
};

async function processWebhookEvents(data) {
  if (!data?.entry) return;
  for (const entry of data.entry) {
    for (const event of entry.messaging || []) {
      await processMessagingEvent(event);
    }
  }
}

async function processMessagingEvent(event) {
  const senderId = event.sender?.id;
  const message = event.message;
  const postback = event.postback;
  if (!senderId) return;

  const tenant = await getTenantBySlug("default") || {};
  const tenantId = tenant.id || 1;

  const conversation = await getOrCreateConversation(tenantId, senderId, null);

  // Handle GET_STARTED postback
  if (postback?.payload === "GET_STARTED") {
    const welcome = tenant.brand_welcome_message || "Hello! How can we help you today?";
    await logMessage(tenantId, { conversationId: conversation.id, senderType: "system", messageType: "text", content: welcome });
    await sendFacebookMessage(senderId, welcome);

    // Start bot flow if configured
    const botEnabled = await isBotEnabled(tenantId, conversation.id);
    if (botEnabled) {
      const flowResult = await startBotFlow({ tenantId, conversationId: conversation.id, tenant });
      if (flowResult?.reply) {
        await sendFacebookMessage(senderId, flowResult.reply);
        await logMessage(tenantId, { conversationId: conversation.id, senderType: "bot", messageType: "text", content: flowResult.reply });
      }
    }
    return;
  }

  if (message?.text) {
    const text = message.text;
    await logMessage(tenantId, {
      conversationId: conversation.id, senderType: "customer",
      messageType: "text", content: text, mid: message.mid,
    });

    const botEnabled = await isBotEnabled(tenantId, conversation.id);
    if (!botEnabled) return;

    // Try FAQ matching
    const faqs = await getAllFaqs(tenantId);
    for (const faq of faqs) {
      const keywords = (faq.keywords || "").toLowerCase().split(",").map(k => k.trim().toLowerCase());
      if (keywords.some(k => text.toLowerCase().includes(k))) {
        await sendFacebookMessage(senderId, faq.answer);
        await logMessage(tenantId, { conversationId: conversation.id, senderType: "bot", messageType: "text", content: faq.answer });
        return;
      }
    }

    // Try bot flow engine
    const flowResult = await processMessageWithBotFlow({ tenantId, conversationId: conversation.id, messageText: text, tenant });
    if (flowResult?.reply) {
      await sendFacebookMessage(senderId, flowResult.reply);
      await logMessage(tenantId, { conversationId: conversation.id, senderType: "bot", messageType: "text", content: flowResult.reply });

      // If flow is complete, auto-create an order from collected data
      if (flowResult.collectedData && Object.keys(flowResult.collectedData).length > 0) {
        const customFields = await getCustomFields(tenantId);
        const ordersFields = customFields.filter(f => f.apply_to === "orders" || f.apply_to === "both");
        const autoCreateOrder = ordersFields.length > 0; // Only if custom fields are defined

        if (autoCreateOrder) {
          const { createOrder } = require("./db");
          await createOrder(tenantId, {
            conversationId: conversation.id,
            customerName: flowResult.collectedData.customer_name || flowResult.collectedData.name || conversation.name || "Customer",
            status: "new",
            customFields: flowResult.collectedData,
          });
        }
      }
      return;
    }

    // AI reply (with context from FAQs, flow state, and conversation history)
    if (tenant.ai_enabled) {
      const aiReply = await generateAIReply({ tenantId, tenant, conversationId: conversation.id, messageText: text, senderId });
      if (aiReply) {
        await sendFacebookMessage(senderId, aiReply);
        await logMessage(tenantId, { conversationId: conversation.id, senderType: "bot", messageType: "text", content: aiReply });
        return;
      }
    }

    // Ultimate fallback
    const fallback = "Thanks for your message! We'll get back to you as soon as possible.";
    await sendFacebookMessage(senderId, fallback);
    await logMessage(tenantId, { conversationId: conversation.id, senderType: "bot", messageType: "text", content: fallback });
  }

  if (message?.attachments) {
    for (const att of message.attachments) {
      await logMessage(tenantId, {
        conversationId: conversation.id, senderType: "customer",
        messageType: att.type || "file",
        content: `[${att.type}]${att.payload?.url ? " " + att.payload.url : ""}`,
        mediaUrl: att.payload?.url || "", mid: message.mid,
      });

      // Handle image uploads in bot flow
      const state = await getBotFlowState(conversation.id);
      if (state && !state.is_complete && att.type === "image") {
        const steps = await getBotFlowSteps(tenantId);
        const currentStep = steps.find(s => s.step_key === state.current_step);
        if (currentStep?.step_type === "image_upload") {
          const varName = currentStep.input_variable || currentStep.step_key;
          const collected = state.collected_data || {};
          collected[varName] = att.payload?.url || "uploaded";
          await updateBotFlowState(conversation.id, {
            currentStep: currentStep.next_step,
            collectedData: collected,
          });
          const nextStep = currentStep.next_step ? steps.find(s => s.step_key === currentStep.next_step) : null;
          if (nextStep?.prompt_message) {
            await sendFacebookMessage(senderId, nextStep.prompt_message);
          }
        }
      }
    }
  }
}

async function sendFacebookMessage(recipientId, text) {
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!token) return;
  try {
    const proof = getAppSecretProof(token);
    await fetch(
      `https://graph.facebook.com/v21.0/me/messages?access_token=${token}${proof ? `&appsecret_proof=${proof}` : ""}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: { id: recipientId }, message: { text }, messaging_type: "RESPONSE" }),
      }
    );
  } catch (e) {
    console.error("Facebook send failed:", e.message);
  }
}
