import { Activity, AlertTriangle, CheckCircle2, Info } from "lucide-react";

interface ParameterRow {
  name: string;
  value: string;
  norm: string;
  status: "normal" | "warning" | "danger";
}

const parameters: ParameterRow[] = [
  { name: "Ацетабулярный угол (L)", value: "28°", norm: "< 30°", status: "normal" },
  { name: "Ацетабулярный угол (R)", value: "22°", norm: "< 30°", status: "normal" },
  { name: "Линия Шентона (L)", value: "Непрерывна", norm: "Сплошная", status: "normal" },
  { name: "Линия Шентона (R)", value: "Непрерывна", norm: "Сплошная", status: "normal" },
  { name: "Угол α (L)", value: "62°", norm: "> 60°", status: "normal" },
  { name: "Угол β (L)", value: "55°", norm: "< 77°", status: "normal" },
];

const keyPoints = [
  { label: "Y-хрящ (L)", coords: "x: 192, y: 210" },
  { label: "Y-хрящ (R)", coords: "x: 312, y: 210" },
  { label: "Головка бедра (L)", coords: "x: 165, y: 275" },
  { label: "Головка бедра (R)", coords: "x: 335, y: 275" },
];

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "normal") return <CheckCircle2 className="w-3.5 h-3.5 text-medical-green" />;
  if (status === "warning") return <AlertTriangle className="w-3.5 h-3.5 text-medical-amber" />;
  return <AlertTriangle className="w-3.5 h-3.5 text-destructive" />;
};

const ParametersDashboard = () => {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Key Points */}
      <div className="glass-panel rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-medical-blue" />
          <h3 className="text-sm font-semibold text-foreground">Опорные точки ИИ</h3>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {keyPoints.map(kp => (
            <div key={kp.label} className="flex items-center justify-between px-3 py-2 bg-secondary rounded-md">
              <span className="text-xs font-medium text-foreground">{kp.label}</span>
              <span className="text-xs font-mono text-muted-foreground">{kp.coords}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Parameters Table */}
      <div className="glass-panel rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-medical-blue" />
          <h3 className="text-sm font-semibold text-foreground">Параметры</h3>
        </div>
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-secondary">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Параметр</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">Значение</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">Норма</th>
                <th className="text-center px-2 py-2 font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {parameters.map((p, i) => (
                <tr key={p.name} className={i % 2 === 0 ? "bg-card" : "bg-secondary/50"}>
                  <td className="px-3 py-2 text-foreground font-medium">{p.name}</td>
                  <td className="text-center px-3 py-2 font-mono text-foreground">{p.value}</td>
                  <td className="text-center px-3 py-2 text-muted-foreground">{p.norm}</td>
                  <td className="text-center px-2 py-2"><StatusIcon status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ParametersDashboard;
