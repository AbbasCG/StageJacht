import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-foot">
      <div className="in">
        <span>© {new Date().getFullYear()} Stagejacht</span>
        <span style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Link href="/privacy">Privacyverklaring</Link>
          <Link href="/voorwaarden">Algemene voorwaarden</Link>
          <a href="mailto:[jouw-contactadres]">Contact</a>
        </span>
      </div>
    </footer>
  );
}
