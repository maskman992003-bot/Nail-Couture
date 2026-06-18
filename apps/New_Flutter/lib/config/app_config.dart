class AppConfig {
  AppConfig._();

  static const webUrl = String.fromEnvironment(
    'WEB_URL',
    defaultValue: 'https://www.nailcouture.net',
  );
}
