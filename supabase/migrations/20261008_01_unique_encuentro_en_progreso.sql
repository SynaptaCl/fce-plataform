-- APLICADA en prod (verificado vía MCP 2026-10-08: índice existe, 0 duplicados en_progreso).
-- Aplicada fuera de apply_migration, por eso no figura en el historial de migrations de Supabase.
-- Máx. 1 atención en_progreso por (paciente, profesional).
-- ANTES de crear el índice hay que resolver duplicados existentes (ver consulta 2),
-- si no el CREATE INDEX falla.

-- 1) Atenciones en_progreso de más de 12 h, por clínica (solo lectura)
select e.id_clinica, c.nombre as clinica, e.id as id_encuentro, e.id_paciente,
       e.id_profesional, e.especialidad, e.started_at,
       round(extract(epoch from (now() - e.started_at)) / 3600) as horas_abierta
from fce_encuentros e
left join clinicas c on c.id = e.id_clinica
where e.status = 'en_progreso'
  and e.started_at < now() - interval '12 hours'
order by e.id_clinica, e.started_at;

-- 2) Duplicados que bloquearían el índice (solo lectura)
select id_paciente, id_profesional, count(*) as abiertas
from fce_encuentros
where status = 'en_progreso'
group by 1, 2
having count(*) > 1;

-- 2b) Limpieza de duplicados: por cada (paciente, profesional) con >1 en_progreso se conserva
-- la más reciente y se cancelan (status 'cancelado', sin borrar) las anteriores SOLO si no
-- tienen ningún registro clínico. Duplicados con contenido NO se tocan (revisar a mano; el
-- índice del paso 3 seguirá fallando hasta resolverlos).
update fce_encuentros e
set status = 'cancelado'
where e.status = 'en_progreso'
  and exists (
    select 1 from fce_encuentros o
    where o.status = 'en_progreso'
      and o.id_paciente = e.id_paciente and o.id_profesional = e.id_profesional
      and (o.started_at, o.id) > (e.started_at, e.id)
  )
  and not exists (select 1 from fce_notas_soap x where x.id_encuentro = e.id)
  and not exists (select 1 from fce_notas_clinicas x where x.id_encuentro = e.id)
  and not exists (select 1 from fce_evaluaciones x where x.id_encuentro = e.id)
  and not exists (select 1 from fce_signos_vitales x where x.id_encuentro = e.id)
  and not exists (select 1 from instrumentos_aplicados x where x.id_encuentro = e.id)
  and not exists (select 1 from fce_prescripciones x where x.id_encuentro = e.id)
  and not exists (select 1 from fce_ordenes_examen x where x.id_encuentro = e.id)
  and not exists (select 1 from fce_egresos x where x.id_encuentro = e.id)
  and not exists (select 1 from fce_periograma x where x.id_encuentro = e.id)
  and not exists (select 1 from fce_odontograma_historial x where x.id_encuentro = e.id)
  and not exists (select 1 from fce_informes x where x.id_encuentro = e.id)
  and not exists (select 1 from fce_presupuestos x where x.id_encuentro = e.id)
  and not exists (select 1 from fce_antropometria x where x.id_encuentro = e.id)
  and not exists (select 1 from fce_fichas_esteticas x where x.id_encuentro = e.id)
  and not exists (select 1 from fce_plan_progreso x where x.id_encuentro = e.id)
  and not exists (select 1 from fce_adendas x where x.id_encuentro = e.id);

-- 3) Constraint (aplicar tras limpiar duplicados)
create unique index if not exists uq_fce_encuentros_en_progreso_por_prof
  on fce_encuentros (id_paciente, id_profesional)
  where status = 'en_progreso';
