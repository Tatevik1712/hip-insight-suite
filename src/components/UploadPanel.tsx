/**
 * @file components/UploadPanel.tsx
 * @description Панель загрузки снимка для студенческого режима.
 *
 * Supabase удалён — файл читается локально через FileReader
 * и передаётся в родитель через onUploaded(dataUrl).
 */
import { useRef } from "react";
import { Upload } from "lucide-react";

interface Props {
  onUploaded: (imageUrl: string) => void;
}

const UploadPanel = ({ onUploaded }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) onUploaded(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="glass-panel rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Upload className="w-4 h-4 text-medical-blue" />
        <h3 className="text-sm font-semibold text-foreground">Загрузить снимок</h3>
      </div>
      <button
        onClick={() => fileRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 rounded-lg border-2
                   border-dashed border-border bg-secondary/40 px-4 py-4 text-xs
                   font-medium text-muted-foreground hover:border-primary/50
                   hover:text-primary hover:bg-primary/5 transition-all"
      >
        <Upload className="w-4 h-4" />
        Выбрать файл · DICOM, PNG, JPG
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,.dcm,.dicom"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
};

export default UploadPanel;