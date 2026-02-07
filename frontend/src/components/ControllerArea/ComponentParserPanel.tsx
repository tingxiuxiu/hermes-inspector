import React, { useState } from "react";
import axios from "axios";
import {
  Box,
  Button,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Card,
  CardMedia,
  IconButton,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteIcon from "@mui/icons-material/Delete";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
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
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const [jsonXmlFile, setJsonXmlFile] = useState<File | null>(null);
  const [imageState, setImageState] = useState<{ file: File; preview: string } | null>(null);

  const steps = ["选择 XML/JSON 文件", "选择背景图片", "解析文件"];

  const handleJsonXmlFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileType = file.name.split(".").pop()?.toLowerCase();
      if (fileType === "json" || fileType === "xml") {
        setJsonXmlFile(file);
      } else {
        enqueueSnackbar("请上传JSON或XML文件", { variant: "warning" });
        e.target.value = "";
      }
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileType = file.type.split("/")[0];
      if (fileType === "image") {
        setImageState({
            file,
            preview: URL.createObjectURL(file)
        });
      } else {
        enqueueSnackbar("请上传图片文件", { variant: "warning" });
        e.target.value = "";
      }
    }
  };

  const handleRemoveFile = (type: "json" | "image") => {
      if (type === "json") {
          setJsonXmlFile(null);
      } else {
          setImageState(null);
      }
  };

  const handleNext = () => {
    if (activeStep === 0 && !jsonXmlFile) {
        enqueueSnackbar("请选择 JSON/XML 文件", { variant: "warning" });
        return;
    }
    if (activeStep === 1 && !imageState) {
        enqueueSnackbar("请选择背景图片", { variant: "warning" });
        return;
    }
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleParse = async () => {
    if (!jsonXmlFile || !imageState) return;
    
    setLoading(true);
    const formData = new FormData();
    formData.append("jsonXmlFile", jsonXmlFile);
    formData.append("imageFile", imageState.file);

    try {
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
        enqueueSnackbar("解析成功", { variant: "success" });
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

  const renderUploadBox = (type: "json" | "image") => {
      const hasFile = type === "json" ? !!jsonXmlFile : !!imageState;
      const title = type === "json" ? "XML/JSON 文件" : "背景图片";
      
      return (
        <Paper
            variant="outlined"
            sx={{
            p: 3,
            borderStyle: "dashed",
            borderColor: hasFile ? "success.main" : "grey.400",
            backgroundColor: hasFile ? "rgba(76, 175, 80, 0.04)" : "transparent",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 300,
            cursor: "pointer",
            position: "relative",
            "&:hover": {
                borderColor: "primary.main",
                backgroundColor: "rgba(25, 118, 210, 0.04)",
            },
            }}
            onClick={() => !hasFile && document.getElementById(`file-upload-${type}`)?.click()}
        >
            <input
                id={`file-upload-${type}`}
                type="file"
                accept={type === "json" ? ".json,.xml" : "image/*"}
                style={{ display: "none" }}
                onChange={type === "json" ? handleJsonXmlFileChange : handleImageFileChange}
            />

            {hasFile ? (
                <Box sx={{ width: "100%", height: "100%", textAlign: "center", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Box sx={{position: 'absolute', top: 10, right: 10}}>
                        <IconButton onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile(type);
                        }}>
                            <DeleteIcon color="error" />
                        </IconButton>
                    </Box>
                    
                    {type === "json" ? (
                        <>
                             <Box
                                sx={{
                                width: 80,
                                height: 80,
                                borderRadius: 2,
                                bgcolor: "primary.light",
                                color: "primary.contrastText",
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mb: 2
                                }}
                            >
                                <FileCopyIcon sx={{ fontSize: 40 }} />
                            </Box>
                            <Typography variant="subtitle1" sx={{ mt: 2 }}>
                                {jsonXmlFile?.name}
                            </Typography>
                             <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                {jsonXmlFile ? Math.round(jsonXmlFile.size / 1024) : 0} KB
                            </Typography>
                        </>
                    ) : (
                        <>
                             <img
                                src={imageState?.preview}
                                alt="Preview"
                                style={{
                                    maxWidth: "100%",
                                    maxHeight: 250,
                                    objectFit: "contain",
                                    borderRadius: 4,
                                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
                                }}
                            />
                            <Typography variant="subtitle1" sx={{ mt: 2 }}>
                                {imageState?.file.name}
                            </Typography>
                        </>
                    )}
                </Box>
            ) : (
                <>
                {type === "json" ? <UploadFileIcon sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} /> : <CloudUploadIcon sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />}
                <Typography variant="h6" color="text.secondary">
                    点击上传 {title} (必选)
                </Typography>
                </>
            )}
        </Paper>
      );
  };

  return (
    <Box sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column" }}>
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box sx={{ flex: 1, overflow: "auto" }}>
          {activeStep === 0 && (
             <Box sx={{ maxWidth: 600, mx: "auto" }}>
                 {renderUploadBox("json")}
             </Box>
          )}
          {activeStep === 1 && (
              <Box sx={{ maxWidth: 600, mx: "auto" }}>
                  {renderUploadBox("image")}
              </Box>
          )}
          {activeStep === 2 && (
               <Box sx={{ maxWidth: 600, mx: "auto", textAlign: "center", py: 5 }}>
                 <PlayArrowIcon sx={{ fontSize: 80, color: "primary.main", mb: 3 }} />
                 <Typography variant="h5" gutterBottom>
                    准备就绪
                 </Typography>
                 <Typography variant="body1" color="text.secondary" paragraph>
                     文件与图片已就绪，点击下方按钮开始解析页面结构。
                 </Typography>

                 <Box sx={{ display: "flex", justifyContent: "center", gap: 3, mt: 4 }}>
                    <Card variant="outlined" sx={{ width: 120, p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                         <FileCopyIcon color="action" fontSize="large" sx={{mb: 1}}/>
                         <Typography variant="caption" noWrap sx={{maxWidth: '100%'}}>{jsonXmlFile?.name}</Typography>
                    </Card>
                    <Card variant="outlined" sx={{ width: 120, p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                         <CardMedia component="img" height="40" image={imageState?.preview} sx={{objectFit: 'contain', mb: 1}} />
                         <Typography variant="caption" noWrap sx={{maxWidth: '100%'}}>{imageState?.file.name}</Typography>
                    </Card>
                 </Box>
               </Box>
          )}
      </Box>

      {/* Footer Actions */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
        <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            variant="outlined"
        >
            上一步
        </Button>
        {activeStep === steps.length - 1 ? (
             <Button
                variant="contained"
                onClick={handleParse}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
             >
                {loading ? "解析中..." : "开始解析"}
             </Button>
        ) : (
            <Button variant="contained" onClick={handleNext}>
                下一步
            </Button>
        )}
      </Box>
    </Box>
  );
};

export default ComponentParserPanel;
