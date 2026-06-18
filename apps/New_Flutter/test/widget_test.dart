import 'package:flutter_test/flutter_test.dart';
import 'package:nail_couture_webview/config/app_config.dart';

void main() {
  test('default web URL points at production site', () {
    expect(AppConfig.webUrl, 'https://www.nailcouture.net');
  });
}
