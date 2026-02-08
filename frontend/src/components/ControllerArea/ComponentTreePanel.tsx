import { useState, useEffect } from "react";
import axios from "axios";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { SimpleTreeView, TreeItem } from "@mui/x-tree-view";
import {
  Box,
  Paper,
  TextField,
  Select,
  Button,
  MenuItem,
  IconButton,
  InputLabel,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Zoom,
  CircularProgress,
} from "@mui/material";
import ImageList from "@mui/material/ImageList";
import ImageListItem from "@mui/material/ImageListItem";
import ImageListItemBar from "@mui/material/ImageListItemBar";
import InfoIcon from "@mui/icons-material/Info";
import SearchIcon from "@mui/icons-material/Search";
import UndoIcon from "@mui/icons-material/Undo";
import DoneIcon from "@mui/icons-material/Done";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CheckIcon from "@mui/icons-material/Check";
import ClearIcon from "@mui/icons-material/Clear";
import { useSnackbar } from "notistack";
import copy from "copy-to-clipboard";

import type { SelectChangeEvent } from "@mui/material";
import { useAppSelector, useAppDispatch } from "../../hooks";
import { xmlToJSON } from "../../utils/sourceParsing2";
import { setAdComponent } from "../../store/slices/androidComponentSlice";
import {
  setFocusNodeKey,
  setSelectedNodeKey,
  setImageFilename,
  resetNodeState,
} from "../../store/slices/screenCacheSlice";
import type { TreeObject } from "../../types/ComponentInspector";

type RowItem = {
  attribute: string;
  value: string;
};

type CheckResultItem = {
  screenshot: string;
  title: string;
  description: string;
};

function ComponentTreePanel() {
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const [method, setMethod] = useState("resource-id");
  const [loading, setLoading] = useState(false);
  const [selectorText, setSelectorText] = useState<string>("");
  const [searchText, setSearchText] = useState<undefined | string>(undefined);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<TreeObject[]>([]);
  const [openSearchResultsBox, setOpenSearchResultsBox] = useState(false);
  const [rows, setRow] = useState<RowItem[]>([]);
  const [checkStatus, setCheckStatus] = useState<
    "idle" | "success" | "error" | "loading"
  >("idle");
  const [checkResult, setCheckResult] = useState<CheckResultItem[] | null>(null);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [selectorParams, setSelectorParams] = useState<{
    resource_id?: string;
    text?: string;
    content_desc?: string;
    class_name?: string;
    xpath?: string | null;
  }>({});

  const { selectedNodeKey, imageFilename } = useAppSelector(
    (state) => state.screenCache
  );
  const { treeObject, treeMap } = useAppSelector(
    (state) => state.androidComponent
  );
  const { connected } = useAppSelector((state) => state.connectionState);

  useEffect(() => {
    if (selectedNodeKey) {
      const tmpRows: RowItem[] = [{ attribute: "key", value: selectedNodeKey }];
      for (const key in treeMap[selectedNodeKey]["attributes"]) {
        tmpRows.push({
          attribute: key,
          value: treeMap[selectedNodeKey]["attributes"][key],
        });
        if (key === "bounds") {
          tmpRows.push({
            attribute: "center",
            value: `${treeMap[selectedNodeKey]["center"]}` || "",
          });
          tmpRows.push({
            attribute: "xpath",
            value: treeMap[selectedNodeKey]["xpath"] || "",
          });
        }
      }
      setCheckStatus("idle"); // 重置状态
      setRow(tmpRows);
      let taSelector = "selector = AndroidSelector(\n";
      const sId = treeMap[selectedNodeKey]["attributes"]["resource-id"];
      const sText = treeMap[selectedNodeKey]["attributes"]["text"];
      const sDesc = treeMap[selectedNodeKey]["attributes"]["content-desc"];
      const sClass = treeMap[selectedNodeKey]["attributes"]["class"];
      const sXpath = treeMap[selectedNodeKey]["xpath"];

      setSelectorParams({
        resource_id: sId,
        text: sText,
        content_desc: sDesc,
        class_name: sClass,
        xpath: sXpath,
      });

      taSelector = sId
        ? `${taSelector}    resource_id="${sId}",\n`
        : taSelector;
      taSelector = sText ? `${taSelector}    text="${sText}",\n` : taSelector;
      taSelector = sDesc
        ? `${taSelector}    content_desc="${sDesc}",\n`
        : taSelector;
      taSelector = sClass
        ? `${taSelector}    class_name="${sClass}",\n`
        : taSelector;
      taSelector = sXpath
        ? `${taSelector}    xpath="${sXpath}",\n`
        : taSelector;
      taSelector = `${taSelector})`;
      console.log("selector", taSelector);
      setSelectorText(taSelector);
    } else {
      setSelectorText("");
      setRow([]);
    }
    setExpandedItems(generateExpandedItems(selectedNodeKey));
  }, [selectedNodeKey]);

  const generateExpandedItems = (nodeKey: string | null) => {
    if (!nodeKey) return [];
    const parts = nodeKey.split("-");
    const expandedItems = new Set<string>();

    // 生成所有父节点路径
    for (let i = 1; i <= parts.length; i++) {
      const path = parts.slice(0, i).join("-");
      expandedItems.add(path);
    }

    // 按路径长度排序并返回
    return Array.from(expandedItems).sort(
      (a, b) => a.split("-").length - b.split("-").length
    );
  };

  const renderTreeItems = (children: TreeObject[]) => {
    return children.map((child) => (
      <TreeItem
        key={child.key}
        itemId={child.key}
        label={
          <div
            onMouseOut={() => {
              dispatch(setFocusNodeKey(null));
            }}
            onMouseOver={() => {
              dispatch(setFocusNodeKey(child.key));
            }}
          >
            {child.tagName}
          </div>
        }
        sx={{ textAlign: "left" }}
      >
        {child.children && renderTreeItems(child.children)}
      </TreeItem>
    ));
  };

  const handleSelectChange = (event: SelectChangeEvent) => {
    setMethod(event.target.value as string);
  };

  const handleSearch = () => {
    if (!searchText) return;
    const result = [];
    for (const key in treeMap) {
      if (treeMap[key]["attributes"][method] === searchText) {
        result.push(treeMap[key]);
      }
    }
    console.log("搜索结果是: ", result);
    setSearchResults(result);
    setOpenSearchResultsBox(true);
  };

  const handleUndo = () => {
    console.log("撤销");
    setSearchResults([]);
    setOpenSearchResultsBox(false);
  };

  const handleCropImage = (key: string) => {
    setLoading(true);
    console.log("请求截图", key);
    axios
      .post("/api/v1/calculate/crop-image", {
        imageFilename: imageFilename,
        bounds: {
          left: treeMap[key]["boundsArray"][0],
          top: treeMap[key]["boundsArray"][1],
          right: treeMap[key]["boundsArray"][2],
          bottom: treeMap[key]["boundsArray"][3],
        },
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
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleActionClick = (key: string) => {
    setLoading(true);
    console.log("点击", key);
    axios
      .post("api/v1/android/operation", {
        method: "tap",
        position: {
          x: treeMap[key]["center"][0],
          y: treeMap[key]["center"][1],
        },
      })
      .then((res) => {
        if (res.data.code == 200) {
          enqueueSnackbar("点击成功", {
            variant: "success",
          });
          console.log("点击成功", res);
          dispatch(resetNodeState());
          const x2j = xmlToJSON(res.data.result.pageContent);
          console.log("xml转换后的json", x2j);
          dispatch(setImageFilename(res.data.result.imageFilename));
          dispatch(
            setAdComponent({
              treeObject: x2j.treeObject,
              treeMap: x2j.treeMap,
              imageSource: res.data.result.imageFilename,
            })
          );
        } else {
          enqueueSnackbar("点击失败" + res.data.message, {
            variant: "error",
          });
        }
      })
      .catch((err) => {
        enqueueSnackbar("点击失败", {
          variant: "error",
        });
        console.log("点击失败", err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <>
      <PanelGroup direction="horizontal">
        <Panel defaultSize={50} minSize={30}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <Box
              sx={{ display: "flex", padding: "5px 5px", position: "relative" }}
            >
              <TextField
                size="small"
                label="Selector"
                multiline
                value={selectorText}
                rows={8}
                sx={{ width: "100%" }}
              />
              <Box
                sx={{
                  position: "absolute",
                  right: "10px",
                  bottom: "10px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Button
                  size="small"
                  variant={
                    checkStatus === "loading"
                      ? "contained"
                      : checkStatus === "success"
                        ? "contained"
                        : checkStatus === "error"
                          ? "contained"
                          : "contained"
                  }
                  onClick={async () => {
                    setCheckStatus("loading"); // 设置loading状态
                    setShowResultPopup(false); // 隐藏之前的结果
                    try {
                      // 请求后端执行检查
                      const response = await axios.post(
                        "/api/v1/android/check",
                        {
                          ...selectorParams,
                        }
                      );
                      if (response.data.code === 200) {
                        // 保存检查结果
                        setCheckResult(response.data.result);
                        // 显示结果悬浮框
                        setShowResultPopup(true);
                        // 复制到剪贴板
                        const copySuccess = copy(selectorText);
                        if (copySuccess) {
                          enqueueSnackbar("检查完成，内容已复制到剪贴板", {
                            variant: "success",
                          });
                        } else {
                          enqueueSnackbar("检查完成，但复制到剪贴板失败", {
                            variant: "warning",
                          });
                        }
                        setCheckStatus("success"); // 设置成功状态
                      } else {
                        // 保存错误信息
                        setCheckResult([{
                          screenshot: "",
                          title: "检查失败",
                          description: response.data.message || "检查失败"
                        }]);
                        // 显示结果悬浮框
                        setShowResultPopup(true);
                        enqueueSnackbar("检查失败: " + response.data.message, {
                          variant: "error",
                        });
                        setCheckStatus("error"); // 设置错误状态
                      }
                    } catch (error) {
                      console.error("检查请求失败:", error);
                      // 保存错误信息
                      setCheckResult([{
                        screenshot: "",
                        title: "请求失败",
                        description: error instanceof Error ? error.message : String(error)
                      }]);
                      // 显示结果悬浮框
                      setShowResultPopup(true);
                      enqueueSnackbar("检查请求失败", { variant: "error" });
                      setCheckStatus("error"); // 设置错误状态
                    }
                  }}
                  sx={{
                    borderRadius: "50%",
                    minWidth: "36px",
                    width: "36px",
                    height: "36px",
                    padding: 0,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    bgcolor:
                      checkStatus === "loading"
                        ? "primary.main"
                        : checkStatus === "idle"
                          ? undefined
                          : checkStatus === "success"
                            ? "success.main"
                            : "error.main",
                    color: "white",
                    "&:hover": {
                      bgcolor:
                        checkStatus === "loading"
                          ? "primary.dark"
                          : checkStatus === "idle"
                            ? undefined
                            : checkStatus === "success"
                              ? "success.dark"
                              : "error.dark",
                    },
                  }}
                >
                  {checkStatus === "loading" ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : checkStatus === "idle" ? (
                    <PlayArrowIcon />
                  ) : checkStatus === "success" ? (
                    <CheckIcon />
                  ) : (
                    <ClearIcon />
                  )}
                </Button>

                {/* 检查结果悬浮框 */}
                {showResultPopup && checkResult && (
                  <Box
                    sx={{
                      position: "absolute",
                      right: "10px",
                      top: "100%",
                      marginTop: "8px",
                      bgcolor: "background.paper",
                      boxShadow: "0px 3px 10px rgba(0,0,0,0.2)",
                      borderRadius: "8px",
                      padding: "16px",
                      minWidth: "500px",
                      maxWidth: "30vw",
                      height: "50vh",
                      overflowX: "hidden",
                      overflowY: "auto",
                      zIndex: 1000,
                      border: `1px solid ${
                        checkStatus === "success"
                          ? "success.main"
                          : "error.main"
                      }`,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    {/* 悬浮框头部，包含标题和关闭按钮 */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "16px",
                        borderBottom: "1px solid #e0e0e0",
                        paddingBottom: "8px",
                        width: "100%",
                      }}
                    >
                      <Box
                        sx={{
                          fontSize: "1rem",
                          fontWeight: "bold",
                          color:
                            checkStatus === "success"
                              ? "success.main"
                              : "error.main",
                        }}
                      >
                        检查结果
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setShowResultPopup(false);
                          setCheckStatus("idle");
                        }}
                        sx={{ color: "text.secondary" }}
                      >
                        <ClearIcon />
                      </IconButton>
                    </Box>

                    {/* 检查结果内容 */}
                    <ImageList
                      sx={{
                        width: "100%",
                        height: "auto",
                        maxHeight: "calc(50vh - 100px)",
                        maxWidth: "calc(30vw - 32px)",
                        margin: "0 auto",
                      }}
                    >
                      {checkResult && checkResult.map((item, index) => (
                        <ImageListItem key={index}>
                          <img
                            src={
                              window.location.origin +
                              "/api/v1/system/resource/?image=" +
                              item.screenshot
                            }
                            alt={item.title}
                            loading="lazy"
                          />
                          <ImageListItemBar
                            title={item.title}
                            subtitle={item.description}
                            actionIcon={
                              <IconButton
                                sx={{ color: "rgba(255, 255, 255, 0.54)" }}
                                aria-label={`info about ${item.title}`}
                              >
                                <InfoIcon />
                              </IconButton>
                            }
                          />
                        </ImageListItem>
                      ))}
                    </ImageList>
                  </Box>
                )}
              </Box>
            </Box>
            {/* 节点属性表格 */}
            <Box
              sx={{
                display: "flex",
                borderRadius: "8px",
                maxHeight: "calc(100vh - 290px)",
              }}
            >
              <TableContainer component={Paper}>
                <Table stickyHeader size="small" sx={{ width: "100%" }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ maxWidth: "250px" }}>
                        Attribute
                      </TableCell>
                      <TableCell>Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.attribute}>
                        <TableCell align="left">{row.attribute}</TableCell>
                        <TableCell align="left">
                          <Box
                            sx={{ display: "flex", alignItems: "left", gap: 1 }}
                          >
                            <div>{row.value}</div>
                            {row.attribute == "key" && (
                              <Button
                                size="small"
                                sx={{ marginTop: "-6px" }}
                                onClick={() => handleCropImage(row.value)}
                                loading={loading}
                              >
                                截图
                              </Button>
                            )}
                            {row.attribute == "key" && connected && (
                              <Button
                                size="small"
                                sx={{ marginTop: "-6px" }}
                                onClick={() => handleActionClick(row.value)}
                                loading={loading}
                              >
                                点击
                              </Button>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Box>
        </Panel>
        <PanelResizeHandle
          style={{ width: 3, backgroundColor: "gray", border: "none" }}
        />
        <Panel defaultSize={50} minSize={30}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <Box sx={{ display: "flex", gap: "5px", padding: "5px 5px" }}>
              <FormControl>
                <InputLabel id="attr-select-label">Attr</InputLabel>
                <Select
                  labelId="attr-select-label"
                  id="attr-select"
                  size="small"
                  value={method}
                  label="Attr"
                  onChange={handleSelectChange}
                >
                  <MenuItem value="resource-id">ID</MenuItem>
                  <MenuItem value="text">Text</MenuItem>
                  <MenuItem value="content-desc">Desc</MenuItem>
                  <MenuItem value="class">Class</MenuItem>
                </Select>
              </FormControl>
              <TextField
                size="small"
                label="Search"
                onChange={(e) => setSearchText(e.target.value)}
              />
              <IconButton color="primary" size="small" onClick={handleSearch}>
                <SearchIcon />
              </IconButton>
              <IconButton color="primary" size="small" onClick={handleUndo}>
                <UndoIcon />
              </IconButton>
            </Box>
            {/* 组件树 */}
            {!openSearchResultsBox && (
              <Box>
                <SimpleTreeView
                  onItemFocus={(_, itemId) => {
                    console.log("设置聚焦节点key:", itemId);
                    dispatch(setFocusNodeKey(itemId));
                  }}
                  onItemClick={(_, itemId) => {
                    dispatch(setSelectedNodeKey(itemId));
                  }}
                  selectedItems={selectedNodeKey}
                  onSelectedItemsChange={(_, itemId) => {
                    if (itemId) {
                      const tmpRows: RowItem[] = [
                        { attribute: "key", value: itemId },
                      ];
                      for (const key in treeMap[itemId]["attributes"]) {
                        tmpRows.push({
                          attribute: key,
                          value: treeMap[itemId]["attributes"][key],
                        });
                      }
                      setRow(tmpRows);
                    } else {
                      setSelectorText("");
                      setRow([]);
                    }
                    setExpandedItems(generateExpandedItems(itemId));
                  }}
                  expandedItems={expandedItems}
                  sx={{
                    maxHeight: "calc(100vh - 230px)",
                    padding: "5px 5px",
                    overflow: "auto",
                  }}
                >
                  {treeObject && (
                    <TreeItem
                      itemId={treeObject.key}
                      label={
                        <div
                          onMouseOut={() => {
                            dispatch(setFocusNodeKey(null));
                          }}
                          onMouseOver={() => {
                            dispatch(setFocusNodeKey(treeObject.key));
                          }}
                        >
                          {treeObject.tagName}
                        </div>
                      }
                      sx={{ textAlign: "left" }}
                    >
                      {renderTreeItems(treeObject.children)}
                    </TreeItem>
                  )}
                </SimpleTreeView>
              </Box>
            )}
            {/* 搜索结果列表 */}
            {openSearchResultsBox && (
              <Box>
                <Zoom
                  in={openSearchResultsBox}
                  style={{
                    transitionDelay: openSearchResultsBox ? "500ms" : "0ms",
                  }}
                >
                  <List
                    sx={{
                      maxHeight: "calc(100vh - 230px)",
                      padding: "5px 5px",
                      overflow: "auto",
                    }}
                  >
                    {searchResults.map((item) => (
                      <ListItem key={item.key}>
                        <ListItemButton>
                          <ListItemIcon>
                            <DoneIcon />
                          </ListItemIcon>
                          <div
                            onMouseUp={() => {
                              console.log("点击搜索结果:", item.key);
                              dispatch(setSelectedNodeKey(item.key));
                            }}
                            onMouseOut={() => {
                              dispatch(setFocusNodeKey(null));
                            }}
                            onMouseEnter={() => {
                              dispatch(setFocusNodeKey(item.key));
                            }}
                            onMouseOver={() => {
                              dispatch(setFocusNodeKey(item.key));
                            }}
                          >
                            <ListItemText primary={item.tagName} />
                          </div>
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Zoom>
              </Box>
            )}
          </Box>
        </Panel>
      </PanelGroup>
    </>
  );
}

export default ComponentTreePanel;
