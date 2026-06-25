import 'dart:async';
import 'dart:convert';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:http/http.dart' as http;
import 'package:nail_couture_webview/config/app_config.dart';
import 'package:permission_handler/permission_handler.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
}

class PushNotificationService {
  PushNotificationService._();

  static final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();
  static bool _initialized = false;
  static String? _cachedToken;

  static Future<void> initialize() async {
    if (_initialized) return;

    const androidSettings = AndroidInitializationSettings('@mipmap/launcher_icon');
    const initSettings = InitializationSettings(android: androidSettings);
    await _localNotifications.initialize(initSettings);

    final androidPlugin = _localNotifications
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >();
    await androidPlugin?.createNotificationChannel(
      const AndroidNotificationChannel(
        'default',
        'Nail Couture',
        description: 'Salon alerts and appointment updates',
        importance: Importance.high,
      ),
    );

    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      await Permission.notification.request();
    }

    try {
      await Firebase.initializeApp();
      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
      await FirebaseMessaging.instance.requestPermission();
      FirebaseMessaging.instance.onTokenRefresh.listen((token) {
        _cachedToken = token;
      });
      _cachedToken = await FirebaseMessaging.instance.getToken();
    } catch (error) {
      debugPrint('Firebase messaging unavailable: $error');
    }

    _initialized = true;
  }

  static Future<String?> getFcmToken() async {
    if (_cachedToken != null && _cachedToken!.isNotEmpty) {
      return _cachedToken;
    }
    try {
      _cachedToken = await FirebaseMessaging.instance.getToken();
      return _cachedToken;
    } catch (_) {
      return null;
    }
  }

  static Future<Map<String, dynamic>> registerTokenForPhone(String phone) async {
    final trimmedPhone = phone.trim();
    if (trimmedPhone.isEmpty) {
      return {'ok': false, 'message': 'Phone is required'};
    }

    final supabaseUrl = AppConfig.supabaseUrl;
    final supabaseAnonKey = AppConfig.supabaseAnonKey;
    if (supabaseUrl.isEmpty || supabaseAnonKey.isEmpty) {
      return {
        'ok': false,
        'message': 'Supabase is not configured for push registration',
      };
    }

    final fcmToken = await getFcmToken();
    if (fcmToken == null || fcmToken.isEmpty) {
      return {
        'ok': false,
        'message': 'FCM token unavailable. Add google-services.json and rebuild.',
      };
    }

    try {
      final response = await http.post(
        Uri.parse('$supabaseUrl/rest/v1/rpc/register_push_token'),
        headers: {
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'p_phone': trimmedPhone,
          'p_expo_push_token': 'fcm:$fcmToken',
          'p_platform': 'android',
          'p_device_name': 'Flutter WebView',
        }),
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return {'ok': true, 'token': fcmToken};
      }

      return {
        'ok': false,
        'message': 'Push registration failed (${response.statusCode})',
      };
    } catch (error) {
      return {'ok': false, 'message': 'Push registration failed: $error'};
    }
  }
}
