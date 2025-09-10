import { Box, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  return (
    <Box sx={{ textAlign: 'center', mt: 8 }}>
      <Typography variant="h3" gutterBottom>
        403 - Acceso no autorizado
      </Typography>
      <Typography color="text.secondary" gutterBottom>
        No tienes permisos para acceder a esta sección.
      </Typography>
      <Button variant="contained" onClick={() => navigate('/')}>Volver al inicio</Button>
    </Box>
  );
}
