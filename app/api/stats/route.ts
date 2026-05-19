import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase.from('productos').select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const en7 = new Date(hoy); en7.setDate(hoy.getDate() + 7)
  const fmt = (d: Date) => d.toISOString().split('T')[0]

  const productos = data || []
  const vencidos   = productos.filter(p => p.fecha_vencimiento && new Date(p.fecha_vencimiento) < hoy).length
  const por_vencer = productos.filter(p => {
    if (!p.fecha_vencimiento) return false
    const f = new Date(p.fecha_vencimiento)
    return f >= hoy && f <= en7
  }).length
  const stock_bajo = productos.filter(p => p.stock_minimo > 0 && p.cantidad <= p.stock_minimo).length
  const valor = productos.reduce((a: number, p: any) => a + (p.cantidad || 0) * (p.precio_costo || 0), 0)

  const catMap: Record<string, number> = {}
  productos.forEach((p: any) => { catMap[p.categoria] = (catMap[p.categoria] || 0) + 1 })
  const por_categoria = Object.entries(catMap).map(([categoria, cantidad]) => ({ categoria, cantidad })).sort((a, b) => b.cantidad - a.cantidad)

  return NextResponse.json({
    total_productos: productos.length,
    vencidos, por_vencer, stock_bajo,
    valor_inventario: valor,
    por_categoria,
  })
}
