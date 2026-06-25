class AppConfig {
  AppConfig._();

  static const productionWebUrl = 'https://www.nailcouture.net';

  /// Resolves the site URL from `--dart-define=WEB_URL=...`.
  /// Empty defines fall back to production so release APKs never load a blank URL.
  static String get webUrl {
    const fromEnv = String.fromEnvironment('WEB_URL');
    if (fromEnv.isNotEmpty) {
      return fromEnv;
    }
    return productionWebUrl;
  }
}
