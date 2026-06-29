import 'dart:async';
import 'dart:collection';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:nail_couture_webview/bridge/native_bridge_handler.dart';
import 'package:nail_couture_webview/bridge/native_bridge_script.dart';
import 'package:nail_couture_webview/bridge/webview_url_handler.dart';
import 'package:nail_couture_webview/config/app_config.dart';
import 'package:url_launcher/url_launcher.dart';

class WebViewShellScreen extends StatefulWidget {
  const WebViewShellScreen({super.key});

  @override
  State<WebViewShellScreen> createState() => _WebViewShellScreenState();
}

class _WebViewShellScreenState extends State<WebViewShellScreen> {
  static const _loadTimeout = Duration(seconds: 30);
  static const _userAgentSuffix = ' NailCoutureFlutter/1.0';
  static const _baseUserAgent =
      'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

  final GlobalKey _webViewKey = GlobalKey();

  InAppWebViewController? _webViewController;
  Timer? _loadTimeoutTimer;

  double _progress = 0;
  bool _pageVisible = false;
  bool _hasError = false;
  String? _errorMessage;

  @override
  void dispose() {
    _loadTimeoutTimer?.cancel();
    super.dispose();
  }

  void _armLoadTimeout() {
    _loadTimeoutTimer?.cancel();
    _loadTimeoutTimer = Timer(_loadTimeout, () {
      if (!mounted || _pageVisible || _hasError) {
        return;
      }
      setState(() {
        _hasError = true;
        _errorMessage =
            'Timed out loading ${AppConfig.webUrl}. Check your internet connection and try again.';
      });
    });
  }

  void _clearLoadTimeout() {
    _loadTimeoutTimer?.cancel();
    _loadTimeoutTimer = null;
  }

  Future<void> _reloadWebView() async {
    setState(() {
      _hasError = false;
      _errorMessage = null;
      _pageVisible = false;
      _progress = 0;
    });
    _armLoadTimeout();

    final controller = _webViewController;
    if (controller == null) {
      return;
    }

    await controller.loadUrl(
      urlRequest: URLRequest(url: WebUri(AppConfig.webUrl)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) {
          return;
        }

        final controller = _webViewController;
        if (controller != null && await controller.canGoBack()) {
          await controller.goBack();
          return;
        }

        if (context.mounted) {
          await SystemNavigator.pop();
        }
      },
      child: Scaffold(
        body: Column(
          children: [
            if (_progress > 0 && _progress < 1)
              LinearProgressIndicator(
                value: _progress,
                minHeight: 3,
                color: const Color(0xFFC9A962),
                backgroundColor: const Color(0xFF2A2A2A),
              ),
            Expanded(
              child: SafeArea(
                top: true,
                bottom: false,
                left: false,
                right: false,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    InAppWebView(
                    key: _webViewKey,
                    initialUrlRequest: URLRequest(
                      url: WebUri(AppConfig.webUrl),
                    ),
                    initialSettings: InAppWebViewSettings(
                      javaScriptEnabled: true,
                      domStorageEnabled: true,
                      databaseEnabled: true,
                      thirdPartyCookiesEnabled: true,
                      mediaPlaybackRequiresUserGesture: false,
                      allowsInlineMediaPlayback: true,
                      allowsBackForwardNavigationGestures: true,
                      geolocationEnabled: true,
                      iframeAllow: 'camera; microphone',
                      mixedContentMode:
                          MixedContentMode.MIXED_CONTENT_ALWAYS_ALLOW,
                      cacheEnabled: true,
                      transparentBackground: false,
                      underPageBackgroundColor: const Color(0xFF121212),
                      useWideViewPort: true,
                      loadWithOverviewMode: true,
                      supportZoom: false,
                      useOnRenderProcessGone: true,
                      useHybridComposition: true,
                      useShouldOverrideUrlLoading: true,
                      supportMultipleWindows: true,
                      userAgent: '$_baseUserAgent$_userAgentSuffix',
                    ),
                    initialUserScripts: UnmodifiableListView<UserScript>([
                      UserScript(
                        source: nativeBridgeInjectionScript,
                        injectionTime:
                            UserScriptInjectionTime.AT_DOCUMENT_START,
                      ),
                    ]),
                    onWebViewCreated: (controller) {
                      _webViewController = controller;
                      controller.addJavaScriptHandler(
                        handlerName: 'NativeBridge',
                        callback: NativeBridgeHandler.handle,
                      );
                      _armLoadTimeout();
                    },
                    onProgressChanged: (controller, progress) {
                      setState(() => _progress = progress / 100);
                    },
                    onLoadStart: (controller, url) {
                      setState(() {
                        _hasError = false;
                        _errorMessage = null;
                        _pageVisible = false;
                      });
                      _armLoadTimeout();
                    },
                    onPageCommitVisible: (controller, url) {
                      setState(() => _pageVisible = true);
                      _clearLoadTimeout();
                    },
                    onLoadStop: (controller, url) {
                      setState(() {
                        _hasError = false;
                        _errorMessage = null;
                        _pageVisible = true;
                      });
                      _clearLoadTimeout();
                    },
                    onReceivedError: (controller, request, error) {
                      if (request.isForMainFrame != true) {
                        return;
                      }
                      final failingUrl = request.url.toString();
                      if (failingUrl.startsWith('tel:') ||
                          failingUrl.startsWith('intent:') ||
                          failingUrl.startsWith('mailto:')) {
                        return;
                      }
                      _clearLoadTimeout();
                      setState(() {
                        _hasError = true;
                        _errorMessage =
                            'Unable to load ${AppConfig.webUrl}\n${error.description}';
                      });
                    },
                    onReceivedHttpError:
                        (controller, request, errorResponse) {
                      if (request.isForMainFrame != true) {
                        return;
                      }
                      final statusCode = errorResponse.statusCode;
                      if (statusCode != null && statusCode < 400) {
                        return;
                      }
                      _clearLoadTimeout();
                      setState(() {
                        _hasError = true;
                        _errorMessage =
                            'HTTP error $statusCode: ${errorResponse.reasonPhrase ?? 'Unknown'}';
                      });
                    },
                    onRenderProcessGone: (controller, detail) {
                      _clearLoadTimeout();
                      setState(() {
                        _hasError = true;
                        _errorMessage =
                            'The browser process stopped unexpectedly. Tap Retry.';
                        _pageVisible = false;
                      });
                    },
                    onReceivedServerTrustAuthRequest:
                        (controller, challenge) async {
                      return ServerTrustAuthResponse(
                        action: ServerTrustAuthResponseAction.PROCEED,
                      );
                    },
                    onConsoleMessage: (controller, consoleMessage) {
                      debugPrint(
                        'WebView console [${consoleMessage.messageLevel}]: ${consoleMessage.message}',
                      );
                    },
                    onPermissionRequest: (controller, request) async {
                      return PermissionResponse(
                        resources: request.resources,
                        action: PermissionResponseAction.GRANT,
                      );
                    },
                    onGeolocationPermissionsShowPrompt: (
                      controller,
                      origin,
                    ) async {
                      return GeolocationPermissionShowPromptResponse(
                        origin: origin,
                        allow: true,
                        retain: true,
                      );
                    },
                    shouldOverrideUrlLoading: (controller, navigationAction) async {
                      return navigationPolicyForUrl(
                        navigationAction.request.url,
                      );
                    },
                    onCreateWindow: (controller, createWindowAction) async {
                      final url = createWindowAction.request.url;
                      if (url != null) {
                        final uri = Uri.tryParse(url.toString());
                        if (uri != null) {
                          await launchUrl(
                            uri,
                            mode: LaunchMode.externalApplication,
                          );
                        }
                      }
                      return false;
                    },
                  ),
                  if (_hasError)
                    ColoredBox(
                      color: const Color(0xFF121212),
                      child: Center(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 24),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.error_outline,
                                color: Colors.white70,
                                size: 64,
                              ),
                              const SizedBox(height: 16),
                              Text(
                                _errorMessage ?? 'Unable to load the web page.',
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  color: Colors.white70,
                                  fontSize: 16,
                                ),
                              ),
                              const SizedBox(height: 24),
                              FilledButton.icon(
                                onPressed: _reloadWebView,
                                icon: const Icon(Icons.refresh),
                                label: const Text('Retry'),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
