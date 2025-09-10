import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Avatar,
  Box,
  Button,
  Container,
  CssBaseline,
  Link,
  TextField,
  Typography,
  Paper,
  CircularProgress,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useSnackbar } from 'notistack';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '../../schemas/validation';

export default function LoginPageValidated() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors, isValid },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login(values.email, values.password);
      enqueueSnackbar('Inicio de sesión exitoso', { variant: 'success' });
      navigate('/');
    } catch (error: any) {
      let errorMessage = 'Error al iniciar sesión';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Usuario no encontrado';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Contraseña incorrecta';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Demasiados intentos fallidos. Intente más tarde';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Esta cuenta ha sido deshabilitada';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Correo electrónico inválido';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Credenciales inválidas';
          break;
        default:
          errorMessage = error.message || 'Error al iniciar sesión';
      }
      
      enqueueSnackbar(errorMessage, { variant: 'error' });
    }
  });

  return (
    <Container component="main" maxWidth="xs">
        <CssBaseline />
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Paper
            elevation={3}
            sx={{
              padding: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
              <LockOutlinedIcon />
            </Avatar>
            <Typography component="h1" variant="h5">
              Iniciar Sesión
            </Typography>
            <Box component="form" onSubmit={onSubmit} sx={{ mt: 1, width: '100%' }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Correo Electrónico"
                autoComplete="email"
                autoFocus
                {...register('email')}
                error={!!errors.email}
                helperText={errors.email?.message}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                label="Contraseña"
                type="password"
                id="password"
                autoComplete="current-password"
                {...register('password')}
                error={!!errors.password}
                helperText={errors.password?.message}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={!isValid || isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
              >
                {isSubmitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                <Link href="#" variant="body2">
                  ¿Olvidaste tu contraseña?
                </Link>
                <Link href="#" variant="body2">
                  ¿No tienes una cuenta? Contáctanos
                </Link>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Container>
  );
}
