-- Corrige la fonction pour récupérer le prénom que ce soit
-- une inscription classique (email) ou une connexion Google

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, prenom)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'prenom',           -- inscription classique
      new.raw_user_meta_data->>'given_name',        -- Google (prénom seul)
      split_part(new.raw_user_meta_data->>'full_name', ' ', 1), -- Google (nom complet, on prend le 1er mot)
      split_part(new.raw_user_meta_data->>'name', ' ', 1)
    )
  );
  return new;
end;
$$ language plpgsql security definer;
