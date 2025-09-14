import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Slide,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  GetApp as InstallIcon,
  Close as CloseIcon,
  Smartphone as MobileIcon,
  Computer as DesktopIcon,
} from '@mui/icons-material';
import { usePWA } from '../../hooks/usePWA';

interface PWAInstallPromptProps {
  onClose?: () => void;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ onClose }) => {
  const { isInstallable, installApp, isInstalled } = usePWA();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    if (isInstallable && !isInstalled) {
      // Show immediately for testing, or after 3 seconds for production
      const delay = process.env.NODE_ENV === 'development' ? 1000 : 3000;
      const timer = setTimeout(() => setIsVisible(true), delay);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled]);

  const handleInstall = async () => {
    await installApp();
    setIsVisible(false);
    onClose?.();
  };

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!isInstallable || isInstalled || !isVisible) {
    return null;
  }

  return (
    <Slide direction="up" in={isVisible} mountOnEnter unmountOnExit>
      <Box
        sx={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          right: 16,
          zIndex: theme.zIndex.snackbar,
          maxWidth: 400,
          margin: '0 auto',
        }}
      >
        <Card
          elevation={8}
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            color: theme.palette.primary.contrastText,
          }}
        >
          <CardContent sx={{ pb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" component="h3" gutterBottom>
                  ¡Instala la App!
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Accede más rápido y úsala sin conexión
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={handleClose}
                sx={{ color: 'inherit', opacity: 0.7 }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
              {isMobile ? <MobileIcon /> : <DesktopIcon />}
              <Typography variant="body2" sx={{ ml: 1, opacity: 0.8 }}>
                {isMobile ? 'Agregar a pantalla de inicio' : 'Instalar en escritorio'}
              </Typography>
            </Box>
          </CardContent>
          
          <CardActions sx={{ pt: 0 }}>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<InstallIcon />}
              onClick={handleInstall}
              fullWidth
              sx={{
                bgcolor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                '&:hover': {
                  bgcolor: theme.palette.grey[100],
                },
              }}
            >
              Instalar
            </Button>
          </CardActions>
        </Card>
      </Box>
    </Slide>
  );
};

export default PWAInstallPrompt;
