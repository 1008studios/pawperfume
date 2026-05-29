const crypto = require("node:crypto");

const DEFAULT_GRAPH_VERSION = "v21.0";
const GET_STARTED_PAYLOAD = "GET_STARTED";

function getGraphVersion() {
  return String(process.env.FB_GRAPH_VERSION || DEFAULT_GRAPH_VERSION).trim() || DEFAULT_GRAPH_VERSION;
}

function getAppSecretProof({ appSecret = process.env.FB_APP_SECRET, pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN } = {}) {
  if (!appSecret || !pageAccessToken) return "";
  return crypto.createHmac("sha256", appSecret).update(pageAccessToken).digest("hex");
}

function buildMessengerProfilePayload({ getStartedText = "Get Started" } = {}) {
  return {
    get_started: { payload: GET_STARTED_PAYLOAD },
    greeting: [
      { locale: "default", text: `Welcome to our page! 👋 Send us a message and we'll help you right away.` },
    ],
    persistent_menu: [
      {
        locale: "default",
        composer_input_disabled: false,
        call_to_actions: [
          { type: "postback", title: "Start Over", payload: GET_STARTED_PAYLOAD },
        ],
      },
    ],
  };
}

function buildMessengerProfileUrl({ fields = "", pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN } = {}) {
  const params = new URLSearchParams();
  if (pageAccessToken) params.set("access_token", pageAccessToken);
  if (fields) params.set("fields", fields);

  const proof = getAppSecretProof({ pageAccessToken });
  if (proof) params.set("appsecret_proof", proof);

  return `https://graph.facebook.com/${getGraphVersion()}/me/messenger_profile?${params.toString()}`;
}

async function setupMessengerProfile({ pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN, getStartedText } = {}) {
  if (!pageAccessToken) {
    return { ok: false, status: 0, error: "FB_PAGE_ACCESS_TOKEN not set" };
  }

  const profile = buildMessengerProfilePayload({ getStartedText });
  const fbRes = await fetch(buildMessengerProfileUrl({ pageAccessToken }), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  const data = await fbRes.json().catch(async () => ({ raw: await fbRes.text().catch(() => "") }));

  return {
    ok: fbRes.ok && data?.result !== "error",
    status: fbRes.status,
    data,
    get_started_payload: GET_STARTED_PAYLOAD,
    profile,
  };
}

async function getMessengerProfile({ pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN } = {}) {
  if (!pageAccessToken) {
    return { tested: false, ok: false, reason: "FB_PAGE_ACCESS_TOKEN missing" };
  }

  const fbRes = await fetch(buildMessengerProfileUrl({
    pageAccessToken,
    fields: "get_started,persistent_menu",
  }));
  const data = await fbRes.json().catch(async () => ({ raw: await fbRes.text().catch(() => "") }));
  const getStarted = Array.isArray(data?.data)
    ? data.data.find(item => item?.get_started)?.get_started
    : data?.get_started;

  return {
    tested: true,
    ok: fbRes.ok && Boolean(getStarted?.payload),
    status: fbRes.status,
    get_started_payload: getStarted?.payload || "",
    error: fbRes.ok ? "" : data?.error?.message || "Messenger profile fetch failed",
    data,
  };
}

module.exports = {
  GET_STARTED_PAYLOAD,
  buildMessengerProfilePayload,
  setupMessengerProfile,
  getMessengerProfile,
};
