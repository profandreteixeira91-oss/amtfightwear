-- Criar uma view para consolidar clientes da loja (compradores, cadastrados e leads do chat)
CREATE OR REPLACE VIEW public.store_customers_unified AS
WITH customer_base AS (
    -- 1. Usuários cadastrados (perfis) que interagiram com a loja
    SELECT 
        p.id,
        p.email,
        p.full_name,
        p.phone,
        p.document,
        p.city,
        p.state,
        p.created_at,
        'registered' as type
    FROM public.profiles p
    WHERE EXISTS (
        SELECT 1 FROM public.store_orders o WHERE o.user_id = p.id
        UNION ALL
        SELECT 1 FROM public.store_carts c WHERE c.user_id = p.id
    )

    UNION

    -- 2. Leads do Chat (não necessariamente cadastrados como perfis)
    SELECT 
        'chat:' || external_id as id,
        customer_email as email,
        customer_name as full_name,
        customer_phone as phone,
        NULL as document,
        NULL as city,
        NULL as state,
        created_at,
        'lead' as type
    FROM public.sales_conversations
    WHERE customer_email IS NOT NULL OR customer_name IS NOT NULL

    UNION

    -- 3. Compradores Guest (pedidos sem user_id)
    SELECT 
        'guest:' || customer_email as id,
        customer_email as email,
        NULL as full_name, 
        NULL as phone,
        NULL as document,
        NULL as city,
        NULL as state,
        created_at,
        'guest' as type
    FROM public.store_orders
    WHERE user_id IS NULL AND customer_email IS NOT NULL
),
aggregated_orders AS (
    SELECT 
        COALESCE(user_id::text, 'guest:' || customer_email) as customer_id,
        count(*) as orders_count,
        count(*) FILTER (WHERE payment_status = 'paid') as paid_count,
        sum(total) FILTER (WHERE payment_status = 'paid') as total_spent,
        max(created_at) as last_order_at
    FROM public.store_orders
    GROUP BY 1
),
aggregated_carts AS (
    SELECT 
        COALESCE(user_id::text, 'chat:' || sc.external_id) as customer_id,
        count(*) as abandoned_carts_count
    FROM public.store_carts c
    LEFT JOIN public.sales_conversations sc ON c.conversation_id = sc.id
    WHERE c.status = 'active' AND (c.created_at < now() - interval '2 hours')
    GROUP BY 1
)
SELECT 
    cb.*,
    COALESCE(ao.orders_count, 0) as orders_count,
    COALESCE(ao.paid_count, 0) as paid_count,
    COALESCE(ao.total_spent, 0) as total_spent,
    ao.last_order_at,
    COALESCE(ac.abandoned_carts_count, 0) as abandoned_carts_count
FROM customer_base cb
LEFT JOIN aggregated_orders ao ON cb.id = ao.customer_id
LEFT JOIN aggregated_carts ac ON cb.id = ac.customer_id;

GRANT SELECT ON public.store_customers_unified TO authenticated;
GRANT ALL ON public.store_customers_unified TO service_role;
