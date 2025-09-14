import { Button, Typography, Paper } from '@mui/material';
import { Login as LoginIcon } from '@mui/icons-material';

interface DemoLoginButtonProps {
  onDemoLogin: () => void;
}

export default function DemoLoginButton({ onDemoLogin }: DemoLoginButtonProps) {
  return (
    <Paper elevation={3} sx={{ p: 3, mt: 2, backgroundColor: '#f5f5f5' }}>
      <Typography variant="h6" gutterBottom color="primary">
        Acceso de Demostración
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Para probar la aplicación sin necesidad de crear una cuenta
      </Typography>
      <Button
        variant="contained"
        color="primary"
        fullWidth
        startIcon={<LoginIcon />}
        onClick={onDemoLogin}
        sx={{ mt: 1 }}
      >
        Entrar como Administrador Demo
      </Button>
    </Paper>
  );
}
