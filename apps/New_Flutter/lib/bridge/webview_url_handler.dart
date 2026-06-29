import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:url_launcher/url_launcher.dart';

/// Returns true when the URL was handled externally (WebView should cancel navigation).
Future<bool> handleExternalWebViewUrl(WebUri? webUri) async {
  if (webUri == null) return false;

  final url = webUri.toString();
  final uri = Uri.tryParse(url);
  if (uri == null) return false;

  final scheme = uri.scheme.toLowerCase();

  if (scheme == 'http' || scheme == 'https') {
    return false;
  }

  if (scheme == 'intent') {
    return _launchAndroidIntent(url);
  }

  const externalSchemes = {
    'tel',
    'mailto',
    'sms',
    'smsto',
    'geo',
    'whatsapp',
    'fb',
    'instagram',
    'twitter',
    'tg',
  };

  if (externalSchemes.contains(scheme)) {
    return _launchUri(uri);
  }

  // Unknown schemes: try launching anyway, cancel WebView navigation.
  return _launchUri(uri);
}

Future<bool> _launchUri(Uri uri) async {
  try {
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
      return true;
    }
  } catch (e) {
    debugPrint('WebViewUrlHandler: failed to launch $uri — $e');
  }
  return true;
}

Future<bool> _launchAndroidIntent(String intentUrl) async {
  if (!Platform.isAndroid) {
    final fallback = _extractBrowserFallbackUrl(intentUrl);
    if (fallback != null) {
      return _launchUri(Uri.parse(fallback));
    }
    return true;
  }

  final fallback = _extractBrowserFallbackUrl(intentUrl);
  if (fallback != null) {
    final launched = await _launchUri(Uri.parse(fallback));
    if (launched) return true;
  }

  // url_launcher on Android can sometimes open intent URLs directly.
  try {
    final intentUri = Uri.parse(intentUrl);
    if (await canLaunchUrl(intentUri)) {
      await launchUrl(intentUri, mode: LaunchMode.externalApplication);
      return true;
    }
  } catch (e) {
    debugPrint('WebViewUrlHandler: intent launch failed — $e');
  }

  return true;
}

String? _extractBrowserFallbackUrl(String intentUrl) {
  final match = RegExp(
    r'S\.browser_fallback_url=([^;]+)',
    caseSensitive: false,
  ).firstMatch(intentUrl);
  if (match == null) return null;
  return Uri.decodeComponent(match.group(1)!);
}

Future<NavigationActionPolicy> navigationPolicyForUrl(WebUri? webUri) async {
  final handled = await handleExternalWebViewUrl(webUri);
  return handled
      ? NavigationActionPolicy.CANCEL
      : NavigationActionPolicy.ALLOW;
}
