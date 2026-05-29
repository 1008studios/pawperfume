const { describe, it } = require("node:test");
const assert = require("node:assert");

describe("Admin API", () => {
  it("should parse cookies", () => {
    assert.equal(parseCookies("token=abc123; theme=dark")["token"], "abc123");
  });
  it("should parse empty cookies", () => {
    assert.deepEqual(parseCookies(""), {});
  });
  it("should parse cookies with encoded values", () => {
    assert.equal(parseCookies("name=John%20Doe")["name"], "John Doe");
  });
});

describe("DB Module", () => {
  it("should export all required functions", () => {
    const db = require("../api/db");
    assert.equal(typeof db.getDb, "function");
    assert.equal(typeof db.getOrCreateConversation, "function");
    assert.equal(typeof db.logMessage, "function");
    // v2 new exports
    assert.equal(typeof db.getCustomFields, "function");
    assert.equal(typeof db.createCustomField, "function");
    assert.equal(typeof db.getBotFlowSteps, "function");
    assert.equal(typeof db.createBotFlowStep, "function");
    assert.equal(typeof db.createTenant, "function");
    assert.equal(typeof db.getAllTenants, "function");
    assert.equal(typeof db.getOrderStatuses, "function");
    assert.equal(typeof db.getFinanceCategories, "function");
    assert.equal(typeof db.getTags, "function");
    assert.equal(typeof db.createTag, "function");
  });
});

describe("Bot Flow Engine", () => {
  it("should export process and start functions", () => {
    const engine = require("../lib/bot-flow-engine");
    assert.equal(typeof engine.processMessageWithBotFlow, "function");
    assert.equal(typeof engine.startBotFlow, "function");
  });
});

describe("FAQ KB", () => {
  it("should match keywords", () => {
    const kb = require("../lib/faq-kb");
    const faqs = [{ question: "Test", answer: "Test answer", keywords: "hello, hi" }];
    assert.equal(kb.getFaqAnswer(faqs, "hello there"), "Test answer");
    assert.equal(kb.getFaqAnswer(faqs, "goodbye"), null);
  });
});

describe("Messenger Config", () => {
  it("should export subscribed fields", () => {
    const config = require("../lib/facebook-messenger-config");
    assert.ok(Array.isArray(config.FB_SUBSCRIBED_FIELDS_LIST));
    assert.ok(config.FB_SUBSCRIBED_FIELDS_LIST.includes("messages"));
  });
});

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  header.split(";").forEach(c => {
    const [key, ...val] = c.trim().split("=");
    if (key) cookies[key] = decodeURIComponent(val.join("="));
  });
  return cookies;
}
