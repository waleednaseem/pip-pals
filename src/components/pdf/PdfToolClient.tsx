import AddTextTool from "@/components/pdf/AddTextTool";
import AiTextTool from "@/components/pdf/AiTextTool";
import CompareTool from "@/components/pdf/CompareTool";
import CompressTool from "@/components/pdf/CompressTool";
import CreateFormTool from "@/components/pdf/CreateFormTool";
import CropTool from "@/components/pdf/CropTool";
import EditPdfTool from "@/components/pdf/EditPdfTool";
import EsignRequestTool from "@/components/pdf/EsignRequestTool";
import ExtractImagesTool from "@/components/pdf/ExtractImagesTool";
import ExtractTextTool from "@/components/pdf/ExtractTextTool";
import FillFormTool from "@/components/pdf/FillFormTool";
import JpgToPdfTool from "@/components/pdf/JpgToPdfTool";
import JpgTool from "@/components/pdf/JpgTool";
import MergePdfImagesTool from "@/components/pdf/MergePdfImagesTool";
import MergeTool from "@/components/pdf/MergeTool";
import OcrTool from "@/components/pdf/OcrTool";
import OfficeConvertTool from "@/components/pdf/OfficeConvertTool";
import OrganizeTool from "@/components/pdf/OrganizeTool";
import PageNumbersTool from "@/components/pdf/PageNumbersTool";
import ProtectTool from "@/components/pdf/ProtectTool";
import RedactTool from "@/components/pdf/RedactTool";
import RepairTool from "@/components/pdf/RepairTool";
import RotateTool from "@/components/pdf/RotateTool";
import ScanToPdfTool from "@/components/pdf/ScanToPdfTool";
import SignTool from "@/components/pdf/SignTool";
import SplitTool from "@/components/pdf/SplitTool";
import StubTool from "@/components/pdf/StubTool";
import UnlockTool from "@/components/pdf/UnlockTool";
import WatermarkTool from "@/components/pdf/WatermarkTool";
import type { PdfToolDef } from "@/lib/pdf/registry";

export default function PdfToolClient({ tool }: { tool: PdfToolDef }) {
  switch (tool.slug) {
    case "merge":
      return <MergeTool />;
    case "merge-pdf-images":
      return <MergePdfImagesTool />;
    case "split":
      return <SplitTool />;
    case "compress":
      return <CompressTool />;
    case "repair":
      return <RepairTool />;
    case "compare":
      return <CompareTool />;
    case "extract-text":
      return <ExtractTextTool />;
    case "sign":
      return <SignTool />;
    case "esign-request":
      return <EsignRequestTool />;
    case "fill-form":
      return <FillFormTool />;
    case "create-form":
      return <CreateFormTool />;
    case "add-text":
      return <AddTextTool />;
    case "edit":
      return <EditPdfTool />;
    case "organize":
      return <OrganizeTool />;
    case "rotate":
      return <RotateTool />;
    case "protect":
      return <ProtectTool />;
    case "unlock":
      return <UnlockTool />;
    case "pdf-to-jpg":
      return <JpgTool />;
    case "extract-images":
      return <ExtractImagesTool />;
    case "jpg-to-pdf":
      return <JpgToPdfTool />;
    case "watermark":
      return <WatermarkTool />;
    case "page-numbers":
      return <PageNumbersTool />;
    case "crop":
      return <CropTool />;
    case "redact":
      return <RedactTool />;
    case "ocr":
      return <OcrTool />;
    case "summarizer":
      return <AiTextTool mode="summarizer" />;
    case "translate":
      return <AiTextTool mode="translate" />;
    case "scan-to-pdf":
      return <ScanToPdfTool />;
    case "pdf-to-word":
    case "pdf-to-powerpoint":
    case "pdf-to-excel":
    case "word-to-pdf":
    case "powerpoint-to-pdf":
    case "excel-to-pdf":
    case "html-to-pdf":
    case "pdf-to-pdfa":
    case "pdf-to-markdown":
      return <OfficeConvertTool slug={tool.slug} />;
    default:
      return <StubTool slug={tool.slug} title={tool.title} />;
  }
}
