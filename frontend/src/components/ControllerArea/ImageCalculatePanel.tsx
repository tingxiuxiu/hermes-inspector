import React, { useState } from "react";
import {
  Box,
  Button,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Card,
  CardMedia,
  CardContent,
  IconButton,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import CalculateIcon from "@mui/icons-material/Calculate";
import { useSnackbar } from "notistack";
import axios from "axios";

const ImageCalculatePanel: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [targetImage, setTargetImage] = useState<{ file: File; preview: string } | null>(null);
  const [resourceImage, setResourceImage] = useState<{ file: File; preview: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [resultData, setResultData] = useState<{
    imagePath: string;
    position: string;
    similarity: string;
  } | null>(null);
  
  const { enqueueSnackbar } = useSnackbar();

  const steps = ["选择目标图片", "选择资源图", "计算"];

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "target" | "resource"
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const preview = URL.createObjectURL(file);
      if (type === "target") {
        setTargetImage({ file, preview });
        // Target is required, so we can potentially auto-advance or just let user click next
      } else {
        setResourceImage({ file, preview });
      }
    }
  };

  const handleRemoveImage = (type: "target" | "resource") => {
    if (type === "target") {
      setTargetImage(null);
    } else {
      setResourceImage(null);
    }
    // If clearing target image, reset input if needed, but managing state is enough
  };

  const handleNext = () => {
    if (activeStep === 0 && !targetImage) {
      enqueueSnackbar("请先选择目标图片", { variant: "warning" });
      return;
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleCalculate = async () => {
    if (!targetImage) {
        enqueueSnackbar("缺失目标图片", { variant: "error" });
        return;
    }

    setLoading(true);
    
    // Construct FormData
    const formData = new FormData();
    formData.append("targetImage", targetImage.file);
    if (resourceImage) {
        formData.append("resourceImage", resourceImage.file);
    }

    try {
        // Mocking API call for now as user requested frontend implementation
        // authentic endpoint would be /api/v1/image/match or similar
        // await axios.post("/api/v1/image/match", formData);
        
        // Simulating network delay and response
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const mockResponse = {
            imagePath: targetImage.preview, // In real app this would be a URL from server
            position: "{x: 100, y: 200, w: 50, h: 50}",
            similarity: "98.5%"
        };

        setResultData(mockResponse);
        setResultOpen(true);

    } catch (error) {
        console.error("Calculation failed", error);
        enqueueSnackbar("计算失败", { variant: "error" });
    } finally {
        setLoading(false);
    }
  };

  const renderUploadBox = (type: "target" | "resource", title: string) => {
    const imageState = type === "target" ? targetImage : resourceImage;
    const isRequired = type === "target";

    return (
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          borderStyle: "dashed",
          borderColor: imageState ? "success.main" : "grey.400",
          backgroundColor: imageState ? "rgba(76, 175, 80, 0.04)" : "transparent",
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
        onClick={() => !imageState && document.getElementById(`file-upload-${type}`)?.click()}
      >
        <input
          id={`file-upload-${type}`}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => handleImageUpload(e, type)}
        />
        
        {imageState ? (
          <Box sx={{ width: "100%", height: "100%", textAlign: "center" }}>
             <Box sx={{position: 'absolute', top: 10, right: 10}}>
                <IconButton onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage(type);
                }}>
                    <DeleteIcon color="error" />
                </IconButton>
             </Box>
            <img
              src={imageState.preview}
              alt={title}
              style={{
                maxWidth: "100%",
                maxHeight: 250,
                objectFit: "contain",
                borderRadius: 4,
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
              }}
            />
             <Typography variant="subtitle1" sx={{ mt: 2 }}>
              {imageState.file.name}
            </Typography>
          </Box>
        ) : (
          <>
            <CloudUploadIcon sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              点击上传{title} {isRequired ? "(必选)" : "(可选)"}
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
                {renderUploadBox("target", "目标图片")}
            </Box>
        )}
        {activeStep === 1 && (
            <Box sx={{ maxWidth: 600, mx: "auto" }}>
                {renderUploadBox("resource", "资源图")}
            </Box>
        )}
        {activeStep === 2 && (
             <Box sx={{ maxWidth: 600, mx: "auto", textAlign: "center", py: 5 }}>
                <CalculateIcon sx={{ fontSize: 80, color: "primary.main", mb: 3 }} />
                <Typography variant="h5" gutterBottom>
                    准备就绪
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                    目标图片已选择, {resourceImage ? "资源图已选择" : "未选择资源图"}. 点击下方按钮开始计算。
                </Typography>
                
                <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 4 }}>
                    <Card variant="outlined" sx={{ width: 100, p: 1 }}>
                        <CardMedia component="img" height="80" image={targetImage?.preview} sx={{objectFit: 'contain'}} />
                        <Typography variant="caption" noWrap>目标</Typography>
                    </Card>
                    {resourceImage && (
                         <Card variant="outlined" sx={{ width: 100, p: 1 }}>
                         <CardMedia component="img" height="80" image={resourceImage.preview} sx={{objectFit: 'contain'}} />
                         <Typography variant="caption" noWrap>资源</Typography>
                     </Card>
                    )}
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
            onClick={handleCalculate}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CalculateIcon />}
          >
            {loading ? "计算中..." : "开始计算"}
          </Button>
        ) : (
          <Button variant="contained" onClick={handleNext}>
            下一步
          </Button>
        )}
      </Box>

      {/* Result Modal */}
      <Dialog open={resultOpen} onClose={() => setResultOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>计算结果</DialogTitle>
        <DialogContent dividers>
            <Grid container spacing={2}>
                <Grid item xs={12} md={7}>
                    <Box sx={{ 
                        width: '100%', 
                        height: 400, 
                        bgcolor: 'black', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        borderRadius: 1,
                        overflow: 'hidden'
                    }}>
                        {resultData && (
                            <img 
                                src={resultData.imagePath} 
                                alt="Result" 
                                style={{ maxWidth: '100%', maxHeight: '100%' }} 
                            />
                        )}
                    </Box>
                </Grid>
                <Grid item xs={12} md={5}>
                    <Typography variant="h6" gutterBottom>详细信息</Typography>
                    {resultData && (
                        <Box component="dl">
                             <Typography component="dt" color="text.secondary" variant="subtitle2">位置信息</Typography>
                             <Typography component="dd" variant="body1" sx={{ mb: 2, ml: 0 }}>{resultData.position}</Typography>
                             
                             <Typography component="dt" color="text.secondary" variant="subtitle2">相似度</Typography>
                             <Typography component="dd" variant="body1" sx={{ mb: 2, ml: 0 }}>
                                <Typography component="span" color="primary.main" fontWeight="bold">
                                    {resultData.similarity}
                                </Typography>
                             </Typography>
                        </Box>
                    )}
                </Grid>
            </Grid>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setResultOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ImageCalculatePanel;
