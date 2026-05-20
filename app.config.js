 import { ExpoConfig } from "expo/config";
 const IS_DEV = process.env.APP_VARIANT === 'development';
 const IS_PREVIEW = process.env.APP_VARIANT === 'preview';
 

 const getUniqueIdentifier = () => {
  if (IS_DEV) {
    return 'com.hathaivuong.mobile.dev';
  }

  if (IS_PREVIEW) {
    return 'com.hathaivuong.mobile.preview';
  }

  return 'com.hathaivuong.mobile';
};

const getAppName = () => {
  if (IS_DEV) {
    return 'Embox (Dev)';
  }

  if (IS_PREVIEW) {
    return 'Embox (Preview)';
  }

  return 'Embox';
};


 export default ({config}: ExpoConfig): ExpoConfig => ({
    ...config,  // spread the config object
    "name": getAppName(),
    "slug": "embox",
    "uniqueIdentifier": getUniqueIdentifier(),
    "version": "1.0.2",
    "orientation": "default",
    "icon": "./assets/images/logo-ios.png",
    "scheme": "mobile",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "splash": {
      "backgroundColor": "#FFFFFF"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": getUniqueIdentifier(),
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/logo-android.png",
        "backgroundColor": "#FF815C"
      },
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false,
      "permissions": [
        "android.permission.BLUETOOTH",
        "android.permission.BLUETOOTH_ADMIN",
        "android.permission.BLUETOOTH_CONNECT",
        "android.permission.BLUETOOTH_SCAN",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION"
      ],
      "package": getUniqueIdentifier(),
    },
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "backgroundColor": "#FFFFFF",
          "image": "./assets/images/logo-ios.png",
          "imageWidth": 120,
          "dark": {
            "backgroundColor": "#FFFFFF",
            "image": "./assets/images/logo-ios.png"
          }
        }
      ],
      [
        "react-native-ble-manager",
        {
          "isBackgroundEnabled": false,
          "modes": [
            "central"
          ],
          "bluetoothAlwaysPermission": "Ứng dụng cần Bluetooth để cấu hình WiFi cho máy bán hàng qua BLE (BluFi).",
          "neverForLocation": false
        }
      ],
      "react-native-edge-to-edge",
      "./plugins/with-android-orientation-fixes"
    ],
    "experiments": {
      "typedRoutes": true
    },
    "extra": {
      "router": {},
      "eas": {
        "projectId": "d33df4d9-6b22-40da-b988-736561a57749"
      }
    },
    "owner": "hathaivuong"
  });
