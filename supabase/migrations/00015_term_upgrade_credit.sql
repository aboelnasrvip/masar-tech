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
  credit numeric := 0;
  charge numeric;
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

  if plan.type = 'full_term' then
    select coalesce(sum(month_price), 0) into credit
    from (
      select s.module_id, max(p.price) as month_price
      from public.subscriptions s
      join public.subscription_plans p on p.id = s.plan_id
      left join public.course_modules m on m.id = s.module_id
      where s.student_id = auth.uid()
        and s.course_id = plan.course_id
        and s.status = 'active'
        and (s.ends_at is null or s.ends_at > now())
        and s.module_id is not null
        and (
          s.term_id is not distinct from plan.term_id
          or m.term_id is not distinct from plan.term_id
        )
      group by s.module_id
    ) owned_months;

    if credit > plan.price then
      credit := plan.price;
    end if;
  end if;

  charge := greatest(plan.price - credit, 0);
  bal := public.wallet_balance(auth.uid());
  if bal < charge then
    raise exception 'insufficient balance';
  end if;

  if charge > 0 then
    insert into public.wallet_transactions (student_id, type, amount, status, description)
    values (
      auth.uid(),
      'course_purchase',
      -charge,
      'completed',
      case
        when credit > 0 then 'ترقية لترم كامل: ' || plan.name || ' — خصم شهور مشتراة ' || credit::text || ' ج'
        else 'شراء من المحفظة: ' || plan.name
      end
    );
  end if;

  perform public.activate_subscription(auth.uid(), plan.id);
  perform public.notify_user(
    auth.uid(),
    'تم تفعيل الاشتراك',
    case
      when credit > 0 then 'رقيت «' || plan.name || '» واتحسب خصم الشهور اللي اشتريتها قبل كده.'
      else 'اشتريت «' || plan.name || '» من المحفظة.'
    end
  );
end;
$$;
