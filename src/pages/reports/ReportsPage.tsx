import { useEffect, useState } from 'react';
import { Box, Card, CardContent, CardHeader, Typography } from '@mui/material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

export default function ReportsPage() {
  const [servicesByStatus, setServicesByStatus] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const snap = await getDocs(collection(db, 'services'));
      const counts: Record<string, number> = {};
      snap.forEach((doc) => {
        const status = (doc.data() as any).status || 'Desconocido';
        counts[status] = (counts[status] || 0) + 1;
      });
      setServicesByStatus(Object.entries(counts).map(([name, value]) => ({ name, value })));
    };
    fetchData();
  }, []);

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Reportes
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        <Box>
          <Card>
            <CardHeader title="Servicios por Estado" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={servicesByStatus}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#1976d2" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>
        <Box>
          <Card>
            <CardHeader title="Distribución de Estados" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={servicesByStatus} dataKey="value" nameKey="name" label>
                    {servicesByStatus.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
