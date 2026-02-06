import React, { useState } from "react";
import { Box, Paper, Chip, Button } from "@mui/material";

const OcrPanel: React.FC = () => {
  const [templateImageFile, setTemplateImageFile] = useState<File | null>(null);
  const [searchImageFile, setSearchImageFile] = useState<File | null>(null);

  // 处理图片上传
  const handleUpload = (
    setter: React.Dispatch<React.SetStateAction<File | null>>
  ) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0] || null;
      setter(file);
    };
    input.click();
  };

  // 重置选择
  const handleReset = () => {
    setTemplateImageFile(null);
    setSearchImageFile(null);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      {/* 模板图片上传 */}
      <Paper
        elevation={3}
        sx={{
          padding: 2,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Chip
          label="模板图片"
          color="primary"
          variant="outlined"
          sx={{ width: "fit-content" }}
        />
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleUpload(setTemplateImageFile)}
          >
            选择图片
          </Button>
          {templateImageFile ? (
            <Chip label={templateImageFile.name} color="success" />
          ) : (
            <Chip label="未选择图片" color="default" />
          )}
        </Box>
      </Paper>

      {/* 搜索图片上传 */}
      <Paper
        elevation={3}
        sx={{
          padding: 2,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Chip
          label="搜索图片"
          color="secondary"
          variant="outlined"
          sx={{ width: "fit-content" }}
        />
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Button
            variant="contained"
            color="secondary"
            onClick={() => handleUpload(setSearchImageFile)}
          >
            选择图片
          </Button>
          {searchImageFile ? (
            <Chip label={searchImageFile.name} color="success" />
          ) : (
            <Chip label="未选择图片" color="default" />
          )}
        </Box>
      </Paper>

      {/* 操作按钮 */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
        }}
      >
        <Button variant="outlined" color="error" onClick={handleReset}>
          重置选择
        </Button>
      </Box>
    </Box>
  );
};

export default OcrPanel;
