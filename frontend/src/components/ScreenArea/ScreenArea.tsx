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

      let minDistanceC = Infinity;
      let minDistanceLT = Infinity;
      let closestItem = null;
      let closestKey = null;
      for (let [key, value] of Object.entries(treeMap)) {
        // console.log("遍历节点对象计算距离")
        // console.log(key, value);
        // 检查鼠标是否在节点范围内
        const [x1, y1, x2, y2] = value.boundsArray || [0, 0, 0, 0];
        const isInside =
          relativePosition.x >= x1 &&
          relativePosition.x <= x2 &&
          relativePosition.y >= y1 &&
          relativePosition.y <= y2;

        // 收集所有包含鼠标的节点
        if (isInside) {
          // 计算中心距离 和 左上角距离
          const distanceC = Math.sqrt(
            (value.center[0] - relativePosition.x) ** 2 +
              (value.center[1] - relativePosition.y) ** 2
          );
          const distanceLT = Math.sqrt(
            (value.boundsArray[0] - relativePosition.x) ** 2 +
              (value.boundsArray[1] - relativePosition.y) ** 2
          );
          // console.log("当前节点距离:", distanceC);
          if (distanceC < minDistanceC && distanceLT < minDistanceLT) {
            minDistanceC = distanceC;
            minDistanceLT = distanceLT;
            closestItem = value;
            closestKey = key;
            // console.log("最近节点key:", closestKey, "最近节点value:", closestItem.center);
          }
        }
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
