function getFaqAnswer(faqs, message) {
  if (!faqs || faqs.length === 0) return null;
  const text = message.toLowerCase().trim();
  for (const faq of faqs) {
    const keywords = (faq.keywords || "").toLowerCase().split(",").map(k => k.trim());
    if (keywords.some(k => text.includes(k))) return faq.answer;
  }
  return null;
}

module.exports = { getFaqAnswer };
