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

  /// Supabase project URL for native push token registration.
  static String get supabaseUrl {
    const fromEnv = String.fromEnvironment('SUPABASE_URL');
    return fromEnv;
  }

  /// Supabase anon key for native push token registration.
  static String get supabaseAnonKey {
    const fromEnv = String.fromEnvironment('SUPABASE_ANON_KEY');
    return fromEnv;
  }
}
