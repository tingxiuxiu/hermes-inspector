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
  IconButton,
  FormControlLabel,
  Switch,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import DocumentScannerIcon from "@mui/icons-material/DocumentScanner";
import { useSnackbar } from "notistack";

const OcrPanel: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [autoScreenshot, setAutoScreenshot] = useState(false);
  const [imageState, setImageState] = useState<{ file: File; preview: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [resultData, setResultData] = useState<{
    imagePath: string;
    locationInfo: string;
  } | null>(null);
  
  const { enqueueSnackbar } = useSnackbar();

  const steps = ["选择图片", "开始识别"];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleRemoveImage = () => {
      setImageState(null);
  };

  const handleNext = () => {
    if (activeStep === 0 && !imageState && !autoScreenshot) {
      enqueueSnackbar("请先选择图片或开启自动截图模式", { variant: "warning" });
      return;
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleRecognize = async () => {
    if (!imageState && !autoScreenshot) {
        enqueueSnackbar("请先选择图片或开启自动截图模式", { variant: "error" });
        return;
    }

    setLoading(true);
    
    // Construct FormData
    const formData = new FormData();
    if (imageState) {
        formData.append("imageFile", imageState.file);
    }
    formData.append("autoScreenshot", String(autoScreenshot));

    try {
        // Mocking API call
        // authentic endpoint would be /api/v1/ocr/recognize
        // await axios.post("/api/v1/ocr/recognize", formData);
        
        // Simulating network delay and response
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const mockResponse = {
            imagePath: imageState ? imageState.preview : "https://via.placeholder.com/400x300?text=Screenshot+Result", 
            locationInfo: JSON.stringify({
                items: [
                    { text: "Example Text", bounds: [100, 200, 300, 40] },
                    { text: "Detected ID: 12345", bounds: [100, 250, 200, 30] }
                ],
                confidence: 0.98
            }, null, 2)
        };

        setResultData(mockResponse);
        setResultOpen(true);

    } catch (error) {
        console.error("Recognition failed", error);
        enqueueSnackbar("识别失败", { variant: "error" });
    } finally {
        setLoading(false);
    }
  };

  const renderUploadBox = () => {
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
        onClick={() => !imageState && document.getElementById("ocr-file-upload")?.click()}
      >
        <input
          id="ocr-file-upload"
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleImageUpload}
        />
        
        {imageState ? (
          <Box sx={{ width: "100%", height: "100%", textAlign: "center" }}>
             <Box sx={{position: 'absolute', top: 10, right: 10}}>
                <IconButton onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage();
                }}>
                    <DeleteIcon color="error" />
                </IconButton>
             </Box>
            <img
              src={imageState.preview}
              alt="OCR Target"
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
              点击上传图片
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
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={autoScreenshot}
                                onChange={(e) => setAutoScreenshot(e.target.checked)}
                                color="primary"
                            />
                        }
                        label="自动截图模式"
                    />
                </Box>
                {!autoScreenshot ? (
                    renderUploadBox()
                ) : (
                    <Paper
                        variant="outlined"
                        sx={{
                            p: 3,
                            borderStyle: "dashed",
                            borderColor: "primary.main",
                            backgroundColor: "rgba(25, 118, 210, 0.04)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            minHeight: 300,
                        }}
                    >
                        <DocumentScannerIcon sx={{ fontSize: 60, color: "primary.main", mb: 2 }} />
                        <Typography variant="h6" color="primary">
                            已开启自动截图模式
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            下一步将自动截取当前屏幕进行识别
                        </Typography>
                    </Paper>
                )}
            </Box>
        )}
        {activeStep === 1 && (
             <Box sx={{ maxWidth: 600, mx: "auto", textAlign: "center", py: 5 }}>
                <DocumentScannerIcon sx={{ fontSize: 80, color: "primary.main", mb: 3 }} />
                <Typography variant="h5" gutterBottom>
                    准备就绪
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                    {autoScreenshot ? "将在点击开始后自动截图并识别。" : "图片已就绪，点击下方按钮开始识别。"}
                </Typography>
                
                {imageState && (
                    <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 4 }}>
                        <Card variant="outlined" sx={{ width: 150, p: 1 }}>
                            <CardMedia component="img" height="100" image={imageState.preview} sx={{objectFit: 'contain'}} />
                            <Typography variant="caption" noWrap>目标图片</Typography>
                        </Card>
                    </Box>
                )}
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
            onClick={handleRecognize}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <DocumentScannerIcon />}
          >
            {loading ? "识别中..." : "开始识别"}
          </Button>
        ) : (
          <Button variant="contained" onClick={handleNext}>
            下一步
          </Button>
        )}
      </Box>

      {/* Result Modal */}
      <Dialog open={resultOpen} onClose={() => setResultOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>识别结果</DialogTitle>
        <DialogContent dividers>
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 7 }}>
                    <Box sx={{ 
                        width: '100%', 
                        height: 400, 
                        bgcolor: 'white', 
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
                <Grid size={{ xs: 12, md: 5 }}>
                    <Typography variant="h6" gutterBottom>位置信息</Typography>
                    {resultData && (
                        <Paper variant="outlined" sx={{ p: 2, maxHeight: 400, overflow: 'auto', bgcolor: 'grey.50' }}>
                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.875rem' }}>
                                {resultData.locationInfo}
                            </pre>
                        </Paper>
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

export default OcrPanel;
