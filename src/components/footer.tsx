
export default function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10 bg-black/30 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <span>Made with by Tanaka Strong Hold</span>
        <span className="ml-auto text-sm text-white/80">
          © {new Date().getFullYear()} Kumi Talk
        </span>
        <div className="flex items-center gap-4">
        </div>
      </div>
    </footer>
  );
}
