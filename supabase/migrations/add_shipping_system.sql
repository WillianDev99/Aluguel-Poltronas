-- 1. Criar tabela de fretes por região
CREATE TABLE IF NOT EXISTS public.shipping_rates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  region_name TEXT NOT NULL,
  cep_start VARCHAR(8),
  cep_end VARCHAR(8),
  neighborhood VARCHAR(100),
  price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Habilitar RLS (Row Level Security)
ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;

-- 3. Criar política de acesso total (assim como as outras tabelas do projeto)
CREATE POLICY "allow_all_shipping_rates" ON public.shipping_rates FOR ALL USING (true) WITH CHECK (true);

-- 4. Adicionar colunas de frete na tabela de reservas
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS shipping_value NUMERIC DEFAULT 0;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS shipping_status VARCHAR(50) DEFAULT 'definido';
