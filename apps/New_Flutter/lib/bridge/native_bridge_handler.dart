import 'dart:convert';
import 'dart:io';

import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:share_plus/share_plus.dart';
import 'package:nail_couture_webview/push/push_notification_service.dart';

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
      case 'openCamera':
        return _openCamera();
      case 'saveFile':
        return _saveFile(params);
      case 'registerPushToken':
        return _registerPushToken(params);
      default:
        return _error('Unknown NativeBridge method: $method');
    }
  }

  static Future<Map<String, dynamic>> _openCamera() async {
    final status = await Permission.camera.status;
    if (!status.isGranted) {
      final result = await Permission.camera.request();
      if (!result.isGranted) {
        return _error('Camera permission denied');
      }
    }

    final picker = ImagePicker();
    final image = await picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 85,
      preferredCameraDevice: CameraDevice.rear,
    );

    if (image == null) {
      return {'ok': false, 'message': 'Camera cancelled'};
    }

    final bytes = await image.readAsBytes();
    final mimeType = image.mimeType ?? 'image/jpeg';

    return {
      'ok': true,
      'base64': base64Encode(bytes),
      'mimeType': mimeType,
      'filename': image.name.isNotEmpty ? image.name : 'camera.jpg',
    };
  }

  static Future<Map<String, dynamic>> _saveFile(
    Map<String, dynamic> params,
  ) async {
    final content = params['content'] as String?;
    final filename = params['filename'] as String? ?? 'export.csv';
    final mimeType = params['mimeType'] as String? ?? 'text/csv';

    if (content == null || content.isEmpty) {
      return _error('content is required');
    }

    try {
      final directory = await getTemporaryDirectory();
      final safeName = filename.replaceAll(RegExp(r'[\\/:*?"<>|]'), '_');
      final file = File('${directory.path}/$safeName');
      await file.writeAsString(content, flush: true);

      await Share.shareXFiles(
        [XFile(file.path, mimeType: mimeType, name: safeName)],
        subject: safeName,
      );

      return {'ok': true, 'path': file.path};
    } catch (error) {
      return _error('Failed to save file: $error');
    }
  }

  static Future<Map<String, dynamic>> _registerPushToken(
    Map<String, dynamic> params,
  ) async {
    final phone = params['phone'] as String? ?? '';
    return PushNotificationService.registerTokenForPhone(phone);
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
