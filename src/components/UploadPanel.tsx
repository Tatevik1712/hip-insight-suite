import { useState, useRef } from "react";
import { Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface UploadPanelProps {
  onUploaded: (imageUrl: string) => void;
}

const UploadPanel = ({ onUploaded }: UploadPanelProps) => {
  const [patientId, setPatientId] = useState("");
  const [diagnosis, setDiagnosis] = useState("Не определен");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !patientId.trim()) {
      toast({ title: "Ошибка", description: "Выберите файл и укажите ID пациента", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}_${patientId}.${ext}`;

      const { error: storageError } = await supabase.storage
        .from("xray-images")
        .upload(path, file, { contentType: file.type });

      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage.from("xray-images").getPublicUrl(path);
      const imageUrl = urlData.publicUrl;

      const { error: dbError } = await supabase.from("xray_images").insert({
        patient_id: patientId.trim(),
        diagnosis,
        image_url: imageUrl,
        file_name: file.name,
        notes: notes.trim() || null,
      });

      if (dbError) throw dbError;

      toast({ title: "Успешно", description: "Снимок загружен и сохранён" });
      onUploaded(imageUrl);
      setPatientId("");
      setNotes("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: any) {
      toast({ title: "Ошибка загрузки", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="glass-panel rounded-lg p-4 space-y-3 animate-fade-in">
      <div className="flex items-center gap-2 mb-1">
        <Upload className="w-4 h-4 text-medical-blue" />
        <h3 className="text-sm font-semibold text-foreground">Загрузить снимок</h3>
      </div>

      <Input
        placeholder="ID пациента *"
        value={patientId}
        onChange={(e) => setPatientId(e.target.value)}
        className="h-8 text-xs"
      />

      <select
        value={diagnosis}
        onChange={(e) => setDiagnosis(e.target.value)}
        className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs text-foreground"
      >
        <option value="Не определен">Не определен</option>
        <option value="Норма">Норма</option>
        <option value="Пограничное состояние">Пограничное состояние</option>
        <option value="Дисплазия">Дисплазия</option>
      </select>

      <Input
        placeholder="Заметки (необязательно)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="h-8 text-xs"
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
      />

      <Button
        onClick={handleUpload}
        disabled={uploading}
        size="sm"
        className="w-full text-xs"
      >
        {uploading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
        {uploading ? "Загрузка..." : "Загрузить"}
      </Button>
    </div>
  );
};

export default UploadPanel;
