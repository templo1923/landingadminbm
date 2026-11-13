-- Ejecuta este script SQL en la sección SQL Editor de tu panel de Supabase.

-- Crear extensión para IDs seguros
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- Perfiles de Usuarios (Manejo del Tenant)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    company_name TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger para automatizar la creación de profile cuando un usuario hace sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, company_name)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'first_name', 
    new.raw_user_meta_data->>'company_name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validar si el trigger ya existe antes de crearlo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger para updated_at de profiles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- Conexiones de WhatsApp
-- ==========================================
-- Crear la tabla para almacenar las conexiones de WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Vinculado a Auth de Supabase
    waba_id TEXT NOT NULL,
    phone_number_id TEXT NOT NULL,
    display_phone_number TEXT,
    verified_name TEXT,
    access_token TEXT,
    access_token_encrypted TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Restricciones de unicidad
    UNIQUE(waba_id, phone_number_id)
);

-- Habilitar Seguridad por Nivel de Filas (RLS - Row Level Security)
ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;

-- Politica 1: Un usuario solo puede VER sus propias conexiones
DROP POLICY IF EXISTS "Users can view their own connections" ON public.whatsapp_connections;
CREATE POLICY "Users can view their own connections"
ON public.whatsapp_connections
FOR SELECT
USING (auth.uid() = user_id);

-- Politica 2: Un usuario solo puede MODIFICAR y BORRAR sus propias conexiones
DROP POLICY IF EXISTS "Users can update their own connections" ON public.whatsapp_connections;
CREATE POLICY "Users can update their own connections"
ON public.whatsapp_connections
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own connections" ON public.whatsapp_connections;
CREATE POLICY "Users can delete their own connections"
ON public.whatsapp_connections
FOR DELETE
USING (auth.uid() = user_id);

-- OJO: La política de INSERT la manejamos desde el servidor (API Route) usando el Service Role Key (Admin Client),
-- por lo cual evitamos que alguien directamente en el front end intente insertar tokens inválidos.

-- Funcion (Trigger) para auto-actualizar la columna updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_whatsapp_connections_updated_at ON public.whatsapp_connections;
CREATE TRIGGER update_whatsapp_connections_updated_at
BEFORE UPDATE ON public.whatsapp_connections
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- SI YA HABÍAS CREADO LA TABLA ANTES, EJECUTA SOLO ESTO:
-- ==========================================
ALTER TABLE public.whatsapp_connections
ADD COLUMN IF NOT EXISTS display_phone_number TEXT,
ADD COLUMN IF NOT EXISTS verified_name TEXT,
ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT;

ALTER TABLE public.whatsapp_connections
ALTER COLUMN access_token DROP NOT NULL;

-- ==========================================
-- Tabla para estados de mensajes de WhatsApp
-- ==========================================
CREATE TABLE IF NOT EXISTS public.whatsapp_message_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Tenant Isolation
    waba_id TEXT,
    phone_number_id TEXT,
    message_id TEXT NOT NULL UNIQUE,
    recipient_phone TEXT,
    template_name TEXT,
    direction TEXT DEFAULT 'outbound',
    message_text TEXT,
    status TEXT NOT NULL,
    error_code TEXT,
    error_title TEXT,
    error_message TEXT,
    raw_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_event_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.whatsapp_message_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.whatsapp_message_events
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.whatsapp_message_events
ADD COLUMN IF NOT EXISTS message_text TEXT,
ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'outbound';

DROP POLICY IF EXISTS "Users can view whatsapp message events" ON public.whatsapp_message_events;

CREATE POLICY "Users can view whatsapp message events"
ON public.whatsapp_message_events
FOR SELECT
USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_whatsapp_message_events_updated_at ON public.whatsapp_message_events;
CREATE TRIGGER update_whatsapp_message_events_updated_at
BEFORE UPDATE ON public.whatsapp_message_events
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- Tabla de Clientes (Customers)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name_1 TEXT,
    last_name_2 TEXT,
    
    -- Campos de Negocio
    payment_status TEXT DEFAULT 'pending',
    billing_cycle TEXT DEFAULT 'monthly',
    next_payment_date DATE,
    
    -- Campos de Ciclo de Vida (Soft Delete & Pausas)
    is_active BOOLEAN DEFAULT true,
    inactive_at TIMESTAMP WITH TIME ZONE NULL,
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Asegurar que no haya números duplicados por cada usuario
    UNIQUE(user_id, phone_number)
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own customers" ON public.customers;
CREATE POLICY "Users can view their own customers"
ON public.customers
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own customers" ON public.customers;
CREATE POLICY "Users can update their own customers"
ON public.customers
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own customers" ON public.customers;
CREATE POLICY "Users can delete their own customers"
ON public.customers
FOR DELETE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own customers" ON public.customers;
CREATE POLICY "Users can insert their own customers"
ON public.customers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
