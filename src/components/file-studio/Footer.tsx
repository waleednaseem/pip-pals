import { Link } from "react-router-dom";

const cols = [
  {
    title: "Product",
    links: [
      { href: "/studio/pdf", label: "PDF Tools" },
      { href: "/studio/image", label: "Image Tools" },
      { href: "/studio/text", label: "Text Tools" },
      { href: "/studio/zip", label: "ZIP Tools" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { href: "/studio/other", label: "Other Tools" },
      { href: "/studio/convert", label: "Converters" },
      { href: "/studio/other/qr", label: "QR Code" },
      { href: "/studio/pdf/sign", label: "Sign PDF" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/studio", label: "Home" },
      { href: "/studio/pdf", label: "Free Tools" },
      { href: "/studio/convert", label: "Unit Converters" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--gray-border)] bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-heading text-xl font-extrabold">
            <span className="text-[var(--brand)]">File</span> Studio
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-[var(--gray-muted)]">
            Every tool you need, at your fingertips. Files stay in your browser —
            PDF, image, text, ZIP, and converters.
          </p>
        </div>
        {cols.map((col) => (
          <div key={col.title}>
            <p className="font-heading mb-4 text-sm font-bold text-[var(--foreground)]">
              {col.title}
            </p>
            <ul className="space-y-2.5 text-sm text-[var(--gray-muted)]">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link
                    to={l.href}
                    className="transition hover:text-[var(--brand)]"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--gray-border)] px-4 py-4 text-center text-xs text-[var(--gray-muted)]">
        © 2026 Pip Pals File Studio. All rights reserved.
      </div>
    </footer>
  );
}
