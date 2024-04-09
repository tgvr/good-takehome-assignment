import * as React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Title from './Title';

export default function Stats(props) {
  const {numCompletedJobs, numPendingJobs, numWorkers} = props;
  return (
    <React.Fragment>
      <Title>Stats</Title>
      <Table size="small">
        <TableBody>
            <TableRow>
                <TableCell variant="head">Completed Jobs</TableCell>
                <TableCell align="right">{numCompletedJobs}</TableCell>
            </TableRow>
            <TableRow>
                <TableCell variant="head">Pending Jobs</TableCell>
                <TableCell align="right">{numPendingJobs}</TableCell>
            </TableRow>
            <TableRow>
                <TableCell variant="head">Workers</TableCell>
                <TableCell align="right">{numWorkers}</TableCell>
            </TableRow>
        </TableBody>
      </Table>
    </React.Fragment>
  );
}
