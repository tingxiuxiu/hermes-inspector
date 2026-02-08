import React, { useState } from "react";
import axios from "axios";
import { IconButton, Box } from "@mui/material";
import { useSnackbar } from "notistack";
import ClearIcon from "@mui/icons-material/Clear";
import CropIcon from "@mui/icons-material/Crop";

import {
  Stage,
  Layer,
  Rect,
  Circle,
  Image as KonvaImage,
} from "react-konva";
import useImage from "use-image";
import { useAppSelector, useAppDispatch } from "../../hooks";
import {
  setMousePosition,
  setMouseStartPosition,
  setMouseEndPosition,
} from "../../store/slices/mouseActionSlice";
import { setSelectedBounds } from "../../store/slices/screenCacheSlice";

const DrawingBoardArea: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useAppDispatch();
  const { imageSource } = useAppSelector((state) => state.androidComponent);
  const { width, height, scale, imageFilename, selectedBounds } = useAppSelector(
    (state) => state.screenCache
  );
  const { startPosition, endPosition } = useAppSelector(
    (state) => state.mouseAction
  );

  const clearButtonLeft = width * scale - 34;

  const [image] = useImage(imageSource);
  const [cursor, setCursor] = useState("default");
  const [startDrag, setStartDrag] = useState(false);
  const [showExtraButton, setShowExtraButton] = useState(false);

  const handleMouseEnter = () => {
    setCursor("crosshair");
  };

  const handleMouseDown = (_e: any) => {
    const stage = _e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    if (pointerPosition) {
      // 计算相对于原始图片的实际位置
      setStartDrag(true);
      dispatch(setMouseStartPosition(pointerPosition));
      dispatch(setMouseEndPosition(pointerPosition));
    }
  };

  // 处理鼠标移动事件
  const handleMouseMove = (_e: any) => {
    const stage = _e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    if (pointerPosition) {
      // 计算相对于原始图片的实际位置
      const relativePosition = {
        x: Math.round(pointerPosition.x / scale),
        y: Math.round(pointerPosition.y / scale),
      };
      // console.log("当前鼠标位置:", relativePosition);

      dispatch(setMousePosition(relativePosition));
      if (startDrag) {
        dispatch(setMouseEndPosition(pointerPosition));
      }
    }
  };

  const handleMouseUp = (_e: any) => {
    const stage = _e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    if (pointerPosition) {
      setStartDrag(false);
      dispatch(setMouseEndPosition(pointerPosition));
      // 转换为int，处理可选链访问问题
      const safeStart = startPosition || { x: 0, y: 0 };
      const safeEnd = endPosition || { x: 0, y: 0 };
      const startX = Math.round(safeStart.x / scale);
      const startY = Math.round(safeStart.y / scale);
      const endX = Math.round(safeEnd.x / scale);
      const endY = Math.round(safeEnd.y / scale);
      dispatch(setSelectedBounds({ left: startX, top: startY, right: endX, bottom: endY }));
      setShowExtraButton(true);
    }
  };

  const handleMouseOut = () => {
    setCursor("default");
    dispatch(setMousePosition({ x: 0, y: 0 }));
  };

  const handleClearSelection = () => {
    dispatch(setMouseStartPosition(null));
    dispatch(setMouseEndPosition(null));
    dispatch(setSelectedBounds(null));
    setShowExtraButton(false);
  };

  const handleCropImage = () => {
    axios
      .post("api/v1/calculate/crop-image", {
        imageFilename: imageFilename,
        bounds: selectedBounds,
      })
      .then((res) => {
        if (res.data.code == 200) {
          enqueueSnackbar("截图成功, 截图路径: " + res.data.result, {
            variant: "success",
          });
          console.log("截图成功", res);
        } else {
          enqueueSnackbar("截图失败" + res.data.message, {
            variant: "error",
          });
        }
      })
      .catch((err) => {
        enqueueSnackbar("截图失败" + err, {
          variant: "error",
        });
      });
  };

  return (
    <>
      <Stage
        width={width * scale}
        height={height * scale}
        onMouseEnter={handleMouseEnter}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseOut}
        style={{ cursor: cursor }}
      >
        <Layer>
          {/* 配置konval内部图片等比例显示 */}
          <KonvaImage image={image} scale={{ x: scale, y: scale }} />
          {startPosition && endPosition && (
            <>
              <Rect
                key="drag-rect"
                x={startPosition.x}
                y={startPosition.y}
                width={endPosition.x - startPosition.x}
                height={endPosition.y - startPosition.y}
                stroke={"#F76560"}
                strokeWidth={2}
              />
              <Circle
                key={"drag-circle"}
                x={(startPosition.x + endPosition.x) / 2}
                y={(startPosition.y + endPosition.y) / 2}
                radius={
                  endPosition.x > startPosition.x &&
                  endPosition.y > startPosition.y
                    ? Math.sqrt(
                        (endPosition.x - startPosition.x) ** 2 +
                          (endPosition.y - startPosition.y) ** 2
                      ) / 2
                    : 0
                }
                stroke={"#F76560"}
                strokeWidth={2}
                dash={[8, 8]}
              />
            </>
          )}
        </Layer>
      </Stage>
      {showExtraButton && (
        <>
          <Box
            sx={{
              position: "absolute",
              top: 125,
              left: clearButtonLeft,
              zIndex: 1000,
            }}
          >
            <IconButton
              onClick={handleClearSelection}
              sx={{
                bgcolor: "rgba(255,255,255,0.8)",
                "&:hover": { bgcolor: "rgba(255,255,255,1)" },
              }}
            >
              <ClearIcon sx={{ color: "#F76560" }} />
            </IconButton>
          </Box>
          <Box
            sx={{
              position: "absolute",
              top: 168,
              left: clearButtonLeft,
              zIndex: 1000,
            }}
          >
            <IconButton
              onClick={handleCropImage}
              sx={{
                bgcolor: "rgba(255,255,255,0.8)",
                "&:hover": { bgcolor: "rgba(255,255,255,1)" },
              }}
            >
              <CropIcon sx={{ color: "#F76560" }} />
            </IconButton>
          </Box>
        </>
      )}
    </>
  );
};

export default DrawingBoardArea;
