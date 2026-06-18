import 'package:permission_handler/permission_handler.dart';

class NativeBridgeHandler {
  static Future<Map<String, dynamic>> handle(List<dynamic> args) async {
    if (args.isEmpty || args.first is! Map) {
      return _error('Invalid bridge payload');
    }

    final payload = Map<String, dynamic>.from(args.first as Map);
    final method = payload['method'] as String?;
    final params = payload['params'] is Map
        ? Map<String, dynamic>.from(payload['params'] as Map)
        : <String, dynamic>{};

    switch (method) {
      case 'requestContacts':
        return _requestContacts();
      case 'saveImageToGallery':
        return _saveImageToGallery(params);
      case 'getLocation':
        return _getLocation();
      case 'startSmsListener':
        return _startSmsListener();
      default:
        return _error('Unknown NativeBridge method: $method');
    }
  }

  static Future<Map<String, dynamic>> _requestContacts() async {
    final status = await Permission.contacts.status;
    if (!status.isGranted) {
      await Permission.contacts.request();
    }

    return {
      'ok': false,
      'stub': true,
      'contacts': <Map<String, dynamic>>[],
      'message': 'Native contacts bridge not yet implemented',
    };
  }

  static Future<Map<String, dynamic>> _saveImageToGallery(
    Map<String, dynamic> params,
  ) async {
    final imageData = params['imageData'];

    if (imageData == null || (imageData is String && imageData.isEmpty)) {
      return _error('imageData is required');
    }

    final status = await Permission.photos.status;
    if (!status.isGranted && !status.isLimited) {
      await Permission.photos.request();
    }

    return {
      'ok': false,
      'stub': true,
      'message': 'Gallery save not yet implemented',
    };
  }

  static Future<Map<String, dynamic>> _getLocation() async {
    final status = await Permission.locationWhenInUse.status;
    if (!status.isGranted) {
      await Permission.locationWhenInUse.request();
    }

    return {
      'ok': false,
      'stub': true,
      'lat': null,
      'lng': null,
      'message': 'Location bridge not yet implemented',
    };
  }

  static Future<Map<String, dynamic>> _startSmsListener() async {
    return {
      'ok': false,
      'stub': true,
      'listening': false,
      'message': 'SMS listener not yet implemented (Android-only when implemented)',
    };
  }

  static Map<String, dynamic> _error(String message) {
    return {
      'ok': false,
      'stub': true,
      'message': message,
    };
  }
}
