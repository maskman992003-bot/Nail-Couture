import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useIdleTimer } from 'react-idle-timer';
import { useAuth } from './AuthContext.jsx';
import { CHECK_IN_ROLE } from '@nail-couture/shared/utils/routes';
import {
  fetchRoleSessionSettings,
  getDefaultSessionSettingsForRole,
  subscribeToRoleSessionSettingsChanges,
} from '@nail-couture/shared/utils/roleSessionSettings.js';
import SessionTimeoutWarningModal from '../components/SessionTimeoutWarningModal.jsx';

const SESSION_POLL_MS = 15000;
const IDLE_EVENTS = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'touchmove', 'scroll'];

const IdleSessionContext = createContext({});

function IdleSessionController({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [settings, setSettings] = useState(() => getDefaultSessionSettingsForRole(user?.role));
  const [warningRemainingSeconds, setWarningRemainingSeconds] = useState(60);
  const logoutRef = useRef(logout);
  const navigateRef = useRef(navigate);

  const isTimerDisabled = !user || user.role === CHECK_IN_ROLE;

  useEffect(() => {
    logoutRef.current = logout;
    navigateRef.current = navigate;
  }, [logout, navigate]);

  const handleForceLogout = useCallback(() => {
    setShowWarning(false);
    logoutRef.current();
    navigateRef.current('/login', { replace: true });
  }, []);

  const applySettings = useCallback((nextSettings) => {
    setSettings(nextSettings);
    setShowWarning(false);
  }, []);

  useEffect(() => {
    if (isTimerDisabled) {
      return undefined;
    }

    let cancelled = false;

    async function syncFromDatabase() {
      const remoteSettings = await fetchRoleSessionSettings(user.role);
      if (!cancelled) {
        applySettings(remoteSettings);
      }
    }

    void syncFromDatabase();

    const unsubscribeRealtime = subscribeToRoleSessionSettingsChanges(user.role, (remoteSettings) => {
      if (!cancelled) {
        applySettings(remoteSettings);
      }
    });

    const pollId = window.setInterval(() => {
      void syncFromDatabase();
    }, SESSION_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      unsubscribeRealtime();
    };
  }, [user?.role, isTimerDisabled, applySettings]);

  const idleTimer = useIdleTimer({
    timeout: settings.idle_timeout_seconds * 1000,
    promptBeforeIdle: settings.warning_duration_seconds * 1000,
    events: IDLE_EVENTS,
    crossTab: true,
    disabled: isTimerDisabled,
    onPrompt: () => {
      setWarningRemainingSeconds(settings.warning_duration_seconds);
      setShowWarning(true);
    },
    onActive: () => {
      setShowWarning(false);
    },
    onIdle: handleForceLogout,
  });

  useEffect(() => {
    if (isTimerDisabled) return;
    idleTimer.reset();
  }, [
    settings.idle_timeout_seconds,
    settings.warning_duration_seconds,
    isTimerDisabled,
    idleTimer,
  ]);

  useEffect(() => {
    if (!showWarning || isTimerDisabled) return undefined;

    const updateRemaining = () => {
      const remainingMs = idleTimer.getRemainingTime();
      setWarningRemainingSeconds(Math.max(0, Math.ceil(remainingMs / 1000)));
    };

    updateRemaining();
    const intervalId = window.setInterval(updateRemaining, 1000);

    return () => window.clearInterval(intervalId);
  }, [showWarning, isTimerDisabled, idleTimer]);

  return (
    <>
      {children}
      <SessionTimeoutWarningModal
        open={showWarning && !isTimerDisabled}
        remainingSeconds={warningRemainingSeconds}
      />
    </>
  );
}

export function IdleSessionProvider({ children }) {
  const { user } = useAuth();

  return (
    <IdleSessionContext.Provider value={{}}>
      <IdleSessionController key={user?.phone ?? 'anonymous'}>
        {children}
      </IdleSessionController>
    </IdleSessionContext.Provider>
  );
}
