import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Container,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { configureApiForNative } from '../api/axios.interceptor';
import {
  checkServerConnection,
  DEFAULT_SERVER_URL,
  isNativeApp,
  loadServerConfig,
  saveServerConfig,
  type ServerConfig,
  type ServerProblem,
} from './server-config';

type GateStatus = 'loading' | 'editing' | 'ready';

type ServerConfigContextValue = {
  editServerConfig: () => void;
};

const ServerConfigContext = createContext<ServerConfigContextValue>({
  editServerConfig: () => {},
});

export const useServerConfig = () => useContext(ServerConfigContext);

// Typed into a phone: keep the keyboard from capitalizing or "correcting".
const PLAIN_INPUT = {
  autoCapitalize: 'none',
  autoCorrect: 'off',
  spellCheck: false,
};

const describeProblem = (problem: ServerProblem, serverUrl: string) =>
  problem === 'unreachable'
    ? `Couldn't reach ${serverUrl}. Check the address and your connection.`
    : `${serverUrl} answered, but not as Omega. If Cloudflare Access protects it, check the service token.`;

/**
 * Holds the Android app back until it knows how to reach Omega (see
 * server-config.ts), asking on first launch. Passes straight through on the
 * web, which Omega serves itself.
 */
export const ServerConfigGate: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [status, setStatus] = useState<GateStatus>(
    isNativeApp() ? 'loading' : 'ready'
  );
  const [savedConfig, setSavedConfig] = useState<ServerConfig | null>(null);

  useEffect(() => {
    if (!isNativeApp()) {
      return;
    }
    loadServerConfig()
      .then(config => {
        if (config) {
          configureApiForNative(config);
          setSavedConfig(config);
          setStatus('ready');
        } else {
          setStatus('editing');
        }
      })
      .catch(error => {
        console.error('Failed to load server settings:', error);
        setStatus('editing');
      });
  }, []);

  const contextValue = useMemo(
    () => ({ editServerConfig: () => setStatus('editing') }),
    []
  );

  if (status === 'loading') {
    return null;
  }

  if (status === 'editing') {
    return (
      <ServerConfigForm
        initialConfig={savedConfig}
        onSaved={config => {
          configureApiForNative(config);
          setSavedConfig(config);
          setStatus('ready');
        }}
        onCancel={savedConfig ? () => setStatus('ready') : undefined}
      />
    );
  }

  return (
    <ServerConfigContext.Provider value={contextValue}>
      {children}
    </ServerConfigContext.Provider>
  );
};

type ServerConfigFormProps = {
  initialConfig: ServerConfig | null;
  onSaved: (config: ServerConfig) => void;
  onCancel?: () => void;
};

const ServerConfigForm: React.FC<ServerConfigFormProps> = ({
  initialConfig,
  onSaved,
  onCancel,
}) => {
  const [serverUrl, setServerUrl] = useState(
    initialConfig?.serverUrl ?? DEFAULT_SERVER_URL
  );
  const [accessClientId, setAccessClientId] = useState(
    initialConfig?.accessClientId ?? ''
  );
  const [accessClientSecret, setAccessClientSecret] = useState(
    initialConfig?.accessClientSecret ?? ''
  );
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const config: ServerConfig = {
      serverUrl: serverUrl.trim().replace(/\/+$/, ''),
      accessClientId: accessClientId.trim(),
      accessClientSecret: accessClientSecret.trim(),
    };
    if (!/^https?:\/\/[^/]+/.test(config.serverUrl)) {
      setError('Enter the full address, starting with https://');
      return;
    }
    if (!config.accessClientId !== !config.accessClientSecret) {
      setError('Enter both the client ID and the secret, or leave both blank.');
      return;
    }

    setIsChecking(true);
    try {
      const problem = await checkServerConnection(config);
      if (problem) {
        setError(describeProblem(problem, config.serverUrl));
        return;
      }
      await saveServerConfig(config);
      onSaved(config);
    } catch (saveError) {
      console.error('Failed to save server settings:', saveError);
      setError("Couldn't save these settings. Try again.");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Container
      maxWidth="sm"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Card elevation={3} sx={{ maxWidth: 400, width: '100%', mx: 'auto' }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3} component="form" onSubmit={handleSubmit}>
            <Stack spacing={1}>
              <Typography variant="h5" component="h1" fontWeight={600}>
                Connect to Omega
              </Typography>
              <Typography variant="body2" color="text.secondary">
                The server this app talks to. If Cloudflare Access protects it,
                add a service token for this device; leave those blank if not.
              </Typography>
            </Stack>

            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Server address"
              placeholder="https://omega.example.com"
              type="url"
              value={serverUrl}
              onChange={e => setServerUrl(e.target.value)}
              required
              disabled={isChecking}
              fullWidth
              slotProps={{ htmlInput: PLAIN_INPUT }}
            />
            <TextField
              label="Access client ID"
              value={accessClientId}
              onChange={e => setAccessClientId(e.target.value)}
              disabled={isChecking}
              fullWidth
              slotProps={{ htmlInput: PLAIN_INPUT }}
            />
            <TextField
              label="Access client secret"
              type="password"
              value={accessClientSecret}
              onChange={e => setAccessClientSecret(e.target.value)}
              disabled={isChecking}
              fullWidth
              slotProps={{ htmlInput: PLAIN_INPUT }}
            />

            <Stack spacing={1}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isChecking}
                fullWidth
                sx={{
                  py: 1.5,
                  borderRadius: '9999px',
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                }}
              >
                {isChecking ? 'Checking…' : 'Connect'}
              </Button>
              {onCancel && (
                <Button
                  onClick={onCancel}
                  disabled={isChecking}
                  sx={{ textTransform: 'none' }}
                >
                  Cancel
                </Button>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
};
