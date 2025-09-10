import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Button,
  Stack,
  Divider,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Chip,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase/config';

type Role = 'admin' | 'manager' | 'supervisor' | 'finance';

export default function AdminPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [foundUser, setFoundUser] = useState<{
    uid: string;
    email: string | null;
    displayName: string | null;
    disabled: boolean;
    customClaims: Record<string, any>;
  } | null>(null);
  const [role, setRole] = useState<Role>('manager');

  const lookup = async () => {
    if (!email) {
      enqueueSnackbar('Ingresa un correo', { variant: 'warning' });
      return;
    }
    try {
      setLoading(true);
      const call = httpsCallable(functions, 'lookupUserByEmail');
      const res = await call({ email });
      setFoundUser(res.data as any);
      enqueueSnackbar('Usuario encontrado', { variant: 'success' });
    } catch (err: any) {
      console.error(err);
      setFoundUser(null);
      enqueueSnackbar(err?.message || 'Usuario no encontrado', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const assign = async () => {
    if (!foundUser) return;
    try {
      setAssigning(true);
      const call = httpsCallable(functions, 'setCustomUserClaims');
      await call({ uid: foundUser.uid, role });
      enqueueSnackbar('Rol asignado correctamente', { variant: 'success' });
    } catch (err: any) {
      console.error(err);
      enqueueSnackbar(err?.message || 'Error al asignar rol', { variant: 'error' });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Administración del Sistema
      </Typography>
      <Card>
        <CardHeader title="Gestión de Usuarios" subheader="Busca por email y asigna un rol" />
        <CardContent>
          <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'flex-end' }}>
            <TextField
              label="Correo del usuario"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              type="email"
            />
            <Button variant="contained" onClick={lookup} disabled={loading}>
              {loading ? 'Buscando...' : 'Buscar'}
            </Button>
          </Stack>

          {foundUser && (
            <Box mt={3}>
              <Typography variant="subtitle1">Usuario</Typography>
              <Stack direction="row" spacing={2} alignItems="center" mt={1}>
                <Chip label={`UID: ${foundUser.uid}`} />
                <Chip label={foundUser.email || ''} color="primary" />
                {foundUser.displayName && <Chip label={foundUser.displayName} />}
                {foundUser.disabled && <Chip label="Deshabilitado" color="warning" />}
                {foundUser.customClaims?.role && <Chip label={`Rol actual: ${foundUser.customClaims.role}`} color="success" />}
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }}>
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel id="role-label">Nuevo Rol</InputLabel>
                  <Select
                    labelId="role-label"
                    value={role}
                    label="Nuevo Rol"
                    onChange={(e) => setRole(e.target.value as Role)}
                  >
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="manager">Manager</MenuItem>
                    <MenuItem value="supervisor">Supervisor</MenuItem>
                    <MenuItem value="finance">Finance</MenuItem>
                  </Select>
                </FormControl>
                <Button variant="contained" onClick={assign} disabled={assigning}>
                  {assigning ? 'Asignando...' : 'Asignar Rol'}
                </Button>
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
