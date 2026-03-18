/**
 * @file components/HelpModal.tsx
 * @description Модальное окно с инструкцией по использованию HipDx AI.
 * Открывается по кнопке ? в правом верхнем углу.
 */
import React, { useState } from "react";
import { X, Stethoscope, GraduationCap, Upload, Sparkles, Save, Images } from "lucide-react";

interface Step {
  icon:  React.ReactNode;
  title: string;
  text:  string;
}

const DOCTOR_STEPS: Step[] = [
  {
    icon:  <Upload className="w-4 h-4" />,
    title: "Загрузите снимок",
    text:  "Нажмите «Загрузить рентгеновский снимок» и выберите файл. Поддерживаются форматы DICOM (.dcm), PNG и JPG.",
  },
  {
    icon:  <span className="text-xs font-bold">2</span>,
    title: "Заполните данные пациента",
    text:  "Введите ФИО, дату рождения, ID пациента и лечащего врача. Возраст в месяцах рассчитается автоматически из даты рождения.",
  },
  {
    icon:  <span className="text-xs font-bold">3</span>,
    title: "Настройте изображение (опционально)",
    text:  "Отрегулируйте яркость и контрастность снимка для лучшей видимости анатомических структур.",
  },
  {
    icon:  <Sparkles className="w-4 h-4" />,
    title: "Запустите анализ ИИ",
    text:  "Нажмите «Определить точки и сохранить». Нейросеть автоматически расставит 6 анатомических точек, рассчитает ацетабулярный угол, дистанции h и d, определит степень дисплазии и сохранит результат в базе данных.",
  },
  {
    icon:  <Images className="w-4 h-4" />,
    title: "Просмотрите результаты",
    text:  "Линии разметки отобразятся прямо на снимке. В боковой панели — числовые результаты и диагноз. Кнопка «Скрыть разметку» позволяет сравнить снимок с разметкой и без.",
  },
];

const STUDENT_STEPS: Step[] = [
  {
    icon:  <GraduationCap className="w-4 h-4" />,
    title: "Переключитесь в режим студента",
    text:  "Нажмите «Студент» в переключателе режимов — откроется анализатор точек.",
  },
  {
    icon:  <Upload className="w-4 h-4" />,
    title: "Загрузите снимок",
    text:  "В анализаторе нажмите «Загрузить снимок» и выберите рентгенограмму.",
  },
  {
    icon:  <span className="text-xs font-bold">3</span>,
    title: "Расставьте 6 точек вручную",
    text:  "Кликайте на снимок в следующем порядке: точки 1–2 на линии Хильгенрейнера (слева → справа), точки 3–4 на крышке впадины, точки 5–6 на шейке бедра. После 6-й точки автоматически строятся линии и рассчитываются параметры.",
  },
  {
    icon:  <Save className="w-4 h-4" />,
    title: "Сохраните работу",
    text:  "Введите своё имя и заметки, затем нажмите «Сохранить работу». Снимок с разметкой и оригинал сохранятся в галерее студентов.",
  },
  {
    icon:  <Images className="w-4 h-4" />,
    title: "Просмотрите свои работы",
    text:  "Нажмите «Работы студентов» в шапке сайта. В галерее можно переключаться между размеченным снимком и оригиналом.',",
  },
];

const POINTS_INFO = [
  { color: "#378ADD", label: "H₁, H₂", desc: "Линия Хильгенрейнера — горизонталь через Y-хрящи" },
  { color: "#1D9E75", label: "A₁, A₂", desc: "Крышка вертлужной впадины — касательная линия" },
  { color: "#EF9F27", label: "N₁, N₂", desc: "Шейка бедра — для расчёта дистанции h" },
];

const HelpModal: React.FC = () => {
  const [open, setOpen]   = useState(false);
  const [tab,  setTab]    = useState<"doctor" | "student">("doctor");

  return (
    <>
      {/* Кнопка ? */}
      <button
        onClick={() => setOpen(true)}
        title="Инструкция по использованию"
        className="flex items-center justify-center w-7 h-7 rounded-full border border-border
                   bg-secondary text-muted-foreground hover:text-foreground hover:border-primary/50
                   hover:bg-primary/5 transition-all text-sm font-semibold"
      >
        ?
      </button>

      {/* Модальное окно */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-2xl
                          max-h-[85vh] flex flex-col animate-fade-in">

            {/* Шапка */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div>
                <h2 className="text-base font-semibold text-foreground">Инструкция по использованию</h2>
                <p className="text-xs text-muted-foreground mt-0.5">HipDx AI — анализ дисплазии ТБС</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Вкладки */}
            <div className="flex border-b border-border shrink-0">
              {([
                { key: "doctor",  label: "Режим врача",   icon: <Stethoscope className="w-3.5 h-3.5" /> },
                { key: "student", label: "Режим студента", icon: <GraduationCap className="w-3.5 h-3.5" /> },
              ] as const).map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-2 px-6 py-3 text-xs font-semibold border-b-2 transition-colors ${
                    tab === key
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {icon}{label}
                </button>
              ))}
            </div>

            {/* Контент */}
            <div className="overflow-y-auto p-6 space-y-4">

              {/* Шаги */}
              {(tab === "doctor" ? DOCTOR_STEPS : STUDENT_STEPS).map((step, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full medical-gradient flex items-center justify-center
                                  text-primary-foreground shrink-0">
                    {step.icon}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-sm font-semibold text-foreground mb-1">{step.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{step.text}</p>
                  </div>
                </div>
              ))}

              {/* Анатомические точки — только для врача */}
              {tab === "doctor" && (
                <div className="mt-2 glass-panel rounded-lg p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Анатомические точки
                  </p>
                  {POINTS_INFO.map((p) => (
                    <div key={p.label} className="flex items-start gap-3 mt-2">
                      <div className="w-3 h-3 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: p.color }} />
                      <div>
                        <span className="text-xs font-semibold text-foreground">{p.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">{p.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Поддерживаемые форматы */}
              <div className="glass-panel rounded-lg p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Поддерживаемые форматы
                </p>
                <div className="flex gap-2 flex-wrap">
                  {["DICOM (.dcm)", "PNG", "JPG / JPEG"].map((fmt) => (
                    <span key={fmt}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-full
                                 border border-border bg-secondary text-foreground">
                      {fmt}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Для DICOM-файлов размер пикселя извлекается автоматически из метаданных снимка.
                </p>
              </div>

            </div>

            {/* Подвал */}
            <div className="px-6 py-3 border-t border-border shrink-0 flex justify-end">
              <button
                onClick={() => setOpen(false)}
                className="medical-gradient text-primary-foreground rounded-lg px-5 py-2
                           text-xs font-semibold hover:opacity-90 transition-all"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HelpModal;