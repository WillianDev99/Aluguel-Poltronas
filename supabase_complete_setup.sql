-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Clientes
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  cpf TEXT UNIQUE NOT NULL,
  rg TEXT,
  birth_date DATE,
  cnh_number TEXT,
  cnh_category TEXT,
  cnh_expiration DATE,
  email TEXT,
  phone TEXT,
  cep TEXT,
  street TEXT,
  number TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  status TEXT DEFAULT 'Ativo',
  vip BOOLEAN DEFAULT false,
  score INTEGER DEFAULT 100,
  cnh_url TEXT,
  address_proof_url TEXT,
  selfie_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Tabela de Veículos
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  plate TEXT UNIQUE NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  category TEXT NOT NULL,
  km NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Disponível',
  color TEXT,
  passengers INTEGER DEFAULT 5,
  doors INTEGER DEFAULT 4,
  transmission TEXT DEFAULT 'Manual',
  renavan TEXT,
  chassis TEXT,
  default_security_deposit NUMERIC DEFAULT 0,
  default_insurance_value NUMERIC DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Tabela de Reservas
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  pickup_date TIMESTAMP WITH TIME ZONE NOT NULL,
  return_date TIMESTAMP WITH TIME ZONE NOT NULL,
  daily_rate NUMERIC DEFAULT 0,
  days INTEGER NOT NULL,
  total_value NUMERIC DEFAULT 0,
  security_deposit NUMERIC DEFAULT 0,
  insurance_value NUMERIC DEFAULT 0,
  insurance_details JSONB,
  additional_services TEXT,
  observations TEXT,
  pickup_photos TEXT[],
  actual_pickup_date TIMESTAMP WITH TIME ZONE,
  pickup_checklist JSONB,
  return_photos TEXT[],
  actual_return_date TIMESTAMP WITH TIME ZONE,
  return_checklist JSONB,
  status TEXT DEFAULT 'aguardando retirada',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Tabela de Descontos Progressivos
CREATE TABLE IF NOT EXISTS public.progressive_discounts (
  day INTEGER PRIMARY KEY,
  discount_percent NUMERIC NOT NULL
);

-- Inserir descontos padrão (se a tabela estiver vazia)
INSERT INTO public.progressive_discounts (day, discount_percent) VALUES
(1, 0), (2, 0), (3, 0), (4, 0), (5, 0), (6, 0), (7, 5), (8, 5), (9, 5), (10, 5),
(11, 5), (12, 5), (13, 5), (14, 10), (15, 10), (16, 10), (17, 10), (18, 10), (19, 10), (20, 10),
(21, 10), (22, 10), (23, 10), (24, 10), (25, 10), (26, 10), (27, 10), (28, 10), (29, 10), (30, 15)
ON CONFLICT (day) DO NOTHING;

-- 5. Tabela de Chaves de API
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key_value TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- 6. Tabela de Perfis de Usuários (profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT DEFAULT 'user',
  full_name TEXT,
  avatar_url TEXT,
  signature_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. Tabela para modelos de contrato (contract_templates)
CREATE TABLE IF NOT EXISTS public.contract_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT,
  content TEXT,
  version TEXT,
  last_updated TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- 8. Tabela para contratos específicos de cada reserva (rental_contracts)
CREATE TABLE IF NOT EXISTS public.rental_contracts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  rental_id UUID REFERENCES public.reservations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS (Row Level Security) em tudo (opcional, ou desabilitado para simplificar se o admin faz tudo)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progressive_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_contracts ENABLE ROW LEVEL SECURITY;

-- Criar políticas de acesso "allow all" simplificadas
CREATE POLICY "allow_all_clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_vehicles" ON public.vehicles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_reservations" ON public.reservations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_progressive_discounts" ON public.progressive_discounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_api_keys" ON public.api_keys FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_contract_templates" ON public.contract_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_rental_contracts" ON public.rental_contracts FOR ALL USING (true) WITH CHECK (true);

-- Trigger para criar perfil automaticamente no SignUp
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (new.id, new.email, 'admin', new.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Inserir um modelo de contrato padrão
INSERT INTO public.contract_templates (name, content, version)
VALUES ('Contrato Padrão Midas', '
<h1 style="text-align: center;">CONTRATO DE LOCAÇÃO DE VEÍCULO AUTOMOTOR</h1>
<p><strong>LOCADORA:</strong> MIDAS RENT A CAR LTDA, com sede em Tianguá-CE.</p>
<p><strong>LOCATÁRIO:</strong> {{CLIENT_NAME}}, portador do CPF {{CLIENT_CPF}}, residente em {{CLIENT_ADDRESS}}.</p>
<p><strong>VEÍCULO:</strong> {{VEHICLE_MODEL}}, Placa {{VEHICLE_PLATE}}, Cor {{VEHICLE_COLOR}}, Ano {{VEHICLE_YEAR}}.</p>
<p><strong>PERÍODO:</strong> De {{PICKUP_DATE}} até {{RETURN_DATE}}.</p>
<p><strong>VALORES:</strong> O valor total da locação é de {{TOTAL_VALUE}}, com caução de {{SECURITY_DEPOSIT}}.</p>
<p><strong>FRANQUIA DE SEGURO:</strong> O locatário está ciente da franquia de {{INSURANCE_VALUE}} em caso de sinistro.</p>
<br>
<p style="text-align: center;">__________________________________________</p>
<p style="text-align: center;">{{CLIENT_NAME}}</p>
', '1.0')
ON CONFLICT DO NOTHING;

-- Função RPC segura para excluir usuários de auth.users e cascade deletar perfis
CREATE OR REPLACE FUNCTION public.delete_user_by_id(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- Buscar o cargo de quem está executando a função
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  
  -- Verificar se quem está chamando é um admin
  IF caller_role != 'admin' THEN
    RAISE EXCEPTION 'Apenas administradores podem excluir usuários.';
  END IF;

  -- Deletar da tabela auth.users (o cascade na FK do public.profiles irá deletar de profiles automaticamente)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

