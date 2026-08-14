-- Option B — visibilité des tâches attribuées
-- L'assigné (assignee_id) peut LIRE les tâches qui lui sont attribuées.
-- Les écritures de l'assigné (changement de statut) passent par une action serveur
-- (service role) qui vérifie assignee_id = auth.uid() et se limite au statut ;
-- on n'ajoute donc AUCUNE policy UPDATE large (évite tout détournement de propriété).

create policy tasks_assignee_select on public.tasks
  for select using (assignee_id = auth.uid());
