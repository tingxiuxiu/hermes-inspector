import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Box,
  TextField,
  Button,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SaveIcon from "@mui/icons-material/Save";
import {
  setApiKey,
  setSecretKey,
  setOpenAIConfig,
  setGeminiConfig,
  clearAllConfigs,
} from "../../store/slices/settingsSlice";
import type { SettingsState } from "../../store/slices/settingsSlice";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const settings = useSelector(
    (state: { settings: SettingsState }) => state.settings
  );

  // Local state for form fields
  const [apiKey, setLocalApiKey] = useState("");
  const [secretKey, setLocalSecretKey] = useState("");
  const [openai, setLocalOpenAI] = useState("");
  const [gemini, setLocalGemini] = useState("");

  // Sync local state with Redux state when dialog opens
  useEffect(() => {
    if (open) {
      setLocalApiKey(settings.apiKey || "");
      setLocalSecretKey(settings.secretKey || "");
      setLocalOpenAI(settings.openai || "");
      setLocalGemini(settings.gemini || "");
    }
  }, [open, settings]);

  const handleClear = () => {
    setLocalApiKey("");
    setLocalSecretKey("");
    setLocalOpenAI("");
    setLocalGemini("");
    dispatch(clearAllConfigs());
  };

  const handleSave = () => {
    dispatch(setApiKey(apiKey));
    dispatch(setSecretKey(secretKey));
    dispatch(setOpenAIConfig(openai));
    dispatch(setGeminiConfig(gemini));
    onClose();
  };

  const isSaveEnabled = apiKey.trim() !== "" && secretKey.trim() !== "";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            padding: 2,
          },
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          px: 1,
        }}
      >
        <DialogTitle sx={{ p: 0, fontWeight: 500, fontSize: "1.25rem" }}>
          Settings
        </DialogTitle>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 1 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <TextField
            fullWidth
            required
            label="API Key"
            variant="outlined"
            value={apiKey}
            onChange={(e) => setLocalApiKey(e.target.value)}
            placeholder="Enter your API Key"
            slotProps={{
              inputLabel: { shrink: true },
              input: { sx: { borderRadius: 2 } },
            }}
          />

          <TextField
            fullWidth
            required
            label="Secret Key"
            variant="outlined"
            value={secretKey}
            onChange={(e) => setLocalSecretKey(e.target.value)}
            placeholder="Enter your Secret Key"
            slotProps={{
              inputLabel: { shrink: true },
              input: { sx: { borderRadius: 2 } },
            }}
          />

          <TextField
            fullWidth
            label="OpenAI Config"
            variant="outlined"
            value={openai}
            onChange={(e) => setLocalOpenAI(e.target.value)}
            placeholder="Enter OpenAI configuration"
            slotProps={{
              inputLabel: { shrink: true },
              input: { sx: { borderRadius: 2 } },
            }}
          />

          <TextField
            fullWidth
            label="Gemini Config"
            variant="outlined"
            value={gemini}
            onChange={(e) => setLocalGemini(e.target.value)}
            placeholder="Enter Gemini configuration"
            slotProps={{
              inputLabel: { shrink: true },
              input: { sx: { borderRadius: 2 } },
            }}
          />
        </Box>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mt: 4,
            pt: 2,
            borderTop: "1px solid #f0f0f0",
          }}
        >
          <Button
            startIcon={<DeleteOutlineIcon />}
            color="error"
            onClick={handleClear}
            sx={{ textTransform: "none", borderRadius: 2 }}
          >
            Clear all
          </Button>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="contained"
              disableElevation
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={!isSaveEnabled}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                bgcolor: "#1a73e8",
                "&:hover": {
                  bgcolor: "#1557b0",
                },
                "&.Mui-disabled": {
                  bgcolor: "#e0e0e0",
                  color: "#9e9e9e",
                },
              }}
            >
              Done
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;


