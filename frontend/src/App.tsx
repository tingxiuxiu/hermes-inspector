import { useEffect, useRef } from "react";
import { Box } from "@mui/material";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import AppNavBar from "./components/AppNavbar";
import AppFootBar from "./components/FootBar";
import ControllerArea from "./components/ControllerArea";
import OperatorArea from "./components/ControllerArea/OperatorArea";
import ScreenArea from "./components/ScreenArea/ScreenArea";
import DrawingBoardArea from "./components/ScreenArea/DrawingBoardArea";

import { useAppDispatch, useAppSelector } from "./hooks";
import { setScreenScale } from "./store/slices/screenCacheSlice";
import "./App.css";

function App() {
  const dispatch = useAppDispatch();
  const screenBoxRef = useRef<HTMLDivElement>(null);
  const { width, height } = useAppSelector((state) => state.screenCache);
  const { activeTab } = useAppSelector((state) => state.controlTab);

  // 监听screenref变化和容器尺寸变化
  useEffect(() => {
    if (screenBoxRef.current) {
      // 计算并设置初始缩放比例
      const calculateAndSetScale = () => {
        if (screenBoxRef.current) {
          const screenBox = screenBoxRef.current;
          const screenBoxWidth = screenBox.clientWidth;
          const screenBoxHeight = screenBox.clientHeight;
          console.log("当前设备屏幕窗口尺寸:", screenBoxWidth, screenBoxHeight);
          if (width && height) {
            if (width >= height) {
              const _scale = screenBoxWidth / width;
              console.log(
                "当前设备屏幕宽度大于等于高度，重新配置缩放比:",
                _scale
              );
              dispatch(setScreenScale(_scale));
            } else {
              const _scale = screenBoxHeight / height;
              console.log("当前设备屏幕高度大于宽度，重新配置缩放比:", _scale);
              dispatch(setScreenScale(_scale));
            }
          }
        }
      };

      // 初始计算缩放比例
      calculateAndSetScale();

      // 创建ResizeObserver监听容器尺寸变化
      const resizeObserver = new ResizeObserver(() => {
        calculateAndSetScale();
      });

      // 开始监听
      resizeObserver.observe(screenBoxRef.current);

      // 清理函数
      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [screenBoxRef, width, height]);

  return (
    <Box>
      {/* 顶部导航栏 */}
      <AppNavBar />
      {/* 主要内容区域 */}
      <Box className="content-area">
        <PanelGroup direction="horizontal">
          {/* 左侧窗口 -  - 内部包含上下布局 */}
          <Panel defaultSize={50} minSize={30}>
            <PanelGroup direction="vertical">
              {/* 控制按钮窗口 */}
              <Box className="control-panel">
                <OperatorArea />
              </Box>
              <Box className="split-x" />
              {/* 屏幕窗口 */}
              <Box className="screen-panel">
                {/* 这个box外边距各 8px */}
                <Box className="screen-area-box" ref={screenBoxRef}>
                  {activeTab === "1" && <ScreenArea />}
                  {(activeTab === "2" ||
                    activeTab === "3" ||
                    activeTab === "4") && <DrawingBoardArea />}
                </Box>
              </Box>
            </PanelGroup>
          </Panel>
          {/* 左右分隔条 */}
          <PanelResizeHandle className="split-y" />
          {/* 右侧窗口 */}
          <Panel className="inspector-panel" defaultSize={50} minSize={30}>
            <ControllerArea />
          </Panel>
        </PanelGroup>
      </Box>

      {/* 底部状态栏 */}
      <Box className="bottom-area">
        <AppFootBar />
      </Box>
    </Box>
  );
}

export default App;
