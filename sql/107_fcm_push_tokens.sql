-- Migration 107: FCM push tokens for Flutter WebView APK
-- FCM device tokens are stored in device_push_tokens.expo_push_token with prefix "fcm:".
-- Configure FCM_SERVER_KEY on the send-notification-push edge function to deliver them.

-- No schema change required; register_push_token already accepts arbitrary token strings.
