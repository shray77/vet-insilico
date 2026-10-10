import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Условия использования и дисклеймер",
  description:
    "VetInSilico Hub — информационный сервис «как есть»: in-silico расчёты для исследований, не ветеринарная консультация и не лабораторный протокол.",
};

const SECTIONS: { id: string; title: string; body: React.ReactNode }[] = [
  {
    id: "advice",
    title: "Не ветеринарная консультация и не лабораторный протокол",
    body: (
      <p>
        Результаты инструментов <b>не являются</b> диагнозом, назначением, схемой лечения,
        протоколом лабораторного исследования или рекомендацией к применению препаратов.
        Инструменты предоставлены для предварительных исследовательских оценок; решения о
        здоровье животных принимает только ветеринарный врач.{" "}
        <b>Консультируйтесь с ветеринарным врачом, даже если вы сами ветеринарный врач.</b>
      </p>
    ),
  },
  {
    id: "ai",
    title: "Расчёты, модели и ИИ",
    body: (
      <p>
        Часть инструментов использует эвристики, статистические модели, сторонние FOSS-модели
        (HuggingFace) и браузерные ML-библиотеки (RDKit.js WASM). Модели ошибаются: возможны
        ложноположительные и ложноотрицательные результаты, смещения на непредставленных данных,
        неверные интерпретации структуры или последовательности. Результаты{" "}
        <b>не проверены экспериментально</b> и не проходят валидацию in vitro / in vivo.
      </p>
    ),
  },
  {
    id: "not-official",
    title: "Не для официальных решений",
    body: (
      <p>
        Инструменты — не реестры и не официальные источники. Их результаты <b>не могут</b> служить
        основанием для административных, регуляторных, клинических или хозяйственных решений, а
        также для официальной отчётности.
      </p>
    ),
  },
  {
    id: "as-is",
    title: "«Как есть» и ограничение ответственности",
    body: (
      <p>
        Сервис предоставляется <b>«как есть»</b> («as is») и «как доступно», без явных или
        подразумеваемых гарантий, включая пригодность для конкретной цели. Автор не несёт
        ответственности за любые убытки или вред, возникшие в результате использования или
        неиспользования результатов инструментов — в максимальной степени, допускаемой применимым
        правом.
      </p>
    ),
  },
  {
    id: "privacy",
    title: "Приватность",
    body: (
      <p>
        Сайт статичен и работает в браузере: расчёты выполняются локально; персональные данные не
        собираются, регистрация отсутствует. Обращения к внешним сервисам (например, HuggingFace
        Inference API для ML-инструментов) передают туда только переданные вами входные данные —
        не отправляйте туда конфиденциальную информацию.
      </p>
    ),
  },
  {
    id: "third",
    title: "Третьи стороны",
    body: (
      <p>
        Ссылки на внешние ресурсы даны как есть; автор не отвечает за их содержание. Все товарные
        знаки принадлежат правообладателям; упоминания информационны и не означают связи или
        одобрения.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <div className="mx-auto max-w-3xl px-5 pb-16">
        <a
          href="/vet-insilico/"
          className="mt-6 inline-block text-xs text-zinc-500 transition-colors hover:text-zinc-300"
        >
          ← VetInSilico Hub
        </a>
        <header className="mt-4 border-b border-white/10 pb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            Условия использования и дисклеймер
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            VetInSilico Hub — open-source in-silico инструменты для ветеринарных исследований
          </p>
        </header>

        <div className="mt-6 rounded-xl border border-teal-500/30 bg-teal-500/10 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-teal-400">
            Коротко
          </h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-zinc-300">
            <li>
              Сервис информационный, предоставляется <b>«как есть»</b>, без гарантий.
            </li>
            <li>
              Результаты in-silico расчётов — <b>не диагноз и не назначение</b>: принимайте решения
              только с ветеринарным врачом — даже если вы сами ветеринарный врач.
            </li>
            <li>
              Расчёты и модели (в т.ч. ML/ИИ) <b>могут ошибаться</b>, результаты не проверены
              экспериментально.
            </li>
          </ul>
        </div>

        <section id="about" className="mt-4 rounded-xl border border-white/10 bg-zinc-900/60 p-5">
          <h2 className="text-base font-semibold text-zinc-100">О сервисе</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            VetInSilico Hub — набор браузерных исследовательских инструментов для ветеринарной
            патологии (drug repurposing, ADMET, эпитопы, праймеры, филогения, калькуляторы и др.).
            Сервис разработан и поддерживается автором самостоятельно, предоставляется бесплатно и
            носит информационно-исследовательский характер. Отдельные проекты экосистемы могут
            иметь собственные страницы условий —{" "}
            <a
              className="text-teal-300 underline-offset-2 hover:underline"
              href="https://shray77.github.io/terms.html"
            >
              общие условия экосистемы VetInSilico
            </a>
            .
          </p>
        </section>

        {SECTIONS.map((s) => (
          <section
            key={s.id}
            id={s.id}
            className="mt-3 rounded-xl border border-white/10 bg-zinc-900/60 p-5"
          >
            <h2 className="text-base font-semibold text-zinc-100">{s.title}</h2>
            <div className="mt-2 text-sm leading-relaxed text-zinc-400 [&_b]:font-semibold [&_b]:text-zinc-200">
              {s.body}
            </div>
          </section>
        ))}

        <section id="changes" className="mt-3 rounded-xl border border-white/10 bg-zinc-900/60 p-5">
          <h2 className="text-base font-semibold text-zinc-100">Изменение условий и связь</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Условия могут быть изменены в любой момент; актуальная версия — на этой странице.
            Замечания — через GitHub Issues:{" "}
            <a
              className="text-teal-300 underline-offset-2 hover:underline"
              href="https://github.com/shray77/vet-insilico/issues"
            >
              github.com/shray77/vet-insilico
            </a>
            .
          </p>
        </section>

        <p className="mt-5 font-mono text-xs text-zinc-600">
          Версия от 10.10.2026 · VetInSilico
        </p>
      </div>
    </div>
  );
}
