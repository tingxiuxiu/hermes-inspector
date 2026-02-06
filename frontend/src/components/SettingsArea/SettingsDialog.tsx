import React from "react";
import { useSelector } from "react-redux";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Box,
  TextField,
  Paper,
  Chip,
  Button,
} from "@mui/material";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onClose }) => {
  // 获取 Redux 状态配置
  const settings = useSelector((state: any) => state.settings);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      disableEscapeKeyDown={true}
    >
      <DialogTitle>系统配置</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 2 }}>
          {/* 百度 OCR 配置 */}
          <Paper elevation={3} sx={{ padding: 2 }}>
            <Chip label="百度 OCR 配置" color="primary" />
            <Box
              sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}
            >
              <TextField
                label="API Key"
                value={settings.baiduOcr.apiKey || ""}
              />
              <TextField
                label="Secret Key"
                value={settings.baiduOcr.secretKey || ""}
              />
            </Box>
          </Paper>

          {/* 阿里云 OCR 配置 */}
          <Paper elevation={3} sx={{ padding: 2 }}>
            <Chip label="阿里云 OCR 配置" color="info" />
            <Box
              sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}
            >
              <TextField label="App Key" value={settings.aliOcr.appKey || ""} />
              <TextField label="API Key" value={settings.aliOcr.apiKey || ""} />
              <TextField
                label="Secret Key"
                value={settings.aliOcr.secretKey || ""}
              />
            </Box>
          </Paper>

          {/* 腾讯云 OCR 配置 */}
          <Paper elevation={3} sx={{ padding: 2 }}>
            <Chip label="腾讯云 OCR 配置" color="success" />
            <Box
              sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}
            >
              <TextField
                label="API Key"
                value={settings.tencentOcr.apiKey || ""}
              />
              <TextField
                label="Secret Key"
                value={settings.tencentOcr.secretKey || ""}
              />
            </Box>
          </Paper>

          {/* 操作按钮 */}
          <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
            <Button variant="contained" color="secondary">
              清空配置
            </Button>
            <Button variant="contained" color="primary" onClick={onClose}>
              保存设置
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
