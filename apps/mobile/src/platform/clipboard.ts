import { Platform } from 'react-native';
import * as ExpoClipboard from 'expo-clipboard';

/**
 * Clipboard helper with Windows-safe fallback (expo-clipboard has no RNW native module).
 */
export async function setClipboardString(text: string): Promise<boolean> {
  if (Platform.OS === 'windows') {
    try {
      // Optional: @react-native-clipboard/clipboard when linked on Windows
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Clipboard = require('@react-native-clipboard/clipboard').default;
      Clipboard.setString(text);
      return true;
    } catch {
      return false;
    }
  }

  await ExpoClipboard.setStringAsync(text);
  return true;
}
