import * as React from 'react';
import Title from './Title';
import { DataGrid } from '@mui/x-data-grid';

const columns = [
  { field: 'hostname', headerName: 'Hostname', width: 150 },
];

export default function Workers(props) {
  const { rows } = props;
  return (
    <React.Fragment>
      <Title>Workers</Title>
      <DataGrid
        rows={rows}
        columns={columns}
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 5 },
          },
        }}
        rowHeight={30}
      />
    </React.Fragment>
  );
}
