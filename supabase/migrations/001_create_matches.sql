-- Crear tabla matches
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  opponent TEXT,
  format INTEGER,
  goals INTEGER,
  assists INTEGER,
  result INTEGER, -- -1=Perdido, 0=Empatado, 1=Ganado
  is_mvp BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índice para mejorar consultas por usuario y fecha
CREATE INDEX IF NOT EXISTS idx_matches_user_date ON matches(user_id, date);

-- Habilitar Row Level Security
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios solo pueden ver sus propios partidos
CREATE POLICY "Users can view own matches"
  ON matches FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Usuarios solo pueden insertar sus propios partidos
CREATE POLICY "Users can insert own matches"
  ON matches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuarios solo pueden actualizar sus propios partidos
CREATE POLICY "Users can update own matches"
  ON matches FOR UPDATE
  USING (auth.uid() = user_id);

-- Política: Usuarios solo pueden eliminar sus propios partidos
CREATE POLICY "Users can delete own matches"
  ON matches FOR DELETE
  USING (auth.uid() = user_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en cada UPDATE
CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
