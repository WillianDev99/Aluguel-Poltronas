-- Adiciona colunas para suportar assinaturas digitais na tabela rental_contracts
ALTER TABLE public.rental_contracts 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'assinado')),
ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS signature_url TEXT, -- Imagem Base64 da assinatura desenhada do cliente
ADD COLUMN IF NOT EXISTS client_ip TEXT, -- IP de auditoria
ADD COLUMN IF NOT EXISTS client_user_agent TEXT, -- Navegador/Dispositivo do cliente
ADD COLUMN IF NOT EXISTS client_name TEXT, -- Nome digitado para conferência
ADD COLUMN IF NOT EXISTS client_cpf TEXT; -- CPF digitado para conferência
