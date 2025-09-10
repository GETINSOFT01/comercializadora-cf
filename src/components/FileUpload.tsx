import { useState } from 'react';
import { Box, Button, LinearProgress, Stack, Typography } from '@mui/material';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

export interface FileUploadResult {
  name: string;
  url: string;
  path: string;
}

interface FileUploadProps {
  path: string; // e.g. "services/{serviceId}/tech_visit"
  accept?: string;
  multiple?: boolean;
  onUploaded?: (files: FileUploadResult[]) => void;
}

export default function FileUpload({ path, accept = 'image/*', multiple = true, onUploaded }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number>(0);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setProgress(0);

    const results: FileUploadResult[] = [];

    try {
      const uploads = Array.from(files).map((file) => {
        const filePath = `${path}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, filePath);
        const task = uploadBytesResumable(storageRef, file);

        return new Promise<FileUploadResult>((resolve, reject) => {
          task.on(
            'state_changed',
            (snapshot) => {
              const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              setProgress(pct);
            },
            (error) => reject(error),
            async () => {
              const url = await getDownloadURL(task.snapshot.ref);
              resolve({ name: file.name, url, path: filePath });
            }
          );
        });
      });

      const uploaded = await Promise.all(uploads);
      results.push(...uploaded);
      onUploaded?.(results);
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
      setProgress(0);
      // reset input value to allow same file selection again
      e.target.value = '';
    }
  };

  return (
    <Stack spacing={1}>
      <Button
        component="label"
        variant="outlined"
        startIcon={<CloudUploadIcon />}
        disabled={uploading}
      >
        {uploading ? 'Subiendo...' : 'Subir archivos'}
        <input type="file" hidden accept={accept} multiple={multiple} onChange={handleChange} />
      </Button>
      {uploading && (
        <Box>
          <Typography variant="caption">Progreso: {progress}%</Typography>
          <LinearProgress variant="determinate" value={progress} />
        </Box>
      )}
    </Stack>
  );
}
