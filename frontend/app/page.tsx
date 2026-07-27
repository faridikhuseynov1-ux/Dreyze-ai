import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Brain, Lock, Search, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Dreyze AI - Дрейзи АИ нейросеть и умный AI чат",
  description:
    "Dreyze AI, также Дрейзи АИ и DreyzeAI, - приватный AI-чат с памятью, голосом, файлами, поиском и моделями GPT, Claude, Gemini, DeepSeek, Grok и Qwen.",
  alternates: {
    canonical: "https://dreyzfarid.online",
  },
  keywords: [
    "Dreyze AI",
    "DreyzeAI",
    "Dreyze AI chat",
    "Dreyze ai",
    "дрейзи аи",
    "дрейзи ai",
    "дрейз аи",
    "Dreyze",
    "dreyzfarid",
    "нейросеть Dreyze AI",
    "ИИ чат Dreyze AI",
  ],
  openGraph: {
    title: "Dreyze AI - Дрейзи АИ",
    description:
      "Приватный AI-чат с памятью, голосом, файлами, поиском и несколькими современными моделями.",
    url: "https://dreyzfarid.online",
    siteName: "Dreyze AI",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "Dreyze AI logo",
      },
    ],
  },
};

const features = [
  {
    icon: Brain,
    title: "Память",
    text: "Dreyze AI запоминает важный контекст и помогает продолжать разговор без лишних повторов.",
  },
  {
    icon: Sparkles,
    title: "Модели",
    text: "В одном чате доступны GPT, Claude, Gemini, DeepSeek, Grok, Qwen и другие модели.",
  },
  {
    icon: Search,
    title: "Поиск",
    text: "Режим исследования помогает находить актуальную информацию и работать с вопросами глубже.",
  },
  {
    icon: Lock,
    title: "Приватность",
    text: "Аккаунт, история диалогов и настройки собраны в личном рабочем пространстве.",
  },
];

export default function RootPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Dreyze AI",
    alternateName: ["DreyzeAI", "Дрейзи АИ", "Дрейз АИ"],
    applicationCategory: "AIApplication",
    operatingSystem: "Web",
    url: "https://dreyzfarid.online",
    description:
      "Dreyze AI - приватный AI-чат с памятью, голосом, файлами, поиском и несколькими современными моделями.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <main className="h-screen overflow-y-auto bg-bg text-text">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="min-h-screen px-5 py-6 sm:px-8 lg:px-12">
        <nav className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-3" aria-label="Dreyze AI">
            <Image
              src="/logo.png"
              alt="Dreyze AI"
              width={44}
              height={44}
              className="h-11 w-11 object-contain"
              priority
            />
            <span className="text-base font-semibold">Dreyze AI</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-card hover:text-text"
            >
              Войти
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg transition hover:opacity-90"
            >
              Создать аккаунт
            </Link>
          </div>
        </nav>

        <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-12 py-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="mb-5 text-sm font-medium uppercase tracking-[0.18em] text-text-secondary">
              DreyzeAI / Дрейзи АИ
            </p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-7xl">
              Dreyze AI - умный ИИ-чат для работы, кода и идей
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-text-secondary">
              Dreyze AI, Дрейзи АИ или DreyzeAI - приватный ассистент с памятью,
              голосовым режимом, файлами, поиском и выбором сильных AI-моделей в одном интерфейсе.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-bg transition hover:opacity-90"
              >
                Начать пользоваться
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold text-text transition hover:bg-card-hover"
              >
                Открыть вход
              </Link>
            </div>
          </div>

          <div className="relative mx-auto aspect-square w-full max-w-md">
            <div className="absolute inset-0 rounded-[2rem] border border-border bg-card" />
            <div className="absolute inset-6 rounded-[1.5rem] border border-border bg-bg p-8">
              <Image
                src="/logo.png"
                alt="Логотип Dreyze AI"
                width={120}
                height={120}
                className="h-24 w-24 object-contain"
                priority
              />
              <div className="mt-8 space-y-4">
                <div>
                  <p className="text-sm text-text-secondary">Запрос</p>
                  <p className="mt-1 text-xl font-semibold">Помоги разобраться и написать лучше</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-sm leading-6 text-text-secondary">
                    Dreyze AI отвечает по делу, помнит контекст и подбирает модель под задачу.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border px-5 py-14 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-semibold">Что умеет Dreyze AI</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <article key={feature.title} className="rounded-lg border border-border bg-card p-5">
                <feature.icon className="h-6 w-6 text-text" aria-hidden="true" />
                <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{feature.text}</p>
              </article>
            ))}
          </div>
          <p className="mt-10 max-w-3xl text-sm leading-7 text-text-secondary">
            Если вы ищете “dreyzeai”, “Dreyze AI”, “дрейзи аи” или “дрейз аи”, это официальный сайт
            Dreyze AI на домене dreyzfarid.online.
          </p>
        </div>
      </section>
    </main>
  );
}
