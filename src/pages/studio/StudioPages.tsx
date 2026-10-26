import AuthForm from "@/components/auth/AuthForm";
import HomeExperience from "@/components/home/HomeExperience";
import ImageToolClient from "@/components/image/ImageToolClient";
import OtherToolClient from "@/components/other/OtherToolClient";
import PdfToolClient from "@/components/pdf/PdfToolClient";
import PdfToolsBrowser from "@/components/pdf/PdfToolsBrowser";
import TextToolClient from "@/components/text/TextToolClient";
import ZipToolClient from "@/components/zip/ZipToolClient";
import Breadcrumbs from "@/components/tools/Breadcrumbs";
import ConverterForm from "@/components/tools/ConverterForm";
import PdfToolShell from "@/components/tools/PdfToolShell";
import ToolCard from "@/components/tools/ToolCard";
import ToolShell from "@/components/tools/ToolShell";
import ToolsIndex from "@/components/tools/ToolsIndex";
import { converters, getConverter, getRelatedConverters } from "@/lib/converters";
import { getImageTool, imageTools } from "@/lib/image/registry";
import { getOtherTool, otherTools } from "@/lib/other/registry";
import { getPdfTool, pdfTools } from "@/lib/pdf/registry";
import { getTextTool, textTools } from "@/lib/text/registry";
import type { ToolFamily } from "@/lib/tools/types";
import { getZipTool, zipTools } from "@/lib/zip/registry";
import { Link, useParams } from "react-router-dom";

const familyMeta: Record<
  Exclude<ToolFamily, "pdf" | "convert">,
  {
    title: string;
    description: string;
    icon: string;
    tools: { slug: string; title: string; description: string }[];
    get: (slug: string) => { slug: string; title: string; description: string } | undefined;
  }
> = {
  image: {
    title: "Image tools",
    description: "Compress, resize, crop, rotate, and convert JPG, PNG, WEBP, and BMP.",
    icon: "IMG",
    tools: imageTools,
    get: getImageTool,
  },
  text: {
    title: "Text tools",
    description: "Case transform, Base64, and placeholder text — all in your browser.",
    icon: "TXT",
    tools: textTools,
    get: getTextTool,
  },
  zip: {
    title: "ZIP tools",
    description: "Compress files into ZIP or extract archives locally.",
    icon: "ZIP",
    tools: zipTools,
    get: getZipTool,
  },
  other: {
    title: "Other tools",
    description: "QR codes, password generator, color extractor, and barcodes.",
    icon: "APP",
    tools: otherTools,
    get: getOtherTool,
  },
};

export function StudioHomePage() {
  return <HomeExperience />;
}

export function PdfIndexPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <div className="mb-8 max-w-2xl">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
          Every PDF tool you need
        </h1>
        <p className="mt-2 text-[var(--gray-muted)]">
          All tools run in your browser — upload a file and download the result.
        </p>
      </div>
      <PdfToolsBrowser />
    </main>
  );
}

export function PdfToolPage() {
  const { slug = "" } = useParams();
  const tool = getPdfTool(slug);
  if (!tool) return <MissingTool />;
  const others = pdfTools.filter((t) => t.slug !== slug).slice(0, 4);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-10">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/studio" },
          { label: "PDF Tools", href: "/studio/pdf" },
          { label: tool.title },
        ]}
      />
      <PdfToolShell tool={tool}>
        <PdfToolClient tool={tool} />
      </PdfToolShell>
      <section className="mt-10">
        <h2 className="font-heading mb-4 text-lg font-bold">Other PDF tools</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {others.map((t) => (
            <ToolCard
              key={t.slug}
              href={`/studio/pdf/${t.slug}`}
              title={t.title}
              description={t.description}
              badge={t.mode === "stub" ? "Soon" : undefined}
              family="pdf"
              icon="PDF"
            />
          ))}
        </div>
      </section>
    </main>
  );
}

export function FamilyIndexPage({
  family,
}: {
  family: Exclude<ToolFamily, "pdf" | "convert">;
}) {
  const meta = familyMeta[family];
  return (
    <ToolsIndex
      title={meta.title}
      description={meta.description}
      family={family}
      tools={meta.tools.map((t) => ({
        ...t,
        href: `/studio/${family}/${t.slug}`,
      }))}
    />
  );
}

export function FamilyToolPage({
  family,
}: {
  family: Exclude<ToolFamily, "pdf" | "convert">;
}) {
  const { slug = "" } = useParams();
  const meta = familyMeta[family];
  const tool = meta.get(slug);
  if (!tool) return <MissingTool />;
  const others = meta.tools.filter((t) => t.slug !== slug);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-10">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/studio" },
          { label: meta.title, href: `/studio/${family}` },
          { label: tool.title },
        ]}
      />
      <ToolShell title={tool.title} description={tool.description}>
        {family === "image" && <ImageToolClient tool={tool} />}
        {family === "text" && <TextToolClient tool={tool} />}
        {family === "zip" && <ZipToolClient tool={tool} />}
        {family === "other" && <OtherToolClient tool={tool} />}
      </ToolShell>
      {others.length > 0 && (
        <section className="mt-10">
          <h2 className="font-heading mb-4 text-lg font-bold">More {meta.title.toLowerCase()}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {others.map((t) => (
              <ToolCard
                key={t.slug}
                href={`/studio/${family}/${t.slug}`}
                title={t.title}
                description={t.description}
                family={family}
                icon={meta.icon}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

const convertCategories = [
  { id: "length", label: "Length / distance" },
  { id: "area", label: "House / area" },
  { id: "fabric", label: "Clothes / fabric" },
  { id: "currency", label: "Currency" },
  { id: "weight", label: "Weight" },
  { id: "temperature", label: "Temperature" },
] as const;

export function ConvertIndexPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <h1 className="font-heading mb-2 text-3xl font-extrabold tracking-tight">Unit converters</h1>
      <p className="mb-8 text-[var(--gray-muted)]">
        Instant conversions in your browser. No signup required.
      </p>
      <div className="space-y-10">
        {convertCategories.map((cat) => {
          const items = converters.filter((c) => c.category === cat.id);
          if (!items.length) return null;
          return (
            <section key={cat.id}>
              <h2 className="mb-4 text-xl font-bold">{cat.label}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((c) => (
                  <ToolCard
                    key={c.slug}
                    href={`/studio/convert/${c.slug}`}
                    title={c.title}
                    description={c.description}
                    family="convert"
                    icon={c.fromUnit.slice(0, 3).toUpperCase()}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

export function ConvertToolPage() {
  const { slug = "" } = useParams();
  const converter = getConverter(slug);
  if (!converter) return <MissingTool />;
  const related = getRelatedConverters(slug);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-10">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/studio" },
          { label: "Converters", href: "/studio/convert" },
          { label: converter.title },
        ]}
      />
      <ConverterForm slug={converter.slug} />
      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="font-heading mb-4 text-lg font-bold">Related converters</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {related.map((c) => (
              <ToolCard
                key={c.slug}
                href={`/studio/convert/${c.slug}`}
                title={c.title}
                description={c.description}
                family="convert"
                icon={c.fromUnit.slice(0, 3).toUpperCase()}
              />
            ))}
          </div>
        </section>
      )}
      <p className="mt-8 text-sm text-[var(--gray-muted)]">
        Working with documents?{" "}
        <Link to="/studio/pdf" className="font-semibold text-[var(--brand)] hover:underline">
          Browse PDF tools
        </Link>
        .
      </p>
    </main>
  );
}

export function LoginPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <AuthForm mode="login" />
    </main>
  );
}

export function SignupPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <AuthForm mode="signup" />
    </main>
  );
}

export function MissingTool() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16 text-center">
      <h1 className="font-heading text-2xl font-extrabold">This tool is not available</h1>
      <p className="mt-2 text-sm text-[var(--gray-muted)]">
        Pick another tool from the studio catalog.
      </p>
      <Link to="/studio" className="mt-5 inline-block text-sm font-bold text-[var(--brand)] hover:underline">
        Back to File Studio
      </Link>
    </main>
  );
}
