'use client'

import { useState, useEffect, useCallback } from 'react'

type Producto = {
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
}

type Stats = {
  total_productos: number
  vencidos: number
  por_vencer: number
  stock_bajo: number
  valor_inventario: number
  por_categoria: { categoria: string; cantidad: number }[]
}

const CATEGORIAS = ['Lácteos','Fiambres','Bebidas','Limpieza','Panadería','Conservas','Golosinas','Higiene personal','Verdulería','Almacén general']
const UNIDADES   = ['unidad','kg','g','litro','paquete','caja','docena']
const fmt$ = (n: number) => '$' + Math.round(n || 0).toLocaleString('es-AR')
const hoy  = () => { const d = new Date(); d.setHours(0,0,0,0); return d }
const en7  = () => { const d = hoy(); d.setDate(d.getDate()+7); return d }

function getEstado(p: Producto): 'ok'|'vencido'|'por_vencer'|'stock_bajo' {
  const fv = p.fecha_vencimiento ? new Date(p.fecha_vencimiento + 'T00:00:00') : null
  if (fv && fv < hoy()) return 'vencido'
  if (fv && fv <= en7()) return 'por_vencer'
  if (p.stock_minimo > 0 && p.cantidad <= p.stock_minimo) return 'stock_bajo'
  return 'ok'
}

const EMPTY = { nombre:'', categoria:'', cantidad:0, unidad:'unidad', precio_costo:0, precio_venta:0, stock_minimo:0, fecha_vencimiento:null as string|null, proveedor:null as string|null }

export default function App() {
  const [pagina, setPagina]       = useState<'dashboard'|'stock'|'estadisticas'>('dashboard')
  const [productos, setProductos] = useState<Producto[]>([])
  const [stats, setStats]         = useState<Stats|null>(null)
  const [buscar, setBuscar]       = useState('')
  const [filtroCat, setFiltroCat] = useState('')
  const [filtroAlerta, setFiltroAlerta] = useState('')
  const [modal, setModal]         = useState(false)
  const [confirm, setConfirm]     = useState<{id:number,nombre:string}|null>(null)
  const [editando, setEditando]   = useState<Producto|null>(null)
  const [form, setForm]           = useState({...EMPTY})
  const [toast, setToast]         = useState<{msg:string,tipo:'ok'|'err'}|null>(null)
  const [saving, setSaving]       = useState(false)

  const showToast = (msg: string, tipo: 'ok'|'err' = 'ok') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 2800)
  }

  const fetchProductos = useCallback(async () => {
    const p = new URLSearchParams({ buscar, categoria: filtroCat })
    if (filtroAlerta) p.set('alerta', filtroAlerta)
    const r = await fetch('/api/productos?' + p)
    const d = await r.json()
    setProductos(Array.isArray(d) ? d : [])
  }, [buscar, filtroCat, filtroAlerta])

  const fetchStats = useCallback(async () => {
    const r = await fetch('/api/stats')
    setStats(await r.json())
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])
  useEffect(() => { if (pagina === 'stock' || pagina === 'estadisticas') fetchProductos() }, [pagina, fetchProductos])

  const goTo = (p: typeof pagina) => { setPagina(p); setFiltroAlerta(''); setBuscar(''); setFiltroCat('') }
  const irAlerta = (tipo: string) => { setPagina('stock'); setFiltroAlerta(tipo) }

  const abrirNuevo = () => { setEditando(null); setForm({...EMPTY}); setModal(true) }
  const abrirEditar = (p: Producto) => {
    setEditando(p)
    setForm({ nombre:p.nombre, categoria:p.categoria, cantidad:p.cantidad, unidad:p.unidad, precio_costo:p.precio_costo, precio_venta:p.precio_venta, stock_minimo:p.stock_minimo, fecha_vencimiento:p.fecha_vencimiento, proveedor:p.proveedor })
    setModal(true)
  }

  const guardar = async () => {
    if (!form.nombre || !form.categoria) { showToast('Completá nombre y categoría', 'err'); return }
    setSaving(true)
    const url    = editando ? `/api/productos/${editando.id}` : '/api/productos'
    const method = editando ? 'PUT' : 'POST'
    await fetch(url, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) })
    setSaving(false); setModal(false)
    showToast(editando ? 'Producto actualizado ✓' : 'Producto agregado ✓')
    fetchProductos(); fetchStats()
  }

  const eliminar = async (id: number) => {
    await fetch(`/api/productos/${id}`, { method:'DELETE' })
    setConfirm(null); showToast('Producto eliminado')
    fetchProductos(); fetchStats()
  }

  return (
    <div className="flex min-h-screen bg-[#0f1117] text-[#e8eaf0]" style={{fontFamily:"'DM Sans',sans-serif"}}>

      {/* SIDEBAR */}
      <aside className="fixed left-0 top-0 bottom-0 w-56 bg-[#181b23] border-r border-[#2a2f3d] flex flex-col pt-6 z-50">
        <div className="px-5 pb-5 border-b border-[#2a2f3d] mb-2">
          <div className="text-base font-semibold">🏪 Mi Almacén</div>
          <div className="text-xs text-[#6b7280] mt-0.5">Sistema de stock</div>
        </div>

        {([['dashboard','Dashboard','M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z'],['stock','Productos','M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z'],['estadisticas','Estadísticas','M18 20V10M12 20V4M6 20v-6']] as const).map(([p,lbl,path]) => (
          <button key={p} onClick={() => goTo(p)}
            className={`w-full flex items-center gap-2.5 px-5 py-2.5 text-sm font-medium border-l-[3px] transition-all text-left
              ${pagina===p ? 'text-[#4f8ef7] border-[#4f8ef7] bg-[#4f8ef7]/10' : 'text-[#6b7280] border-transparent hover:text-[#e8eaf0] hover:bg-[#1f2330]'}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 flex-shrink-0"><path d={path}/></svg>
            {lbl}
          </button>
        ))}

        <div className="text-[10px] text-[#6b7280] px-5 pt-5 pb-1 uppercase tracking-widest">Alertas</div>
        {([['vencido','Vencidos',stats?.vencidos,'red'],['por_vencer','Por vencer',stats?.por_vencer,'yellow'],['stock_bajo','Stock bajo',stats?.stock_bajo,'yellow']] as const).map(([tipo,lbl,count,color]) => (
          <button key={tipo} onClick={() => irAlerta(tipo)}
            className="w-full flex items-center gap-2.5 px-5 py-2.5 text-sm font-medium text-[#6b7280] border-l-[3px] border-transparent hover:text-[#e8eaf0] hover:bg-[#1f2330] transition-all text-left">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 flex-shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {lbl}
            {(count||0)>0 && <span className={`ml-auto text-[10px] font-bold rounded-full px-1.5 py-0.5 ${color==='red'?'bg-red-500 text-white':'bg-yellow-500 text-black'}`}>{count}</span>}
          </button>
        ))}
      </aside>

      {/* MAIN */}
      <main className="ml-56 flex-1 p-8">

        {/* DASHBOARD */}
        {pagina==='dashboard' && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-semibold">Dashboard</h1>
              <p className="text-sm text-[#6b7280] mt-1 capitalize">{new Date().toLocaleDateString('es-AR',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
            </div>
            <div className="grid grid-cols-4 gap-3.5 mb-4">
              {([['Total productos',stats?.total_productos,'en inventario','',()=>goTo('stock')],['⚠ Vencidos',stats?.vencidos,'retirar del stock','text-red-400',()=>irAlerta('vencido')],['🕐 Vencen pronto',stats?.por_vencer,'próximos 7 días','text-orange-400',()=>irAlerta('por_vencer')],['📦 Stock bajo',stats?.stock_bajo,'bajo el mínimo','text-yellow-400',()=>irAlerta('stock_bajo')]] as const).map(([lbl,val,sub,col,fn])=>(
                <button key={lbl} onClick={fn} className="bg-[#181b23] border border-[#2a2f3d] rounded-xl p-5 text-left hover:border-[#4f8ef7] transition-colors">
                  <div className="text-[11px] text-[#6b7280] uppercase tracking-widest mb-2.5">{lbl}</div>
                  <div className={`text-3xl font-semibold font-mono ${col}`}>{val??'—'}</div>
                  <div className="text-[11px] text-[#6b7280] mt-1.5">{sub}</div>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3.5 mb-6">
              <div className="bg-[#181b23] border border-[#2a2f3d] rounded-xl p-5">
                <div className="text-[11px] text-[#6b7280] uppercase tracking-widest mb-2.5">Valor del inventario</div>
                <div className="text-2xl font-semibold font-mono">{fmt$(stats?.valor_inventario??0)}</div>
                <div className="text-[11px] text-[#6b7280] mt-1.5">a precio de costo</div>
              </div>
              <div className="bg-[#181b23] border border-[#2a2f3d] rounded-xl p-5">
                <div className="text-[11px] text-[#6b7280] uppercase tracking-widest mb-2.5">Categorías activas</div>
                <div className="text-3xl font-semibold font-mono">{stats?.por_categoria.length??'—'}</div>
                <div className="text-[11px] text-[#6b7280] mt-1.5">grupos de productos</div>
              </div>
            </div>
            <div className="text-[11px] text-[#6b7280] uppercase tracking-widest mb-2.5">Estado del inventario</div>
            <div className="flex flex-col gap-2">
              {(stats?.vencidos??0)>0 && <Alerta tipo="rojo" msg={`⚠ ${stats!.vencidos} producto${stats!.vencidos>1?'s':''} vencido${stats!.vencidos>1?'s':''}`} sub="Retirar del inventario" />}
              {(stats?.por_vencer??0)>0 && <Alerta tipo="naranja" msg={`🕐 ${stats!.por_vencer} producto${stats!.por_vencer>1?'s':''} vence${stats!.por_vencer>1?'n':''} en los próximos 7 días`} sub="Priorizar venta" />}
              {(stats?.stock_bajo??0)>0 && <Alerta tipo="amarillo" msg={`📦 ${stats!.stock_bajo} producto${stats!.stock_bajo>1?'s':''} con stock bajo el mínimo`} sub="Reponer stock" />}
              {(stats?.vencidos??0)===0&&(stats?.por_vencer??0)===0&&(stats?.stock_bajo??0)===0 && <Alerta tipo="verde" msg="✅ Todo en orden — sin alertas activas" sub="" />}
            </div>
          </div>
        )}

        {/* STOCK */}
        {pagina==='stock' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div><h1 className="text-2xl font-semibold">Productos</h1><p className="text-sm text-[#6b7280] mt-1">Gestión de stock e inventario</p></div>
              <button onClick={abrirNuevo} className="bg-[#4f8ef7] hover:bg-[#3b6fd4] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">+ Agregar producto</button>
            </div>
            <div className="flex gap-2.5 mb-3">
              <input value={buscar} onChange={e=>{setBuscar(e.target.value)}} placeholder="Buscar producto o proveedor..."
                className="flex-1 bg-[#181b23] border border-[#2a2f3d] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#4f8ef7] placeholder:text-[#6b7280]" />
              <select value={filtroCat} onChange={e=>{setFiltroCat(e.target.value);fetchProductos()}}
                className="bg-[#181b23] border border-[#2a2f3d] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#4f8ef7] cursor-pointer">
                <option value="">Todas las categorías</option>
                {CATEGORIAS.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex gap-2 mb-4">
              {([['','Todos','bg-[#4f8ef7] text-white'],['vencido','🔴 Vencidos','bg-red-500 text-white'],['por_vencer','🟠 Por vencer','bg-orange-500 text-white'],['stock_bajo','🟡 Stock bajo','bg-yellow-500 text-black']] as const).map(([tipo,lbl,onCls])=>(
                <button key={tipo} onClick={()=>setFiltroAlerta(tipo)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${filtroAlerta===tipo?onCls+' border-transparent':'bg-[#181b23] text-[#6b7280] border-[#2a2f3d] hover:text-[#e8eaf0]'}`}>
                  {lbl}
                </button>
              ))}
            </div>
            <div className="bg-[#181b23] border border-[#2a2f3d] rounded-xl overflow-hidden">
              <table className="w-full border-collapse">
                <thead className="bg-[#1f2330]">
                  <tr>{['Producto','Cantidad','Precio costo','Precio venta','Vencimiento','Estado',''].map(h=><th key={h} className="px-3.5 py-3 text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-widest">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {productos.length===0
                    ? <tr><td colSpan={7} className="text-center py-14 text-[#6b7280] text-sm">No se encontraron productos</td></tr>
                    : productos.map(p=>{
                        const fv   = p.fecha_vencimiento ? new Date(p.fecha_vencimiento+'T00:00:00') : null
                        const dias = fv ? Math.round((fv.getTime()-hoy().getTime())/86400000) : null
                        const est  = getEstado(p)
                        const margen = p.precio_costo>0 ? Math.round((p.precio_venta-p.precio_costo)/p.precio_costo*100) : null
                        return (
                          <tr key={p.id} className="border-t border-[#2a2f3d] hover:bg-white/[0.02]">
                            <td className="px-3.5 py-3"><div className="font-medium text-sm">{p.nombre}</div><div className="text-[11px] text-[#6b7280]">{p.categoria}{p.proveedor?' · '+p.proveedor:''}</div></td>
                            <td className="px-3.5 py-3 font-mono text-sm">{p.cantidad} <span className="text-[#6b7280] text-[11px]">{p.unidad}</span>{p.stock_minimo>0&&<div className="text-[10px] text-[#6b7280]">mín: {p.stock_minimo}</div>}</td>
                            <td className="px-3.5 py-3 font-mono text-sm">{fmt$(p.precio_costo)}</td>
                            <td className="px-3.5 py-3 font-mono text-sm">{fmt$(p.precio_venta)}{margen!==null&&<div className="text-[10px] text-green-400">+{margen}%</div>}</td>
                            <td className="px-3.5 py-3 text-sm">{!fv?<span className="text-[#6b7280]">—</span>:dias!<0?<span className="text-red-400">Vencido hace {Math.abs(dias!)}d</span>:dias!<=7?<span className="text-orange-400">En {dias}d</span>:<span className="text-[#6b7280]">{fv.toLocaleDateString('es-AR')}</span>}</td>
                            <td className="px-3.5 py-3"><span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${{ok:'bg-green-500/15 text-green-400',vencido:'bg-red-500/15 text-red-400',por_vencer:'bg-orange-500/15 text-orange-400',stock_bajo:'bg-yellow-500/15 text-yellow-400'}[est]}`}>{({ok:'OK',vencido:'Vencido',por_vencer:'Por vencer',stock_bajo:'Stock bajo'})[est]}</span></td>
                            <td className="px-3.5 py-3"><div className="flex gap-1.5">
                              <button onClick={()=>abrirEditar(p)} className="text-xs px-3 py-1.5 rounded-lg bg-[#1f2330] border border-[#2a2f3d] hover:border-[#4f8ef7] hover:text-[#4f8ef7] transition-colors">Editar</button>
                              <button onClick={()=>setConfirm({id:p.id,nombre:p.nombre})} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 transition-colors">✕</button>
                            </div></td>
                          </tr>
                        )
                      })}
                </tbody>
              </table>
            </div>
            <div className="text-xs text-[#6b7280] mt-2 text-right">{productos.length} producto{productos.length!==1?'s':''}</div>
          </div>
        )}

        {/* ESTADÍSTICAS */}
        {pagina==='estadisticas' && stats && (
          <div>
            <div className="mb-6"><h1 className="text-2xl font-semibold">Estadísticas</h1><p className="text-sm text-[#6b7280] mt-1">Análisis del inventario actual</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#181b23] border border-[#2a2f3d] rounded-xl p-5">
                <div className="text-[11px] text-[#6b7280] uppercase tracking-widest mb-4">Productos por categoría</div>
                {stats.por_categoria.map(c=>{const max=Math.max(...stats.por_categoria.map(x=>x.cantidad),1);return(
                  <div key={c.categoria} className="mb-3">
                    <div className="flex justify-between text-xs text-[#6b7280] mb-1"><span>{c.categoria}</span><span>{c.cantidad}</span></div>
                    <div className="bg-[#1f2330] rounded h-2 overflow-hidden"><div className="h-full bg-[#4f8ef7] rounded transition-all" style={{width:`${Math.round(c.cantidad/max*100)}%`}}/></div>
                  </div>
                )})}
              </div>
              <div className="bg-[#181b23] border border-[#2a2f3d] rounded-xl p-5">
                <div className="text-[11px] text-[#6b7280] uppercase tracking-widest mb-4">Resumen de alertas</div>
                <div className="grid grid-cols-2 gap-2.5">
                  {([['Vencidos',stats.vencidos,'text-red-400','bg-red-500/10','border-red-500/20'],['Por vencer',stats.por_vencer,'text-orange-400','bg-orange-500/10','border-orange-500/20'],['Stock bajo',stats.stock_bajo,'text-yellow-400','bg-yellow-500/10','border-yellow-500/20'],['Sin alertas',stats.total_productos-stats.vencidos-stats.por_vencer-stats.stock_bajo,'text-green-400','bg-green-500/10','border-green-500/20']] as const).map(([lbl,n,col,bg,border])=>(
                    <div key={lbl} className={`${bg} border ${border} rounded-xl p-4 text-center`}><div className={`text-2xl font-semibold font-mono ${col}`}>{n}</div><div className="text-[11px] text-[#6b7280] mt-1">{lbl}</div></div>
                  ))}
                </div>
              </div>
              <div className="bg-[#181b23] border border-[#2a2f3d] rounded-xl p-5 col-span-2">
                <div className="text-[11px] text-[#6b7280] uppercase tracking-widest mb-4">Indicadores generales</div>
                <div className="grid grid-cols-4 gap-4">
                  {([['Total productos',stats.total_productos],['Valor inventario',fmt$(stats.valor_inventario)],['Categorías activas',stats.por_categoria.length],['Con vencimiento',productos.filter(p=>p.fecha_vencimiento).length]] as const).map(([lbl,val])=>(
                    <div key={lbl}><div className="text-[11px] text-[#6b7280] mb-1">{lbl}</div><div className="text-xl font-semibold font-mono">{val}</div></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL PRODUCTO */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[500]">
          <div className="bg-[#181b23] border border-[#2a2f3d] rounded-2xl p-7 w-[540px] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold">{editando?'Editar producto':'Nuevo producto'}</h2>
              <button onClick={()=>setModal(false)} className="text-[#6b7280] hover:text-[#e8eaf0] text-xl px-1">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">Nombre *</label>
                <input value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} placeholder="Ej: Leche La Serenísima 1L"
                  className="w-full bg-[#1f2330] border border-[#2a2f3d] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#4f8ef7]"/>
              </div>
              {([['Categoría *','select-cat'],['Proveedor','text-prov'],['Cantidad','num-cant'],['Unidad','select-uni'],['Precio costo ($)','num-costo'],['Precio venta ($)','num-venta'],['Stock mínimo','num-min'],['Fecha vencimiento','date-venc']] as const).map(([lbl,key])=>{
                const isSelect = key.startsWith('select')
                const isDate   = key.startsWith('date')
                const isNum    = key.startsWith('num')
                return (
                  <div key={key}>
                    <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">{lbl}</label>
                    {key==='select-cat' && <select value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))} className="w-full bg-[#1f2330] border border-[#2a2f3d] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#4f8ef7] cursor-pointer"><option value="">Seleccionar...</option>{CATEGORIAS.map(c=><option key={c}>{c}</option>)}</select>}
                    {key==='select-uni' && <select value={form.unidad} onChange={e=>setForm(f=>({...f,unidad:e.target.value}))} className="w-full bg-[#1f2330] border border-[#2a2f3d] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#4f8ef7] cursor-pointer">{UNIDADES.map(u=><option key={u}>{u}</option>)}</select>}
                    {key==='text-prov' && <input value={form.proveedor||''} onChange={e=>setForm(f=>({...f,proveedor:e.target.value}))} placeholder="Nombre del proveedor" className="w-full bg-[#1f2330] border border-[#2a2f3d] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#4f8ef7]"/>}
                    {key==='num-cant'  && <input type="number" value={form.cantidad} onChange={e=>setForm(f=>({...f,cantidad:+e.target.value}))} min={0} step={0.5} className="w-full bg-[#1f2330] border border-[#2a2f3d] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#4f8ef7]"/>}
                    {key==='num-costo' && <input type="number" value={form.precio_costo} onChange={e=>setForm(f=>({...f,precio_costo:+e.target.value}))} min={0} className="w-full bg-[#1f2330] border border-[#2a2f3d] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#4f8ef7]"/>}
                    {key==='num-venta' && <input type="number" value={form.precio_venta} onChange={e=>setForm(f=>({...f,precio_venta:+e.target.value}))} min={0} className="w-full bg-[#1f2330] border border-[#2a2f3d] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#4f8ef7]"/>}
                    {key==='num-min'   && <input type="number" value={form.stock_minimo} onChange={e=>setForm(f=>({...f,stock_minimo:+e.target.value}))} min={0} className="w-full bg-[#1f2330] border border-[#2a2f3d] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#4f8ef7]"/>}
                    {key==='date-venc' && <input type="date" value={form.fecha_vencimiento||''} onChange={e=>setForm(f=>({...f,fecha_vencimiento:e.target.value||null}))} className="w-full bg-[#1f2330] border border-[#2a2f3d] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#4f8ef7]"/>}
                  </div>
                )
              })}
            </div>
            <div className="flex justify-end gap-2.5 mt-5 pt-5 border-t border-[#2a2f3d]">
              <button onClick={()=>setModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium bg-[#1f2330] border border-[#2a2f3d] hover:border-[#4f8ef7] transition-colors">Cancelar</button>
              <button onClick={guardar} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium bg-[#4f8ef7] hover:bg-[#3b6fd4] text-white transition-colors disabled:opacity-50">{saving?'Guardando...':'Guardar producto'}</button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMAR ELIMINAR */}
      {confirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[500]">
          <div className="bg-[#181b23] border border-[#2a2f3d] rounded-2xl p-7 w-80 text-center">
            <h2 className="text-lg font-semibold mb-2">¿Eliminar producto?</h2>
            <p className="text-sm text-[#6b7280] mb-5">"{confirm.nombre}" — esta acción no se puede deshacer.</p>
            <div className="flex justify-center gap-2.5">
              <button onClick={()=>setConfirm(null)} className="px-4 py-2 rounded-lg text-sm bg-[#1f2330] border border-[#2a2f3d] hover:border-[#4f8ef7] transition-colors">Cancelar</button>
              <button onClick={()=>eliminar(confirm.id)} className="px-4 py-2 rounded-lg text-sm bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-colors">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm border bg-[#181b23] z-[999] ${toast.tipo==='ok'?'border-green-500/40':'border-red-500/40'}`}>{toast.msg}</div>}
    </div>
  )
}

function Alerta({tipo,msg,sub}:{tipo:string,msg:string,sub:string}) {
  const s:Record<string,string>={rojo:'bg-red-500/8 border-red-500/30',naranja:'bg-orange-500/8 border-orange-500/30',amarillo:'bg-yellow-500/8 border-yellow-500/30',verde:'bg-green-500/8 border-green-500/30'}
  const d:Record<string,string>={rojo:'bg-red-500',naranja:'bg-orange-500',amarillo:'bg-yellow-500',verde:'bg-green-500'}
  return <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${s[tipo]}`}><div className={`w-2 h-2 rounded-full flex-shrink-0 ${d[tipo]}`}/><span className="font-medium flex-1">{msg}</span>{sub&&<span className="text-xs text-[#6b7280]">{sub}</span>}</div>
}
