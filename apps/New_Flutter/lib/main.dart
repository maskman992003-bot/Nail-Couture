import 'package:flutter/material.dart';
import 'package:nail_couture_webview/screens/webview_shell_screen.dart';
import 'package:permission_handler/permission_handler.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await _requestStartupPermissions();
  runApp(const NailCoutureWebViewApp());
}

Future<void> _requestStartupPermissions() async {
  await [
    Permission.camera,
    Permission.microphone,
    Permission.locationWhenInUse,
    Permission.contacts,
    Permission.photos,
  ].request();
}

class NailCoutureWebViewApp extends StatelessWidget {
  const NailCoutureWebViewApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Nail Couture',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFC9A962),
          brightness: Brightness.dark,
        ),
        scaffoldBackgroundColor: const Color(0xFF121212),
        useMaterial3: true,
      ),
      home: const WebViewShellScreen(),
    );
  }
}
