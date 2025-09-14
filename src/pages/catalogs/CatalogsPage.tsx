import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Paper,
} from '@mui/material';
import {
  Category as CategoryIcon,
  Build as BuildIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface CatalogItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

const catalogs: CatalogItem[] = [
  {
    id: 'service-types',
    title: 'Tipos de Servicio',
    description: 'Administra los tipos de servicio disponibles para las solicitudes',
    icon: <BuildIcon sx={{ fontSize: 40 }} />,
    path: '/catalogs/service-types',
    color: '#1976d2',
  },
  // Aquí se pueden agregar más catálogos en el futuro
];

export default function CatalogsPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)' }}>
        <Box sx={{ color: 'white' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Catálogos del Sistema
          </Typography>
          <Typography variant="subtitle1">
            Administra los catálogos y configuraciones maestras del sistema
          </Typography>
        </Box>
      </Paper>

      {/* Catalogs Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
        {catalogs.map((catalog) => (
          <Box key={catalog.id}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                }
              }}
            >
              <CardContent sx={{ flexGrow: 1, textAlign: 'center', pt: 3 }}>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    backgroundColor: `${catalog.color}15`,
                    color: catalog.color,
                    mb: 2,
                  }}
                >
                  {catalog.icon}
                </Box>
                
                <Typography variant="h6" component="h2" gutterBottom>
                  {catalog.title}
                </Typography>
                
                <Typography variant="body2" color="text.secondary">
                  {catalog.description}
                </Typography>
              </CardContent>
              
              <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => navigate(catalog.path)}
                  sx={{ 
                    backgroundColor: catalog.color,
                    '&:hover': {
                      backgroundColor: catalog.color,
                      filter: 'brightness(0.9)',
                    }
                  }}
                >
                  Administrar
                </Button>
              </CardActions>
            </Card>
          </Box>
        ))}
        
        {/* Placeholder for future catalogs */}
        <Box>
          <Card 
            sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              border: '2px dashed #e0e0e0',
              backgroundColor: '#fafafa',
            }}
          >
            <CardContent sx={{ flexGrow: 1, textAlign: 'center', pt: 3 }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  backgroundColor: '#f5f5f5',
                  color: '#bdbdbd',
                  mb: 2,
                }}
              >
                <CategoryIcon sx={{ fontSize: 40 }} />
              </Box>
              
              <Typography variant="h6" component="h2" gutterBottom color="text.secondary">
                Próximamente
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                Más catálogos estarán disponibles próximamente
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Info Section */}
      <Paper sx={{ p: 3, mt: 4, backgroundColor: '#f8f9fa' }}>
        <Typography variant="h6" gutterBottom>
          ¿Qué son los catálogos?
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Los catálogos son configuraciones maestras que permiten personalizar y administrar 
          los datos de referencia utilizados en todo el sistema. Esto incluye tipos de servicio, 
          categorías, estados, y otros elementos que pueden variar según las necesidades del negocio.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Mantener estos catálogos actualizados asegura que los formularios y procesos del sistema 
          reflejen correctamente las opciones disponibles para los usuarios.
        </Typography>
      </Paper>
    </Box>
  );
}
