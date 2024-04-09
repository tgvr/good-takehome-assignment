import * as React from 'react';
import { useEffect } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import MuiAppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Jobs from './Jobs';
import Stats from './Stats';
import Workers from './Workers';
import CreateJob from './CreateJob';
import SetWorkers from './SetWorkers';
import Stack from '@mui/material/Stack';

const defaultTheme = createTheme({
  palette: {
    mode: 'light',
  },
});

export default function Dashboard() {
  const [openCreateModal, setOpenCreateModal] = React.useState(false);
  const [openWorkerModal, setOpenWorkerModal] = React.useState(false);
  const [appState, setAppState] = React.useState(
    {
      numCompletedJobs: 0,
      numPendingJobs: 0,
      numWorkers: 0,
      jobs: [],
      workers: [],
    }
  );
  const toggleCreateModal = () => {
    setOpenCreateModal(!openCreateModal);
  }
  const toggleWorkerModal = () => {
    setOpenWorkerModal(!openWorkerModal);
  }

  const getApplicationState = async () => {
    const res = await fetch("http://localhost:8000/api/get_application_state");
    const data = await res.json();
    setAppState({
      ...appState,
      ...data,
      jobs: data.jobs.map((job) => {return {id: job.jobid, ...job}}),
      workers: data.workers.map((worker) => {return {id: worker.hostname, latest_indices_length: worker.latest_file_indices.length, ...worker}}),
    });
    console.log(data);
  };

  useEffect(() => {
    const timer = setInterval(getApplicationState, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <ThemeProvider theme={defaultTheme}>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <MuiAppBar position="fixed">
          <Toolbar>
            <Typography
              component="h1"
              variant="h6"
              color="inherit"
              noWrap
              sx={{ flexGrow: 1 }}
            >
              {"Takehome Assignment (Jobs and Workers)"}
            </Typography>
            <Stack direction="row" spacing={2}>
              <CreateJob open={openCreateModal} toggleModal={toggleCreateModal} />
              <SetWorkers open={openWorkerModal} toggleModal={toggleWorkerModal} />
            </Stack>
          </Toolbar>
        </MuiAppBar>
        <Box
          component="main"
          sx={{
            backgroundColor: (theme) =>
              theme.palette.mode === 'light'
                ? theme.palette.grey[100]
                : theme.palette.grey[900],
            flexGrow: 1,
            height: '100vh',
            overflow: 'auto',
          }}
        >
          <Toolbar />
          <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Grid container spacing={3}>
              {/* Jobs */}
              <Grid item xs={12} md={8} lg={9}>
                <Paper
                  sx={{
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    height: 332,
                  }}
                >
                  <Jobs rows={appState.jobs} />
                </Paper>
              </Grid>
              {/* Stats */}
              <Grid item xs={12} md={4} lg={3}>
                <Paper
                  sx={{
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    height: 332,
                  }}
                >
                  <Stats 
                    numCompletedJobs={appState.numCompletedJobs} 
                    numPendingJobs={appState.numPendingJobs} 
                    numWorkers={appState.numWorkers} 
                  />
                </Paper>
              </Grid>
              {/* Workers */}
              <Grid item xs={12}>
                <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 332 }}>
                  <Workers rows={appState.workers} />
                </Paper>
              </Grid>
            </Grid>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
