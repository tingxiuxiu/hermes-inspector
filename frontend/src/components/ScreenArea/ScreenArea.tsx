import React, { useState } from "react";
import { Stage, Layer, Rect, Image as KonvaImage } from "react-konva";
import useImage from "use-image";
import { useAppSelector, useAppDispatch } from "../../hooks";
import { setMousePosition } from "../../store/slices/mouseActionSlice";
import {
  setSelectedNodeKey,
  setFocusNodeKey,
} from "../../store/slices/screenCacheSlice";

const ScreenArea: React.FC = () => {
  const dispatch = useAppDispatch();
  const { imageSource } = useAppSelector((state) => state.androidComponent);
  const { width, height, scale } = useAppSelector((state) => state.screenCache);
  const { treeMap } = useAppSelector((state) => state.androidComponent);
  const { selectedNodeKey, focusNodeKey } = useAppSelector(
    (state) => state.screenCache
  );

  const [image] = useImage(imageSource);
  const [cursor, setCursor] = useState("default");

  const handleMouseEnter = () => {
    setCursor("crosshair");
  };

  // 处理鼠标移动事件
  const handleMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    if (pointerPosition) {
      // 计算相对于原始图片的实际位置
      const relativePosition = {
        x: Math.round(pointerPosition.x / scale),
        y: Math.round(pointerPosition.y / scale),
      };
      // console.log("当前鼠标位置:", relativePosition);

      let closestItems: Array<{ key: string; value: any; area: number; distance: number }> = [];
      
      // 收集所有包含鼠标的节点
      for (let [key, value] of Object.entries(treeMap)) {
        const [x1, y1, x2, y2] = value.boundsArray || [0, 0, 0, 0];
        const isInside = 
          relativePosition.x >= x1 &&
          relativePosition.x <= x2 &&
          relativePosition.y >= y1 &&
          relativePosition.y <= y2;

        if (isInside) {
          // 计算节点面积
          const area = (x2 - x1) * (y2 - y1);
          // 计算中心距离
          const distance = Math.sqrt(
            (value.center[0] - relativePosition.x) ** 2 +
              (value.center[1] - relativePosition.y) ** 2
          );
          
          closestItems.push({ key, value, area, distance });
        }
      }
      
      let closestKey = null;
      if (closestItems.length > 0) {
        // 优先选择面积最小的节点（最内层节点）
        // 如果面积相同，则选择中心距离最小的节点
        closestItems.sort((a, b) => {
          if (a.area !== b.area) {
            return a.area - b.area; // 面积小的排前面
          } else {
            return a.distance - b.distance; // 距离近的排前面
          }
        });
        
        closestKey = closestItems[0].key;
      }
      dispatch(setFocusNodeKey(closestKey));
      dispatch(setMousePosition(relativePosition));
    }
  };

  const handleMouseOut = () => {
    setCursor("default");
    dispatch(setMousePosition({ x: 0, y: 0 }));
    dispatch(setFocusNodeKey(null));
  };

  const handleMouseClick = () => {
    if (focusNodeKey) {
      dispatch(setSelectedNodeKey(focusNodeKey));
    }
  };

  return (
    <>
      <Stage
        width={width * scale}
        height={height * scale}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseOut}
        onClick={handleMouseClick}
        style={{ cursor: cursor }}
      >
        <Layer>
          {/* 配置konval内部图片等比例显示 */}
          <KonvaImage image={image} scale={{ x: scale, y: scale }} />
          {focusNodeKey && treeMap[focusNodeKey] && (
            <Rect
              x={treeMap[focusNodeKey].boundsArray[0] * scale}
              y={treeMap[focusNodeKey].boundsArray[1] * scale}
              width={
                (treeMap[focusNodeKey].boundsArray[2] -
                  treeMap[focusNodeKey].boundsArray[0]) *
                scale
              }
              height={
                (treeMap[focusNodeKey].boundsArray[3] -
                  treeMap[focusNodeKey].boundsArray[1]) *
                scale
              }
              stroke="yellow"
              fill="rgba(255, 255, 0, 0.2)"
              strokeWidth={2}
              name="nearestItemRect"
            />
          )}
          {selectedNodeKey && (
            <Rect
              x={treeMap[selectedNodeKey].boundsArray[0] * scale}
              y={treeMap[selectedNodeKey].boundsArray[1] * scale}
              width={
                (treeMap[selectedNodeKey].boundsArray[2] -
                  treeMap[selectedNodeKey].boundsArray[0]) *
                scale
              }
              height={
                (treeMap[selectedNodeKey].boundsArray[3] -
                  treeMap[selectedNodeKey].boundsArray[1]) *
                scale
              }
              stroke="red"
              fill="rgba(255, 0, 0, 0.2)"
              strokeWidth={2}
              name="selectedItemRect"
            />
          )}
        </Layer>
      </Stage>
    </>
  );
};

export default ScreenArea;
