import { queryClient } from "@/api/queryClient";
import { Shell } from "@/components/layout/Shell";
import { AppRouter } from "@/routes/AppRouter";
import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { BrowserRouter } from "react-router-dom";

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Shell>
          <AppRouter />
        </Shell>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
