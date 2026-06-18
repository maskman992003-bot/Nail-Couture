import 'dart:collection';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:nail_couture_webview/bridge/native_bridge_handler.dart';
import 'package:nail_couture_webview/bridge/native_bridge_script.dart';
import 'package:nail_couture_webview/config/app_config.dart';

class WebViewShellScreen extends StatefulWidget {
  const WebViewShellScreen({super.key});

  @override
  State<WebViewShellScreen> createState() => _WebViewShellScreenState();
}

class _WebViewShellScreenState extends State<WebViewShellScreen> {
  InAppWebViewController? _webViewController;
  double _progress = 0;

  static const _androidMediaResources = <String>{
    'android.webkit.resource.VIDEO_CAPTURE',
    'android.webkit.resource.AUDIO_CAPTURE',
  };

  static final _mediaResources = <PermissionResourceType>{
    PermissionResourceType.CAMERA,
    PermissionResourceType.MICROPHONE,
    PermissionResourceType.CAMERA_AND_MICROPHONE,
    PermissionResourceType.GEOLOCATION,
  };

  // ignore: deprecated_member_use
  Future<PermissionRequestResponse?> _grantAndroidPermissionRequest(
    List<String> resources,
  ) async {
    final allowed =
        resources.where(_androidMediaResources.contains).toList();

    if (allowed.isEmpty) {
      return PermissionRequestResponse(
        resources: resources,
        action: PermissionRequestResponseAction.DENY,
      );
    }

    return PermissionRequestResponse(
      resources: allowed,
      action: PermissionRequestResponseAction.GRANT,
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
        body: SafeArea(
          child: Column(
            children: [
              if (_progress < 1)
                LinearProgressIndicator(
                  value: _progress,
                  minHeight: 2,
                  backgroundColor: Colors.transparent,
                ),
              Expanded(
                child: InAppWebView(
                  initialUrlRequest: URLRequest(
                    url: WebUri(AppConfig.webUrl),
                  ),
                  initialSettings: InAppWebViewSettings(
                    javaScriptEnabled: true,
                    domStorageEnabled: true,
                    mediaPlaybackRequiresUserGesture: false,
                    allowsInlineMediaPlayback: true,
                    allowsBackForwardNavigationGestures: true,
                    geolocationEnabled: true,
                    iframeAllow: 'camera; microphone',
                    useHybridComposition: true,
                  ),
                  initialUserScripts: UnmodifiableListView<UserScript>([
                    UserScript(
                      source: nativeBridgeInjectionScript,
                      injectionTime: UserScriptInjectionTime.AT_DOCUMENT_START,
                    ),
                  ]),
                  onWebViewCreated: (controller) {
                    _webViewController = controller;
                    controller.addJavaScriptHandler(
                      handlerName: 'NativeBridge',
                      callback: NativeBridgeHandler.handle,
                    );
                  },
                  onProgressChanged: (controller, progress) {
                    setState(() => _progress = progress / 100);
                  },
                  androidOnPermissionRequest: (
                    controller,
                    origin,
                    resources,
                  ) {
                    return _grantAndroidPermissionRequest(resources);
                  },
                  onPermissionRequest: (controller, request) async {
                    final allowed = request.resources
                        .where(_mediaResources.contains)
                        .toList();

                    if (allowed.isEmpty) {
                      return PermissionResponse(
                        resources: request.resources,
                        action: PermissionResponseAction.DENY,
                      );
                    }

                    return PermissionResponse(
                      resources: allowed,
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
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
