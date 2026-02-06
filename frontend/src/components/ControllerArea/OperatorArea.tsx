import PhoneLinkRingIcon from "@mui/icons-material/Phonelink";
import MobileOffIcon from "@mui/icons-material/MobileOff";
import CachedIcon from "@mui/icons-material/Cached";
import MenuIcon from "@mui/icons-material/Menu";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import UndoIcon from "@mui/icons-material/Undo";
import HomeIcon from "@mui/icons-material/Home";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import axios from "axios";
import { Box, Button, IconButton, Tooltip } from "@mui/material";
import { useState } from "react";
import { useSnackbar } from "notistack";

import { xmlToJSON } from "../../utils/sourceParsing2";
import { useAppSelector, useAppDispatch } from "../../hooks";
import { setConnectionState } from "../../store/slices/connectionStateSlice";
import { setAdComponent } from "../../store/slices/androidComponentSlice";
import {
  setScreenSize,
  setImageFileName,
  resetNodeState,
} from "../../store/slices/screenCacheSlice";

export default function OperatorArea() {
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { connected } = useAppSelector((state) => state.connectionState);
  const systemConfig = useAppSelector((state) => state.systemConfig);
  const [actionLoading, setActionLoading] = useState(false);

  // 处理连接/断开按钮点击
  const handleConnectionToggle = () => {
    setActionLoading(true);
    if (connected) {
      axios
        .post("/api/v1/system/disconnect", {
          deviceType: systemConfig.deviceType,
          serial: systemConfig.deviceSerial,
        })
        .then((res) => {
          if (res.data.code === 200) {
            enqueueSnackbar("断开设备成功!", {
              variant: "success",
            });
          } else {
            enqueueSnackbar("断开设备失败!" + res.data.message, {
              variant: "error",
            });
          }
        })
        .catch((err) => {
          enqueueSnackbar("断开设备失败!" + err.message, {
            variant: "error",
          });
        })
        .finally(() => {
          setActionLoading(false);
        });
      dispatch(setConnectionState(false));
      dispatch(resetNodeState());
      setActionLoading(false);
      return;
    }
    if (!systemConfig.deviceSerial) {
      enqueueSnackbar("设备序列号不能为空！", {
        variant: "error",
      });
      setActionLoading(false);
      return;
    }

    axios
      .post("/api/v1/system/connect", {
        deviceType: systemConfig.deviceType,
        serial: systemConfig.deviceSerial,
      })
      .then((res) => {
        if (res.data.code === 200) {
          dispatch(setConnectionState(true));
          dispatch(
            setScreenSize({
              width: res.data.result.size.width,
              height: res.data.result.size.height,
            })
          );
          const x2j = xmlToJSON(res.data.result.pageContent);
          console.log("xml转换后的json", x2j);
          dispatch(setImageFileName(res.data.result.imageFileName));
          dispatch(
            setAdComponent({
              treeObject: x2j.treeObject,
              treeMap: x2j.treeMap,
              imageSource: res.data.result.imageFileName,
            })
          );
        } else {
          enqueueSnackbar("连接设备失败!" + res.data.message, {
            variant: "error",
          });
        }
      })
      .catch((err) => {
        enqueueSnackbar("连接设备失败!" + err.message, {
          variant: "error",
        });
      })
      .finally(() => {
        setActionLoading(false);
      });
  };

  // 截图按钮
  const handleScreenshot = () => {
    setActionLoading(true);
    let urlPath = "/api/v1/android/screenshot";
    if (systemConfig.deviceType == "harmony") {
      urlPath = "/api/v1/harmony/screenshot";
    }
    axios
      .get(urlPath)
      .then((res) => {
        if (res.data.code === 200) {
          enqueueSnackbar("截图保存位置: " + res.data.result, {
            variant: "success",
          });
        } else {
          enqueueSnackbar("请求截图失败!" + res.data.message, {
            variant: "error",
          });
        }
      })
      .catch((err) => {
        enqueueSnackbar("截图执行异常!" + err.message, {
          variant: "error",
        });
      })
      .finally(() => {
        setActionLoading(false);
      });
  };

  // 处理刷新设备资源按钮点击
  const handleDumpResource = () => {
    setActionLoading(true);
    dispatch(resetNodeState());
    let urlPath = "/api/v1/android/dump-screen";
    if (systemConfig.deviceType == "harmony") {
      urlPath = "/api/v1/harmony/dump-screen";
    }
    axios
      .get(urlPath)
      .then((res) => {
        if (res.data.code === 200) {
          const x2j = xmlToJSON(res.data.result.pageContent);
          console.log("xml转换后的json", x2j);
          dispatch(setImageFileName(res.data.result.imageFileName));
          dispatch(
            setAdComponent({
              treeObject: x2j.treeObject,
              treeMap: x2j.treeMap,
              imageSource: res.data.result.imageFileName,
            })
          );
        } else {
          enqueueSnackbar("获取设备资源失败!" + res.data.message, {
            variant: "error",
          });
        }
      })
      .catch((err) => {
        console.log(err);
      })
      .finally(() => {
        setActionLoading(false);
      });
  };

  // 处理点击最近任务的按钮
  const handleRecentTasks = () => {
    setActionLoading(true);
    let urlPath = "/api/v1/android/operation";
    if (systemConfig.deviceType == "harmony") {
      urlPath = "/api/v1/harmony/operation";
    }
    axios
      .post(urlPath, {
        method: "recent-apps",
      })
      .then((res) => {
        if (res.data.code === 200) {
          const x2j = xmlToJSON(res.data.result.pageContent);
          console.log("xml转换后的json", x2j);
          dispatch(setImageFileName(res.data.result.imageFileName));
          dispatch(
            setAdComponent({
              treeObject: x2j.treeObject,
              treeMap: x2j.treeMap,
              imageSource: res.data.result.imageFileName,
            })
          );
        } else {
          enqueueSnackbar("点击最近任务按钮失败!" + res.data.message, {
            variant: "error",
          });
        }
      })
      .catch((err) => {
        console.log(err);
      })
      .finally(() => {
        setActionLoading(false);
      });
  };

  // 处理点击返回首页的按钮
  const handleHome = () => {
    setActionLoading(true);
    let urlPath = "/api/v1/android/operation";
    if (systemConfig.deviceType == "harmony") {
      urlPath = "/api/v1/harmony/operation";
    }
    axios
      .post(urlPath, {
        method: "home",
      })
      .then((res) => {
        if (res.data.code === 200) {
          const x2j = xmlToJSON(res.data.result.pageContent);
          console.log("xml转换后的json", x2j);
          dispatch(setImageFileName(res.data.result.imageFileName));
          dispatch(
            setAdComponent({
              treeObject: x2j.treeObject,
              treeMap: x2j.treeMap,
              imageSource: res.data.result.imageFileName,
            })
          );
        } else {
          enqueueSnackbar("点击返回首页按钮失败!" + res.data.message, {
            variant: "error",
          });
        }
      })
      .catch((err) => {
        console.log(err);
      })
      .finally(() => {
        setActionLoading(false);
      });
  };

  // 处理点击返回按钮
  const handleBack = () => {
    setActionLoading(true);
    let urlPath = "/api/v1/android/operation";
    if (systemConfig.deviceType == "harmony") {
      urlPath = "/api/v1/harmony/operation";
    }
    axios
      .post(urlPath, {
        method: "back",
      })
      .then((res) => {
        if (res.data.code === 200) {
          const x2j = xmlToJSON(res.data.result.pageContent);
          console.log("xml转换后的json", x2j);
          dispatch(setImageFileName(res.data.result.imageFileName));
          dispatch(
            setAdComponent({
              treeObject: x2j.treeObject,
              treeMap: x2j.treeMap,
              imageSource: res.data.result.imageFileName,
            })
          );
        } else {
          enqueueSnackbar("点击返回按钮失败!" + res.data.message, {
            variant: "error",
          });
        }
      })
      .catch((err) => {
        console.log(err);
      })
      .finally(() => {
        setActionLoading(false);
      });
  };

  // 处理点击重启按钮
  const handleRestart = () => {
    setActionLoading(true);
    let urlPath = "/api/v1/android/operation";
    if (systemConfig.deviceType == "harmony") {
      urlPath = "/api/v1/harmony/operation";
    }
    axios
      .post(urlPath, {
        method: "reboot",
      })
      .then((res) => {
        if (res.data.code === 200) {
          const x2j = xmlToJSON(res.data.result.pageContent);
          console.log("xml转换后的json", x2j);
          dispatch(setImageFileName(res.data.result.imageFileName));
          dispatch(
            setAdComponent({
              treeObject: x2j.treeObject,
              treeMap: x2j.treeMap,
              imageSource: res.data.result.imageFileName,
            })
          );
        } else {
          enqueueSnackbar("触发重启失败!" + res.data.message, {
            variant: "error",
          });
        }
      })
      .catch((err) => {
        console.log(err);
      })
      .finally(() => {
        setActionLoading(false);
      });
  };

  // 容器样式，实现垂直居中
  const containerStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start", // 从左侧开始布局
    height: "100%",
    width: "100%",
    paddingLeft: 3, // 容器左侧内边距3px
  };

  // 分割线样式
  const dividerStyle = {
    width: "1px",
    height: 20,
    backgroundColor: "#e0e0e0",
    marginX: "10px",
  };

  // 按钮容器样式
  const buttonsContainerStyle = {
    display: "flex",
    alignItems: "center",
    gap: "3px",
    width: "100%",
    justifyContent: "flex-start", // 从左侧开始布局
  };

  return (
    <Box sx={containerStyle}>
      <Box sx={buttonsContainerStyle}>
        <Button
          loading={actionLoading}
          loadingPosition="end"
          variant="outlined"
          color={connected ? "primary" : "error"}
          size="small"
          sx={{ width: 160 }}
          startIcon={connected ? <PhoneLinkRingIcon /> : <MobileOffIcon />}
          onClick={handleConnectionToggle}
        >
          {connected ? "断开设备连接" : "点击连接设备"}
        </Button>
        <Box sx={dividerStyle} />
        <Tooltip title="刷新资源">
          <span>
            <IconButton
              color="primary"
              disabled={!connected}
              loading={actionLoading}
              onClick={handleDumpResource}
            >
              <CachedIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="截图">
          <span>
            <IconButton
              color="primary"
              disabled={!connected}
              loading={actionLoading}
              onClick={handleScreenshot}
            >
              <CameraAltIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Box sx={dividerStyle} />
        <Tooltip title="最近任务">
          <span>
            <IconButton
              color="secondary"
              disabled={!connected}
              loading={actionLoading}
              onClick={handleRecentTasks}
            >
              <MenuIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="返回首页">
          <span>
            <IconButton
              color="secondary"
              disabled={!connected}
              loading={actionLoading}
              onClick={handleHome}
            >
              <HomeIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="返回">
          <span>
            <IconButton
              color="secondary"
              disabled={!connected}
              loading={actionLoading}
              onClick={handleBack}
            >
              <UndoIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Box sx={dividerStyle} />
        <Tooltip title="重启">
          <span>
            <IconButton
              color="warning"
              disabled={!connected}
              loading={actionLoading}
              onClick={handleRestart}
            >
              <RestartAltIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
}
