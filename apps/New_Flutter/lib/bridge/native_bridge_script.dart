const String nativeBridgeInjectionScript = '''
(function () {
  if (window.NativeBridge) {
    return;
  }

  function callNative(method, params) {
    if (!window.flutter_inappwebview || !window.flutter_inappwebview.callHandler) {
      return Promise.reject(new Error('NativeBridge is not available'));
    }

    return window.flutter_inappwebview.callHandler('NativeBridge', {
      method: method,
      params: params || {}
    });
  }

  window.NativeBridge = {
    requestContacts: function () {
      return callNative('requestContacts');
    },
    saveImageToGallery: function (imageData) {
      return callNative('saveImageToGallery', { imageData: imageData });
    },
    getLocation: function () {
      return callNative('getLocation');
    },
    startSmsListener: function () {
      return callNative('startSmsListener');
    },
    openCamera: function () {
      return callNative('openCamera');
    },
    saveFile: function (options) {
      return callNative('saveFile', options || {});
    },
    registerPushToken: function (options) {
      return callNative('registerPushToken', options || {});
    }
  };
})();
''';
