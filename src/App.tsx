import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { FavoritesProvider } from "@/context";
import { AuthProvider } from "@/context/AuthContext";
import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AccountPage } from "./pages/AccountPage";

const StudioApp = lazy(() => import("./pages/studio/StudioApp"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="pip-pals-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <FavoritesProvider>
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route path="/login" element={<AccountPage mode="login" />} />
                <Route path="/signup" element={<AccountPage mode="signup" />} />
                <Route path="/" element={<Index />} />
                <Route
                  path="/studio/*"
                  element={
                    <Suspense
                      fallback={
                        <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
                          Loading File Studio…
                        </div>
                      }
                    >
                      <StudioApp />
                    </Suspense>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </FavoritesProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
