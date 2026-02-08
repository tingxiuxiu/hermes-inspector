import reactLogo from "../assets/react.svg";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import {
  Box,
  IconButton,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../hooks";
import {
  setDeviceSerial,
  setDeviceType,
  setOcrType,
  setCachePath,
} from "../store/slices/systemConfigSlice";
import SettingsDialog from "../components/SettingsArea/SettingsDialog";

export default function AppNavBar() {
  const dispatch = useAppDispatch();
  const { connected } = useAppSelector((state) => state.connectionState);
  const {
    cachePath,
    deviceSerial,
    deviceType,
    ocrType,
  } = useAppSelector((state) => state.systemConfig);
  const [openSettingsDialog, setOpenSettingsDialog] = useState(false);
  
  return (
    <Box
      id="app-navbar-box"
      sx={{
        height: "60px",
        backgroundColor: "#f8f8f8",
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        color: "black",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        borderBottom: "1px solid #e0e0e0",
        overflowX: "auto",
        whiteSpace: "nowrap",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <img src={reactLogo} alt="Project Logo" style={{ height: "30px" }} />
        <Box sx={{ fontSize: "20px", fontWeight: "bold" }}>TA Inspector</Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginLeft: "20px",
          flex: 1,
          minWidth: 0,
        }}
      >
        <FormControl>
          <InputLabel>设备类型</InputLabel>
          <Select
            value={deviceType}
            onChange={(e) => dispatch(setDeviceType(e.target.value as string))}
            size="small"
            label={"设备类型"}
            sx={{ width: "120px" }}
            disabled={connected}
          >
            <MenuItem value="android">Android</MenuItem>
            <MenuItem value="harmony">Harmony</MenuItem>
          </Select>
        </FormControl>
        <FormControl>
          <InputLabel>OCR供应商</InputLabel>
          <Select
            value={ocrType}
            onChange={(e) => dispatch(setOcrType(e.target.value as string))}
            size="small"
            label={"OCR供应商"}
            sx={{ width: "150px" }}
            disabled={connected}
          >
            <MenuItem value="baidu">百度OCR</MenuItem>
            <MenuItem value="ali" disabled>阿里云OCR</MenuItem>
            <MenuItem value="tencent" disabled>腾讯OCR</MenuItem>
            <MenuItem value="google" disabled>Google OCR</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label={"保存路径"}
          value={cachePath}
          size="small"
          sx={{ width: "160px" }}
          disabled
          onChange={(e) => dispatch(setCachePath(e.target.value as string))}
        />
        <TextField
          label="设备序列号"
          value={deviceSerial}
          size="small"
          sx={{ width: "160px" }}
          disabled={connected}
          onChange={(e) => dispatch(setDeviceSerial(e.target.value as string))}
        />
      </Box>
      <Box>
        <IconButton
          color="primary"
          aria-label="Settings"
          onClick={() => setOpenSettingsDialog(true)}
        >
          <SettingsIcon />
        </IconButton>
      </Box>
      <SettingsDialog
        open={openSettingsDialog}
        onClose={() => setOpenSettingsDialog(false)}
      />
    </Box>
  );
}
