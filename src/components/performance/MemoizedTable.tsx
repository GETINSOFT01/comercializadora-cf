import React, { memo, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Checkbox,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

interface Column<T> {
  id: keyof T;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any) => string;
}

interface MemoizedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  page: number;
  rowsPerPage: number;
  totalCount: number;
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  selectable?: boolean;
  selected?: string[];
  onSelectionChange?: (selected: string[]) => void;
  getRowId: (item: T) => string;
  loading?: boolean;
}

/**
 * Componente de tabla optimizado con memoización para mejorar rendimiento
 */
function MemoizedTableComponent<T>({
  data,
  columns,
  page,
  rowsPerPage,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
  onEdit,
  onDelete,
  selectable = false,
  selected = [],
  onSelectionChange,
  getRowId,
  loading = false,
}: MemoizedTableProps<T>) {
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!onSelectionChange) return;
    
    if (event.target.checked) {
      const newSelected = data.map(getRowId);
      onSelectionChange(newSelected);
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (id: string) => {
    if (!onSelectionChange) return;
    
    const selectedIndex = selected.indexOf(id);
    let newSelected: string[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1)
      );
    }

    onSelectionChange(newSelected);
  };

  const isSelected = (id: string) => selected.indexOf(id) !== -1;

  const memoizedRows = useMemo(() => {
    return data.map((row) => {
      const id = getRowId(row);
      const isItemSelected = isSelected(id);

      return (
        <TableRow
          hover
          key={id}
          role={selectable ? 'checkbox' : undefined}
          aria-checked={selectable ? isItemSelected : undefined}
          selected={isItemSelected}
        >
          {selectable && (
            <TableCell padding="checkbox">
              <Checkbox
                color="primary"
                checked={isItemSelected}
                onChange={() => handleSelectRow(id)}
              />
            </TableCell>
          )}
          {columns.map((column) => {
            const value = row[column.id];
            return (
              <TableCell key={String(column.id)} align={column.align}>
                {column.format ? column.format(value) : String(value)}
              </TableCell>
            );
          })}
          {(onEdit || onDelete) && (
            <TableCell align="right">
              {onEdit && (
                <Tooltip title="Editar">
                  <IconButton size="small" onClick={() => onEdit(row)}>
                    <EditIcon />
                  </IconButton>
                </Tooltip>
              )}
              {onDelete && (
                <Tooltip title="Eliminar">
                  <IconButton size="small" onClick={() => onDelete(row)}>
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              )}
            </TableCell>
          )}
        </TableRow>
      );
    });
  }, [data, columns, selected, selectable, onEdit, onDelete, getRowId]);

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 440 }}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    color="primary"
                    indeterminate={selected.length > 0 && selected.length < data.length}
                    checked={data.length > 0 && selected.length === data.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell
                  key={String(column.id)}
                  align={column.align}
                  style={{ minWidth: column.minWidth }}
                >
                  {column.label}
                </TableCell>
              ))}
              {(onEdit || onDelete) && (
                <TableCell align="right">Acciones</TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0) + (onEdit || onDelete ? 1 : 0)}>
                  Cargando...
                </TableCell>
              </TableRow>
            ) : (
              memoizedRows
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={totalCount}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
        labelRowsPerPage="Filas por página:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
        }
      />
    </Paper>
  );
}

export const MemoizedTable = memo(MemoizedTableComponent) as <T>(
  props: MemoizedTableProps<T>
) => React.ReactElement;
