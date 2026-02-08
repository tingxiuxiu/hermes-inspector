import { Box, Tab } from "@mui/material";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import TabPanel from "@mui/lab/TabPanel";
import ComponentTreePanel from "./ComponentTreePanel";
import ComponentParser from "./ComponentParserPanel";
import OcrPanel from "./OcrPanel";
import ImageCalculatePanel from "./ImageCalculatePanel";
import { useAppSelector, useAppDispatch } from "../../hooks";
import { setActiveTab } from "../../store/slices/controlTabSlice";

function ControllerArea() {
  const { activeTab } = useAppSelector((state) => state.controlTab);
  const dispatch = useAppDispatch();

  const handleChangeTab = (_event: React.SyntheticEvent, newValue: string) => {
    dispatch(setActiveTab(newValue));
  };

  return (
    <Box id="controller-area-box">
      <TabContext value={activeTab}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <TabList onChange={handleChangeTab} aria-label="controller area tabs">
            <Tab label="节点树" value="1" />
            <Tab label="解析文件" value="2" />
            <Tab label="图像计算" value="3" />
            <Tab label="文字识别" value="4" />
            <Tab label="元素操作" value="5" />
          </TabList>
        </Box>
        <TabPanel
          value="1"
          sx={{ height: "calc(100vh - 160px)", padding: "5px 5px" }}
        >
          <ComponentTreePanel />
        </TabPanel>
        <TabPanel value="2">
          <ComponentParser />
        </TabPanel>
        <TabPanel value="3">
          <ImageCalculatePanel />
        </TabPanel>
        <TabPanel value="4">
          <OcrPanel />
        </TabPanel>
        <TabPanel value="5">元素操作</TabPanel>
      </TabContext>
    </Box>
  );
}

export default ControllerArea;
