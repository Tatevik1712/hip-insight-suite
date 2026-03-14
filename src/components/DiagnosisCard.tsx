import { ShieldCheck } from "lucide-react";

type DiagnosisStatus = "normal" | "borderline" | "dysplasia";

interface DiagnosisCardProps {
  status?: DiagnosisStatus;
}

const statusConfig = {
  normal: {
    label: "Норма",
    className: "status-normal",
    summary: "Тазобедренные суставы развиты правильно. Ацетабулярные углы в пределах нормы, линии Шентона непрерывны.",
    reasoning: "Все измеренные параметры соответствуют возрастной норме. Признаков дисплазии не выявлено.",
  },
  borderline: {
    label: "Пограничное состояние",
    className: "status-borderline",
    summary: "Незначительные отклонения параметров. Рекомендован повторный осмотр через 4-6 недель.",
    reasoning: "Ацетабулярный угол находится на верхней границе нормы. Требуется динамическое наблюдение.",
  },
  dysplasia: {
    label: "Дисплазия",
    className: "status-dysplasia",
    summary: "Признаки подвывиха левого бедра. Увеличение ацетабулярного угла и латеральное смещение головки.",
    reasoning: "Ацетабулярный угол > 30°, прерывистость линии Шентона, латеральное смещение головки бедренной кости.",
  },
};

const DiagnosisCard = ({ status = "normal" }: DiagnosisCardProps) => {
  const config = statusConfig[status];

  return (
    <div className="glass-panel rounded-lg p-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-4 h-4 text-medical-blue" />
        <h3 className="text-sm font-semibold text-foreground">Заключение</h3>
      </div>

      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold mb-3 ${config.className}`}>
        <span className="w-2 h-2 rounded-full bg-current animate-pulse-soft" />
        {config.label}
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Резюме</p>
          <p className="text-sm text-foreground leading-relaxed">{config.summary}</p>
        </div>
        <div className="border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Обоснование</p>
          <p className="text-sm text-foreground leading-relaxed">{config.reasoning}</p>
        </div>
      </div>
    </div>
  );
};

export default DiagnosisCard;
