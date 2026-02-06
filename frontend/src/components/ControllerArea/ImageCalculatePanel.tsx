import React, { useState } from "react";
import { Box, Button, Paper, Chip, TextField } from "@mui/material";
import { Stage, Layer, Image as KonvaImage } from "react-konva";
import { PhotoCamera } from "@mui/icons-material";

interface ImageCalculatePanelProps {}

const ImageCalculatePanel: React.FC<ImageCalculatePanelProps> = () => {
  const [templateImageFile, setTemplateImageFile] = useState<File | null>(null);
  const [searchImageFile, setSearchImageFile] = useState<File | null>(null);
  const [templateX, setTemplateX] = useState(0);
  const [templateY, setTemplateY] = useState(0);
  const [templateW, setTemplateW] = useState(0);
  const [templateH, setTemplateH] = useState(0);
  const [searchX, setSearchX] = useState(0);
  const [searchY, setSearchY] = useState(0);
  const [searchW, setSearchW] = useState(0);
  const [searchH, setSearchH] = useState(0);
  const [templateImage, setTemplateImage] = useState<HTMLImageElement | null>(
    null
  );
  const [searchImage, setSearchImage] = useState<HTMLImageElement | null>(null);

  // 处理模板图片上传
  const handleTemplateImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setTemplateImageFile(file);
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        setTemplateImage(img);
      };
    }
  };

  // 处理搜索图片上传
  const handleSearchImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setSearchImageFile(file);
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        setSearchImage(img);
      };
    }
  };

  // 处理计算按钮点击
  const handleCalculate = () => {
    // 实现计算逻辑
  };

  return (
    <Box display="flex" flexDirection="column" height="100%">
      {/* 模板图片上传 */}
      <Paper elevation={3} sx={{ padding: 2, margin: 2 }}>
        <Chip
          label="模板图片"
          color="primary"
          variant="outlined"
          sx={{ width: "fit-content" }}
        />
        <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
          <Button
            variant="contained"
            color="primary"
            component="span"
            startIcon={<PhotoCamera />}
          >
            上传模板图片
          </Button>
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            id="template-image-upload"
            onChange={handleTemplateImageUpload}
          />
          {templateImageFile && (
            <Chip label={templateImageFile.name} color="success" />
          )}
        </Box>
      </Paper>

      {/* 模板图片参数 */}
      <Paper elevation={3} sx={{ padding: 2, margin: 2 }}>
        <Chip
          label="模板图片参数"
          color="info"
          variant="outlined"
          sx={{ width: "fit-content" }}
        />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 2,
            mt: 2,
          }}
        >
          <TextField
            label="X"
            type="number"
            value={templateX}
            onChange={(e) => setTemplateX(parseInt(e.target.value))}
          />
          <TextField
            label="Y"
            type="number"
            value={templateY}
            onChange={(e) => setTemplateY(parseInt(e.target.value))}
          />
          <TextField
            label="宽"
            type="number"
            value={templateW}
            onChange={(e) => setTemplateW(parseInt(e.target.value))}
          />
          <TextField
            label="高"
            type="number"
            value={templateH}
            onChange={(e) => setTemplateH(parseInt(e.target.value))}
          />
        </Box>
      </Paper>

      {/* 待检图片上传 */}
      <Paper elevation={3} sx={{ padding: 2, margin: 2 }}>
        <Chip
          label="待检图片"
          color="secondary"
          variant="outlined"
          sx={{ width: "fit-content" }}
        />
        <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
          <Button
            variant="contained"
            color="secondary"
            component="span"
            startIcon={<PhotoCamera />}
          >
            上传待检图片
          </Button>
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            id="search-image-upload"
            onChange={handleSearchImageUpload}
          />
          {searchImageFile && (
            <Chip label={searchImageFile.name} color="success" />
          )}
        </Box>
      </Paper>

      {/* 待检图片参数 */}
      <Paper elevation={3} sx={{ padding: 2, margin: 2 }}>
        <Chip
          label="待检图片参数"
          color="info"
          variant="outlined"
          sx={{ width: "fit-content" }}
        />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 2,
            mt: 2,
          }}
        >
          <TextField
            label="X"
            type="number"
            value={searchX}
            onChange={(e) => setSearchX(parseInt(e.target.value))}
          />
          <TextField
            label="Y"
            type="number"
            value={searchY}
            onChange={(e) => setSearchY(parseInt(e.target.value))}
          />
          <TextField
            label="宽"
            type="number"
            value={searchW}
            onChange={(e) => setSearchW(parseInt(e.target.value))}
          />
          <TextField
            label="高"
            type="number"
            value={searchH}
            onChange={(e) => setSearchH(parseInt(e.target.value))}
          />
        </Box>
      </Paper>

      {/* 计算按钮 */}
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        margin={2}
      >
        <Button variant="contained" color="primary" onClick={handleCalculate}>
          开始计算
        </Button>
      </Box>

      {/* 结果展示 */}
      <Paper elevation={3} sx={{ padding: 2, margin: 2, height: 400 }}>
        <Chip
          label="计算结果"
          color="success"
          variant="outlined"
          sx={{ width: "fit-content" }}
        />
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            mt: 2,
            height: "calc(100% - 60px)",
          }}
        >
          {/* 用 Konva Stage 展示结果 */}
          {templateImage && searchImage ? (
            <Stage width={400} height={300}>
              <Layer>
                <KonvaImage image={templateImage} />
                <KonvaImage image={searchImage} />
              </Layer>
            </Stage>
          ) : (
            <Box> 请上传模板图片和待检图片后开始计算 </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default ImageCalculatePanel;
