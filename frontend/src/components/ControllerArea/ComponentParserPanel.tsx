import React, { useState } from "react";
import axios from "axios";
import {
  Box,
  Button,
  Grid,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import RefreshIcon from "@mui/icons-material/Refresh";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import { useSnackbar } from "notistack";
import { xmlToJSON } from "../../utils/sourceParsing2";
import { useAppDispatch } from "../../hooks";
import { setAdComponent } from "../../store/slices/androidComponentSlice";
import {
  setScreenSize,
  setImageFileName,
  resetNodeState,
} from "../../store/slices/screenCacheSlice";
import { setActiveTab } from "../../store/slices/controlTabSlice";

const ComponentParserPanel: React.FC = () => {
  // 状态管理
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const [activeStep, setActiveStep] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [jsonXmlFile, setJsonXmlFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<HTMLImageElement | null>(null);
  const [uploaded, setUploaded] = useState(false);

  // 处理JSON/XML文件选择
  const handleJsonXmlFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileType = file.name.split(".").pop()?.toLowerCase();
      if (fileType === "json" || fileType === "xml") {
        setJsonXmlFile(file);
        setActiveStep(0);
      } else {
        alert("请上传JSON或XML文件");
        e.target.value = "";
      }
    }
  };

  // 处理图片文件选择
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileType = file.type.split("/")[0];
      if (fileType === "image") {
        setImageFile(file);
        // 创建图片预览
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
          setImagePreview(img);
        };
        setActiveStep(1);
      } else {
        alert("请上传图片文件");
        e.target.value = "";
      }
    }
  };

  // 处理文件上传
  const handleUpload = async () => {
    if (!jsonXmlFile || !imageFile) return;
    setLoading(true);
    // 创建FormData并上传文件
    const formData = new FormData();
    formData.append("jsonXmlFile", jsonXmlFile);
    formData.append("imageFile", imageFile);
    try {
      // 这里应该是实际的上传API调用
      console.log("上传文件:", formData);
      const response = await axios.post(
        "/api/v1/system/upload-parse-files",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      if (response.data.code === 200) {
        setActiveStep(2);
        dispatch(resetNodeState());
        dispatch(
          setScreenSize({
            width: response.data.result.size.width,
            height: response.data.result.size.height,
          })
        );
        const x2j = xmlToJSON(response.data.result.pageContent);
        console.log("xml转换后的json", x2j);
        dispatch(setImageFileName(response.data.result.imageFileName));
        dispatch(
          setAdComponent({
            treeObject: x2j.treeObject,
            treeMap: x2j.treeMap,
            imageSource: response.data.result.imageFileName,
          })
        );
        dispatch(setActiveTab("1"));
      } else {
        enqueueSnackbar(response.data.message, { variant: "error" });
      }
    } catch (error) {
      console.error("上传失败:", error);
      enqueueSnackbar("文件上传失败，请重试", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  // 重置到初始状态
  const handleReset = () => {
    setJsonXmlFile(null);
    setImageFile(null);
    setImagePreview(null);
    setUploaded(false);
    dispatch(resetNodeState());
    // 清除input值
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach((input) => ((input as HTMLInputElement).value = ""));
  };

  // 渲染上传区域
  const renderUploadZone = () => (
    <Grid container spacing={3} alignItems="stretch">
      {/* 左侧JSON/XML上传 */}
      <Grid size={4}>
        <Paper
          elevation={2}
          sx={{
            p: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: 2,
            borderStyle: "dashed",
            borderColor: jsonXmlFile ? "primary.main" : "grey.300",
            borderRadius: 2,
            transition: "all 0.3s ease",
            height: 200,
            cursor: "pointer",
          }}
          onClick={() => document.getElementById("json-xml-upload")?.click()}
        >
          <input
            id="json-xml-upload"
            type="file"
            accept=".json,.xml"
            style={{ display: "none" }}
            onChange={handleJsonXmlFileChange}
          />
          {jsonXmlFile ? (
            <Box sx={{ width: "100%", textAlign: "center" }}>
              <Box
                sx={{
                  width: "120px",
                  height: "120px",
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 4,
                  overflow: "hidden",
                  margin: "0 auto 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "primary.light",
                  color: "primary.contrastText",
                }}
              >
                <FileCopyIcon sx={{ fontSize: 60 }} />
              </Box>
              <Typography variant="h6" sx={{ mb: 1 }}>文件已选择</Typography>
              <Typography variant="body2" sx={{ color: "primary.main", mb: 1 }}>
                {jsonXmlFile.name}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {Math.round(jsonXmlFile.size / 1024)} KB
              </Typography>
            </Box>
          ) : (
            <>
              <CloudUploadIcon
                sx={{ fontSize: 40, color: "primary.main", mb: 2 }}
              />
              <Typography variant="h6">选择JSON/XML文件</Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1, textAlign: "center" }}
              >
                支持 .json 或 .xml 格式文件
              </Typography>
            </>
          )}
        </Paper>
      </Grid>

      {/* 右侧图片上传 */}
      <Grid size={4}>
        <Paper
          elevation={2}
          sx={{
            p: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: 2,
            borderStyle: "dashed",
            borderColor: imageFile ? "primary.main" : "grey.300",
            borderRadius: 2,
            transition: "all 0.3s ease",
            height: 200,
            cursor: "pointer",
          }}
          onClick={() => document.getElementById("image-upload")?.click()}
        >
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleImageFileChange}
          />
          {imageFile ? (
            <Box sx={{ width: "100%", textAlign: "center" }}>
              <Box
                sx={{
                  width: "120px",
                  height: "120px",
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 4,
                  overflow: "hidden",
                  margin: "0 auto 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "grey.100",
                }}
              >
                <img
                  src={imagePreview?.src || URL.createObjectURL(imageFile)}
                  alt="背景图片预览"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              </Box>
              <Typography variant="h6" sx={{ mb: 1 }}>背景图片已选择</Typography>
              <Typography variant="body2" sx={{ color: "primary.main" }}>
                {imageFile.name}
              </Typography>
            </Box>
          ) : (
            <>
              <UploadFileIcon sx={{ fontSize: 40, color: "primary.main", mb: 2 }} />
              <Typography variant="h6">选择背景图片</Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1, textAlign: "center" }}
              >
                支持JPG, PNG图片格式
              </Typography>
            </>
          )}
        </Paper>
      </Grid>

      {/* 上传按钮 - 仅当两个文件都选择后显示 */}
      {jsonXmlFile && imageFile && !uploaded && (
        // 垂直居中
        <Grid size={4} sx={{ justifyContent: "center" }}>
          <Box>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<CloudUploadIcon />}
              onClick={handleUpload}
              loading={loading}
              loadingPosition="start"
              sx={{ minWidth: 200 }}
            >
              解析文件
            </Button>
          </Box>
        </Grid>
      )}

      {/* 重置按钮 - 仅当上传后 */}
      {jsonXmlFile && imageFile && uploaded && (
        // 垂直居中
        <Grid size={4} sx={{ justifyContent: "center" }}>
          <Box sx={{ marginTop: "35%" }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<RefreshIcon />}
              onClick={handleReset}
              loading={loading}
              loadingPosition="start"
              sx={{ minWidth: 200 }}
            >
              重置文件
            </Button>
          </Box>
        </Grid>
      )}
    </Grid>
  );

  return (
    <Box>
      <Stepper activeStep={activeStep} sx={{ mb: 3 }} alternativeLabel>
        <Step completed={activeStep >= 0}>
          <StepLabel>选择xml/json文件</StepLabel>
        </Step>
        <Step completed={activeStep >= 1}>
          <StepLabel>选择png/jped图片</StepLabel>
        </Step>
        <Step completed={activeStep >= 2}>
          <StepLabel>解析文件</StepLabel>
        </Step>
      </Stepper>
      {renderUploadZone()}
    </Box>
  );
};

export default ComponentParserPanel;
