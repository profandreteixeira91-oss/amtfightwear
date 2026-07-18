import { MessageCircle } from "lucide-react";

const PHONE = "5582920016732";
const DEFAULT_MSG =
  "Olá! Vim pela loja da AMT Fight Wear e gostaria de tirar uma dúvida.";

export function WhatsAppFloat() {
  const href = `https://wa.me/${PHONE}?text=${encodeURIComponent(DEFAULT_MSG)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar com o vendedor no WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-white shadow-lg shadow-emerald-500/30 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-400 sm:bottom-6 sm:right-6"
    >
      <span className="relative flex h-6 w-6 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-white/40" />
        <MessageCircle className="relative h-6 w-6" strokeWidth={2.4} />
      </span>
      <span className="hidden text-sm font-semibold sm:inline">Fale conosco</span>
    </a>
  );
}
