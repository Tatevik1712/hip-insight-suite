
-- Create xray_images table
CREATE TABLE public.xray_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id TEXT NOT NULL,
  diagnosis TEXT NOT NULL DEFAULT 'Не определен',
  image_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.xray_images ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can view xray images"
ON public.xray_images FOR SELECT USING (true);

-- Public insert access
CREATE POLICY "Anyone can insert xray images"
ON public.xray_images FOR INSERT WITH CHECK (true);

-- Public update access
CREATE POLICY "Anyone can update xray images"
ON public.xray_images FOR UPDATE USING (true);

-- Public delete access
CREATE POLICY "Anyone can delete xray images"
ON public.xray_images FOR DELETE USING (true);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_xray_images_updated_at
BEFORE UPDATE ON public.xray_images
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for xray images
INSERT INTO storage.buckets (id, name, public) VALUES ('xray-images', 'xray-images', true);

-- Storage policies
CREATE POLICY "Xray images are publicly accessible"
ON storage.objects FOR SELECT USING (bucket_id = 'xray-images');

CREATE POLICY "Anyone can upload xray images"
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'xray-images');
