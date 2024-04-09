import * as React from 'react';
import { useState } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';

const onSubmit = async (event, toggleModal) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const formJson = Object.fromEntries(formData.entries());

  try {
      const response = await fetch('http://localhost:8000/api/set_num_workers', {
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
}

export default function SetWorkers(props) {
  const { open, toggleModal } = props;
  
  return (
    <React.Fragment>
      <Button color="inherit" variant="outlined" onClick={toggleModal}>
        Set workers
      </Button>
      <Dialog
        open={open}
        onClose={toggleModal}
        PaperProps={{
          component: 'form',
          onSubmit: (e) => onSubmit(e, toggleModal)
        }}
      >
        <DialogTitle>Set number of workers</DialogTitle>
        <DialogContent>
            <TextField
                required
                margin="dense"
                id="name"
                name="numWorkers"
                label="Number of workers"
                type="number"
                fullWidth
                variant="standard"
            />
        </DialogContent>
        <DialogActions>
          <Button onClick={toggleModal}>Cancel</Button>
          <Button type="submit">Update</Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}