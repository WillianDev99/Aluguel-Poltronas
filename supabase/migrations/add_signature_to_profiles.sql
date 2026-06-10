-- Adiciona coluna para a assinatura do Locador na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS signature_url TEXT;
