import * as React from 'react';
import Title from './Title';
import { DataGrid } from '@mui/x-data-grid';

const columns = [
  { field: 'jobId', headerName: 'Job ID', width: 150 },
  { field: 'numValues', headerName: 'Number of values per file', width: 200 },
  { field: 'numFiles', headerName: 'Number of files', width: 150 },
  { field: 'status', headerName: 'Status', width: 150 },
];

export default function Jobs(props) {
  const { rows } = props;
  return (
    <React.Fragment>
      <Title>Jobs</Title>
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
