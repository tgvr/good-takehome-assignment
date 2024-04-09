import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';

export default function CreateJob(props) {
  const { open, toggleModal } = props;

  return (
    <React.Fragment>
      <Button color="inherit" variant="outlined" onClick={toggleModal}>
        Create job
      </Button>
      <Dialog
        open={open}
        onClose={toggleModal}
        PaperProps={{
          component: 'form',
          onSubmit: async (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const formJson = Object.fromEntries(formData.entries());

            try {
                const response = await fetch('http://localhost:8000/api/create_job', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formJson),
                });

                if (response.ok) {
                    const txt = await response.text();
                    console.log(txt);
                    toggleModal();
                } else {
                    console.error('Error:', response.status);
                }
            } catch (error) {
                console.error('Error:', error);
            }
          },
        }}
      >
        <DialogTitle>Create new Job</DialogTitle>
        <DialogContent>
            <TextField
                required
                margin="dense"
                id="name"
                name="numFiles"
                label="Number of files"
                type="number"
                fullWidth
                variant="standard"
            />
            <TextField
                required
                margin="dense"
                id="name"
                name="numValues"
                label="Number of values per file"
                type="number"
                fullWidth
                variant="standard"
            />
        </DialogContent>
        <DialogActions>
          <Button onClick={toggleModal}>Cancel</Button>
          <Button type="submit">Create</Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}