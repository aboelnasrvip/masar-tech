create or replace function public.purchase_with_wallet(p_plan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  plan public.subscription_plans%rowtype;
  bal numeric;
  owned boolean;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into plan from public.subscription_plans where id = p_plan_id and is_active = true;
  if not found then
    raise exception 'plan not found';
  end if;

  select exists (
    select 1
    from public.subscriptions s
    where s.student_id = auth.uid()
      and s.course_id = plan.course_id
      and s.status = 'active'
      and (s.ends_at is null or s.ends_at > now())
      and (
        (
          plan.module_id is not null
          and (
            s.module_id is not distinct from plan.module_id
            or (
              s.module_id is null
              and (s.term_id is null or s.term_id is not distinct from plan.term_id)
            )
          )
        )
        or (
          plan.module_id is null
          and s.module_id is null
          and (s.term_id is null or s.term_id is not distinct from plan.term_id)
        )
      )
  ) into owned;

  if owned then
    raise exception 'already subscribed';
  end if;

  bal := public.wallet_balance(auth.uid());
  if bal < plan.price then
    raise exception 'insufficient balance';
  end if;

  insert into public.wallet_transactions (student_id, type, amount, status, description)
  values (auth.uid(), 'course_purchase', -plan.price, 'completed', 'شراء من المحفظة: ' || plan.name);

  perform public.activate_subscription(auth.uid(), plan.id);
  perform public.notify_user(auth.uid(), 'تم تفعيل الاشتراك', 'اشتريت «' || plan.name || '» من المحفظة.');
end;
$$;
