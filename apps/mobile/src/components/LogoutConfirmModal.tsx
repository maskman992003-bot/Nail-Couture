import Svg, { Path } from 'react-native-svg';
import { AppModal, ModalButton } from './AppModal';

type LogoutConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function LogoutConfirmModal({ open, onClose, onConfirm }: LogoutConfirmModalProps) {
  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Log Out?"
      subtitle="Are you sure you want to log out of your account?"
      footer={
        <>
          <ModalButton label="Cancel" onPress={onClose} />
          <ModalButton
            label="Log Out"
            variant="primary"
            onPress={() => {
              onClose();
              onConfirm();
            }}
          />
        </>
      }
    />
  );
}

const BELL_PATH =
  'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9';

const LOGOUT_PATH =
  'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1';

export { BELL_PATH, LOGOUT_PATH };

export function HeaderIcon({ path, color, size = 22 }: { path: string; color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={path} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
