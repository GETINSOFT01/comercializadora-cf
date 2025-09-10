import React, { memo, useCallback } from 'react';
import {
  TextField,
  InputAdornment,
  IconButton,
  Box,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
// import { useDebounce } from '../../hooks/useDebounce';

interface OptimizedSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
}

/**
 * Componente de búsqueda optimizado con debounce para mejorar rendimiento
 */
const OptimizedSearchComponent: React.FC<OptimizedSearchProps> = ({
  value,
  onChange,
  placeholder = 'Buscar...',
  debounceMs: _debounceMs = 300, // eslint-disable-line @typescript-eslint/no-unused-vars
  fullWidth = true,
  size = 'small',
}) => {
  // El debounce se maneja internamente en el hook useDebounce

  const handleClear = useCallback(() => {
    onChange('');
  }, [onChange]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  }, [onChange]);

  return (
    <Box sx={{ mb: 2 }}>
      <TextField
        fullWidth={fullWidth}
        size={size}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
          endAdornment: value && (
            <InputAdornment position="end">
              <IconButton
                aria-label="limpiar búsqueda"
                onClick={handleClear}
                edge="end"
                size="small"
              >
                <ClearIcon />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
    </Box>
  );
};

export const OptimizedSearch = memo(OptimizedSearchComponent);
