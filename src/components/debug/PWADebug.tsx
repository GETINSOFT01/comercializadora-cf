import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
} from '@mui/material';
import {
  GetApp as InstallIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { usePWA } from '../../hooks/usePWA';

export const PWADebug: React.FC = () => {
  const { 
    isInstallable, 
    isInstalled, 
    isOnline, 
    hasUpdate, 
    isLoading,
    installApp,
    updateApp,
    checkForUpdates 
  } = usePWA();

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 9999,
        maxWidth: 300,
      }}
    >
      <Card elevation={4}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            PWA Debug Panel
          </Typography>
          
          <Stack spacing={1} mb={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Installable:</Typography>
              <Chip 
                label={isInstallable ? 'Yes' : 'No'} 
                color={isInstallable ? 'success' : 'default'}
                size="small"
              />
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Installed:</Typography>
              <Chip 
                label={isInstalled ? 'Yes' : 'No'} 
                color={isInstalled ? 'success' : 'default'}
                size="small"
              />
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Online:</Typography>
              <Chip 
                label={isOnline ? 'Yes' : 'No'} 
                color={isOnline ? 'success' : 'error'}
                size="small"
              />
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Has Update:</Typography>
              <Chip 
                label={hasUpdate ? 'Yes' : 'No'} 
                color={hasUpdate ? 'warning' : 'default'}
                size="small"
              />
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Loading:</Typography>
              <Chip 
                label={isLoading ? 'Yes' : 'No'} 
                color={isLoading ? 'info' : 'default'}
                size="small"
              />
            </Box>
          </Stack>
          
          <Stack spacing={1}>
            <Button
              variant="contained"
              size="small"
              startIcon={<InstallIcon />}
              onClick={installApp}
              disabled={!isInstallable || isInstalled}
              fullWidth
            >
              Install App
            </Button>
            
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={updateApp}
              disabled={!hasUpdate}
              fullWidth
            >
              Update App
            </Button>
            
            <Button
              variant="text"
              size="small"
              startIcon={<InfoIcon />}
              onClick={checkForUpdates}
              fullWidth
            >
              Check Updates
            </Button>
          </Stack>
          
          <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
            Open DevTools Console for PWA logs
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PWADebug;
