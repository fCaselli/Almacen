import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const buscar   = searchParams.get('buscar') || ''
  const categoria = searchParams.get('categoria') || ''
  const alerta   = searchParams.get('alerta') || ''

  let query = supabase.from('productos').select('*')

  if (buscar) query = query.or(`nombre.ilike.%${buscar}%,proveedor.ilike.%${buscar}%`)
  if (categoria && categoria !== 'todas') query = query.eq('categoria', categoria)

  const hoy  = new Date().toISOString().split('T')[0]
  const en7  = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  if (alerta === 'vencido') {
    query = query.not('fecha_vencimiento', 'is', null).lt('fecha_vencimiento', hoy)
  } else if (alerta === 'por_vencer') {
    query = query.not('fecha_vencimiento', 'is', null).gte('fecha_vencimiento', hoy).lte('fecha_vencimiento', en7)
  } else if (alerta === 'stock_bajo') {
    query = query.gt('stock_minimo', 0).lte('cantidad', supabase.rpc as any)
    // fallback: filter client-side for stock_bajo
    const { data, error } = await supabase.from('productos').select('*')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const filtered = (data || []).filter((p: any) => p.stock_minimo > 0 && p.cantidad <= p.stock_minimo)
    return NextResponse.json(filtered)
  }

  const { data, error } = await query.order('nombre')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { nombre, categoria, cantidad, unidad, precio_costo, precio_venta, stock_minimo, fecha_vencimiento, proveedor } = body

  if (!nombre || !categoria) return NextResponse.json({ error: 'Nombre y categoría requeridos' }, { status: 400 })

  const { data, error } = await supabase.from('productos').insert([{
    nombre, categoria,
    cantidad: cantidad || 0,
    unidad: unidad || 'unidad',
    precio_costo: precio_costo || 0,
    precio_venta: precio_venta || 0,
    stock_minimo: stock_minimo || 0,
    fecha_vencimiento: fecha_vencimiento || null,
    proveedor: proveedor || null,
  }]).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
