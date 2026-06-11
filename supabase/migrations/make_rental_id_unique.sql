-- 1. Remover registros duplicados mantendo apenas o mais recente de cada rental_id
DELETE FROM public.rental_contracts
WHERE id NOT IN (
    SELECT DISTINCT ON (rental_id) id
    FROM public.rental_contracts
    ORDER BY rental_id, created_at DESC
);

-- 2. Adicionar restrição UNIQUE na coluna rental_id para impedir duplicatas no futuro
ALTER TABLE public.rental_contracts
ADD CONSTRAINT rental_contracts_rental_id_key UNIQUE (rental_id);
