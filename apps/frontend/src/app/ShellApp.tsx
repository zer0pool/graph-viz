import React from "react";
import { BrowserRouter } from "react-router-dom";
import { AppLayout } from "../layout/AppLayout";

export const ShellApp = () => (
  <BrowserRouter>
    <AppLayout>
      <div>Select menu</div>
    </AppLayout>
  </BrowserRouter>
);