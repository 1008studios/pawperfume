const FB_SUBSCRIBED_FIELDS_LIST = [
  "messages",
  "messaging_postbacks",
  "message_echoes",
  "standby",
];

const FB_SUBSCRIBED_FIELDS = FB_SUBSCRIBED_FIELDS_LIST.join(",");
const WEBHOOK_DEBUG_SETTING_PREFIX = "latest_webhook_event_for_sender_";

module.exports = {
  FB_SUBSCRIBED_FIELDS,
  FB_SUBSCRIBED_FIELDS_LIST,
  WEBHOOK_DEBUG_SETTING_PREFIX,
};
