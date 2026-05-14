import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  Car,
  FileText,
  ClipboardCheck,
  MessageCircle,
  ArrowRight,
} from "lucide-react";

// Support WhatsApp number — same line used by the desktop app's Hakkında menu.
const WHATSAPP_NUMBER = "905521870334";
const WHATSAPP_DISPLAY = "+90 552 187 03 34";
const DEMO_MESSAGE =
  "Merhaba, MTSK Yönetim Sistemi için demo talep etmek istiyorum.";
const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  DEMO_MESSAGE,
)}`;

const features = [
  {
    icon: Users,
    title: "Öğrenci Senkronizasyonu",
    description:
      "MEBBIS öğrenci kayıtları otomatik çekilir; dönem, grup ve durum bilgileri tek ekranda.",
  },
  {
    icon: Car,
    title: "Araç & Plaka Takibi",
    description:
      "Kuruma kayıtlı araçlar, plakalar ve güzergahlar senkronize edilir, belgelerde otomatik gelir.",
  },
  {
    icon: FileText,
    title: "K Belgesi Oluşturma",
    description:
      "Aday bilgileri bir kez girilir, sonraki K Belgelerinde otomatik doldurulur.",
  },
  {
    icon: ClipboardCheck,
    title: "Direksiyon Takip PDF",
    description:
      "Ders saatlerine göre direksiyon takip ve simülatör raporları tek tıkla üretilir.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Top bar ───────────────────────────────────────────── */}
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary font-bold text-primary-foreground">
              M
            </span>
            <span className="text-lg font-semibold tracking-tight">
              MTSK Yönetim Sistemi
            </span>
          </div>
          <Button asChild>
            <Link to="/login">Giriş Yap</Link>
          </Button>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-28">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Sürücü kursunuzu ve MEBBIS işlemlerinizi tek yerden yönetin
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Öğrenci ve araç senkronizasyonu, K Belgesi, direksiyon takip ve
          simülatör raporları — MEBBIS ile entegre, hızlı ve hatasız.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="bg-[#25D366] hover:bg-[#1ebe57]">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-1" />
              Demo için iletişime geçin
            </a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/login">
              Giriş Yap
              <ArrowRight className="ml-1" />
            </Link>
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          WhatsApp: {WHATSAPP_DISPLAY}
        </p>
      </section>

      {/* ── Features ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Card key={feature.title} className="shadow-sm">
              <CardContent className="pt-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <feature.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── CTA strip ─────────────────────────────────────────── */}
      <section className="border-t bg-muted/40">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-14 text-center sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight">
            Sisteminizi demo ile inceleyin
          </h2>
          <p className="max-w-xl text-muted-foreground">
            Kurumunuza özel kurulum ve demo için WhatsApp üzerinden bize ulaşın.
          </p>
          <Button asChild size="lg" className="bg-[#25D366] hover:bg-[#1ebe57]">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-1" />
              Demo için iletişime geçin
            </a>
          </Button>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} MTSK Yönetim Sistemi
        </div>
      </footer>
    </div>
  );
}
