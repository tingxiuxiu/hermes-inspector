import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { Box } from "@mui/material";
import { SnackbarProvider } from "notistack";
import { store } from "./store/store.ts";
import App from "./App.tsx";

import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      {/** 灰色背景 */}
      <SnackbarProvider
        maxSnack={5}
        style={{ maxWidth: 500 }}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Box sx={{ backgroundColor: "#f0f0f0", height: "100vh" }}>
          <App />
        </Box>
      </SnackbarProvider>
    </Provider>
  </StrictMode>
);
