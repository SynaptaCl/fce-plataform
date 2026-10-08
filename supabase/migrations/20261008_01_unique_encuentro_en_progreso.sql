-- PENDIENTE DE APLICAR (aprobación humana, regla 15). No ejecutado.
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

-- 3) Constraint (aplicar tras limpiar duplicados)
create unique index if not exists uq_fce_encuentros_en_progreso_por_prof
  on fce_encuentros (id_paciente, id_profesional)
  where status = 'en_progreso';
