import React from 'react';
import {
  Alert,
  Snackbar,
  Box,
  Typography,
  IconButton,
  Slide,
  type SlideProps,
} from '@mui/material';
import {
  CloudOff as OfflineIcon,
  Wifi as OnlineIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useOfflineStatus } from '../../hooks/usePWA';

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="down" />;
}

export const OfflineIndicator: React.FC = () => {
  const isOffline = useOfflineStatus();
  const [showOnlineMessage, setShowOnlineMessage] = React.useState(false);
  const [wasOffline, setWasOffline] = React.useState(false);

  React.useEffect(() => {
    if (isOffline) {
      setWasOffline(true);
    } else if (wasOffline && !isOffline) {
      setShowOnlineMessage(true);
      const timer = setTimeout(() => {
        setShowOnlineMessage(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOffline, wasOffline]);

  const handleCloseOnline = () => {
    setShowOnlineMessage(false);
    setWasOffline(false);
  };

  return (
    <>
      {/* Indicador de offline persistente */}
      <Snackbar
        open={isOffline}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          severity="warning"
          icon={<OfflineIcon />}
          sx={{
            width: '100%',
            '& .MuiAlert-message': {
              display: 'flex',
              alignItems: 'center',
            },
          }}
        >
          <Box>
            <Typography variant="body2" fontWeight="medium">
              Sin conexión a internet
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              Trabajando en modo offline
            </Typography>
          </Box>
        </Alert>
      </Snackbar>

      {/* Notificación de reconexión */}
      <Snackbar
        open={showOnlineMessage}
        autoHideDuration={3000}
        onClose={handleCloseOnline}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          severity="success"
          icon={<OnlineIcon />}
          action={
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={handleCloseOnline}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          }
          sx={{ width: '100%' }}
        >
          <Typography variant="body2" fontWeight="medium">
            ¡Conexión restaurada!
          </Typography>
        </Alert>
      </Snackbar>
    </>
  );
};

export default OfflineIndicator;
