import * as React from 'react';
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

const defaultTheme = createTheme({
  palette: {
    mode: 'light',
  },
});

export default function Dashboard() {
  const [openCreateModal, setOpenCreateModal] = React.useState(false);
  const toggleCreateModal = () => {
    setOpenCreateModal(!openCreateModal);
  }

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
            <CreateJob open={openCreateModal} toggleModal={toggleCreateModal} />
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
                  <Jobs rows={[]} />
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
                  <Stats numCompletedJobs={"0"} numPendingJobs={"0"} numWorkers={"0"} />
                </Paper>
              </Grid>
              {/* Workers */}
              <Grid item xs={12}>
                <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 332 }}>
                  <Workers rows={[]} />
                </Paper>
              </Grid>
            </Grid>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
