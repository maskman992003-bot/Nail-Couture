import { AppModal, ModalButton } from './AppModal';
import { Icon } from './icons/Icon';

export { BELL_PATH, LOGOUT_PATH } from '@nail-couture/shared/icons/paths.js';

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

export function HeaderIcon({
  path,
  color,
  size = 22,
}: {
  path: string;
  color: string;
  size?: number;
}) {
  return <Icon path={path} color={color} size={size} />;
}
