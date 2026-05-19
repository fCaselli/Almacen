import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Producto = {
  id: number
  nombre: string
  categoria: string
  cantidad: number
  unidad: string
  precio_costo: number
  precio_venta: number
  stock_minimo: number
  fecha_vencimiento: string | null
  proveedor: string | null
  created_at: string
  updated_at: string
}
