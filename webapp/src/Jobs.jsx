import * as React from 'react';
import Title from './Title';
import { DataGrid } from '@mui/x-data-grid';

const columns = [
  { field: 'jobid', headerName: 'Job ID', width: 330 },
  { field: 'numvalues', headerName: 'Number of values per file', width: 200 },
  { field: 'numfiles', headerName: 'Number of files', width: 150 },
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
