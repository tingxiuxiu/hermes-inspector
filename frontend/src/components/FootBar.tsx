import { Box } from "@mui/material";
import { useAppSelector } from "../hooks";

export default function AppFootBar() {
  const { width, height } = useAppSelector((state) => state.screenCache);
  const { mousePosition } = useAppSelector((state) => state.mouseAction);
  return (
    <Box
      id="app-footbar-box"
      sx={{
        display: "flex",
        gap: "20px",
        width: "100%",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", gap: "20px" }}>
        <span>
          分辨率: {width} * {height}
        </span>
        <span>
          像素位置: [{mousePosition.x}, {mousePosition.y}]
        </span>
      </div>
      <span style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>
        Xin.Zhang
      </span>
    </Box>
  );
}
