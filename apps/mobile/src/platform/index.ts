import { Platform } from 'react-native';

export const isWindows = Platform.OS === 'windows';
export const isNativeMobile = Platform.OS === 'ios' || Platform.OS === 'android';
