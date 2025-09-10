import { Box, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Box sx={{ textAlign: 'center', mt: 8 }}>
      <Typography variant="h3" gutterBottom>
        404 - Página no encontrada
      </Typography>
      <Typography color="text.secondary" gutterBottom>
        La página que buscas no existe.
      </Typography>
      <Button variant="contained" onClick={() => navigate('/')}>Volver al inicio</Button>
    </Box>
  );
}
