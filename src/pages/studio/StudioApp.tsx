import { Navigate, Route, Routes } from "react-router-dom";
import { StudioFrame } from "./StudioFrame";
import {
  ConvertIndexPage,
  ConvertToolPage,
  FamilyIndexPage,
  FamilyToolPage,
  MissingTool,
  PdfIndexPage,
  PdfToolPage,
  StudioHomePage,
} from "./StudioPages";

export default function StudioApp() {
  return (
    <StudioFrame>
      <Routes>
        <Route index element={<StudioHomePage />} />
        <Route path="pdf" element={<PdfIndexPage />} />
        <Route path="pdf/:slug" element={<PdfToolPage />} />
        <Route path="image" element={<FamilyIndexPage family="image" />} />
        <Route path="image/:slug" element={<FamilyToolPage family="image" />} />
        <Route path="text" element={<FamilyIndexPage family="text" />} />
        <Route path="text/:slug" element={<FamilyToolPage family="text" />} />
        <Route path="zip" element={<FamilyIndexPage family="zip" />} />
        <Route path="zip/:slug" element={<FamilyToolPage family="zip" />} />
        <Route path="other" element={<FamilyIndexPage family="other" />} />
        <Route path="other/:slug" element={<FamilyToolPage family="other" />} />
        <Route path="convert" element={<ConvertIndexPage />} />
        <Route path="convert/:slug" element={<ConvertToolPage />} />
        <Route path="login" element={<Navigate to="/login" replace />} />
        <Route path="signup" element={<Navigate to="/signup" replace />} />
        <Route path="*" element={<MissingTool />} />
      </Routes>
    </StudioFrame>
  );
}
