create or replace function public.has_course_entitlement(p_student uuid, p_course uuid, p_module uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.subscriptions s
    where s.student_id = p_student
      and s.course_id = p_course
      and s.status = 'active'
      and (s.ends_at is null or s.ends_at > now())
      and (
        s.module_id is null
        or s.module_id = p_module
      )
  );
$$;

create or replace function public.activate_subscription(p_student uuid, p_plan_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  plan public.subscription_plans%rowtype;
  existing public.subscriptions%rowtype;
  duration interval;
  sub_id uuid;
begin
  select * into plan from public.subscription_plans where id = p_plan_id;
  if not found then
    raise exception 'plan not found';
  end if;

  duration := make_interval(days => coalesce(
    plan.duration_days,
    case when plan.type = 'monthly' then 30 else 180 end
  ));

  select * into existing
  from public.subscriptions
  where student_id = p_student
    and course_id = plan.course_id
    and status = 'active'
    and (ends_at is null or ends_at > now())
    and (
      (plan.module_id is null and module_id is null)
      or module_id is not distinct from plan.module_id
      or module_id is null
    )
  order by created_at desc
  limit 1;

  if existing.id is not null then
    if existing.module_id is null or plan.module_id is null or existing.module_id is not distinct from plan.module_id then
      update public.subscriptions
      set plan_id = plan.id,
          module_id = case
            when existing.module_id is null or plan.module_id is null then null
            else plan.module_id
          end,
          ends_at = greatest(coalesce(ends_at, now()), now()) + duration
      where id = existing.id;
      return existing.id;
    end if;
  end if;

  insert into public.subscriptions (student_id, course_id, plan_id, module_id, status, starts_at, ends_at)
  values (p_student, plan.course_id, plan.id, plan.module_id, 'active', now(), now() + duration)
  returning id into sub_id;

  return sub_id;
end;
$$;

create or replace function public.approve_payment(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  pay public.payments%rowtype;
  plan public.subscription_plans%rowtype;
begin
  if not public.is_staff() then
    raise exception 'forbidden';
  end if;

  select * into pay from public.payments where id = p_payment_id for update;
  if not found or pay.status <> 'pending' then
    raise exception 'payment not pending';
  end if;

  update public.payments
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_payment_id;

  insert into public.wallet_transactions (student_id, payment_id, type, amount, status, description)
  values (pay.student_id, pay.id, 'deposit', pay.amount, 'completed', 'شحن بعد اعتماد التحويل');

  if pay.kind = 'course_purchase' and pay.plan_id is not null then
    select * into plan from public.subscription_plans where id = pay.plan_id;
    if found then
      insert into public.wallet_transactions (student_id, payment_id, type, amount, status, description)
      values (pay.student_id, pay.id, 'course_purchase', -plan.price, 'completed', 'شراء ' || plan.name);

      perform public.activate_subscription(pay.student_id, plan.id);
      perform public.notify_user(pay.student_id, 'تم تفعيل الاشتراك', 'اشتراك «' || plan.name || '» اتفعّل. تقدر تدخل الكورس دلوقتي.');
    end if;
  else
    perform public.notify_user(pay.student_id, 'تم اعتماد الدفع', 'الرصيد اتضاف لمحفظتك.');
  end if;
end;
$$;

create or replace function public.purchase_with_wallet(p_plan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  plan public.subscription_plans%rowtype;
  bal numeric;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into plan from public.subscription_plans where id = p_plan_id and is_active = true;
  if not found then
    raise exception 'plan not found';
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

update public.subscriptions
set status = 'expired'
where status = 'active'
  and ends_at is not null
  and ends_at <= now();

insert into public.platform_settings (key, value)
values (
  'payment_methods',
  '[
    {"id":"vodafone_cash","name":"فودافون كاش","account":"01012345678","enabled":true},
    {"id":"orange_cash","name":"أورانج كاش","account":"01212345678","enabled":true},
    {"id":"instapay","name":"InstaPay","account":"01112345678@instapay","enabled":true},
    {"id":"etisalat_cash","name":"e& money","account":"01512345678","enabled":true},
    {"id":"bank_transfer","name":"تحويل بنكي","account":"CIB — 10001234567890","enabled":true}
  ]'::jsonb
)
on conflict (key) do update set value = excluded.value, updated_at = now();

insert into public.courses (id, title, slug, description, image_url, subject, educational_stage, grade, academic_year, status)
values
  ('a1111111-1111-4111-8111-111111111111', 'أساسيات HTML', 'html-basics', 'أول خطوة في بناء الصفحات: العناصر، العناوين، الروابط، والنماذج.', 'https://img.youtube.com/vi/UB1O30fR-EE/hqdefault.jpg', 'برمجة', 'secondary', 'sec-1', '2026', 'published'),
  ('a2222222-2222-4222-8222-222222222222', 'تنسيق الصفحات بـ CSS', 'css-styling', 'الألوان، الصندوق، الفليكس، والتصميم المتجاوب.', 'https://img.youtube.com/vi/1Rs2ND1voeU/hqdefault.jpg', 'برمجة', 'secondary', 'sec-1', '2026', 'published'),
  ('a3333333-3333-4333-8333-333333333333', 'JavaScript من الصفر', 'javascript-intro', 'المتغيرات، الشروط، الدوال، والتفاعل مع الصفحة.', 'https://img.youtube.com/vi/W6NZfCO5SIk/hqdefault.jpg', 'برمجة', 'secondary', 'sec-2', '2026', 'published'),
  ('a4444444-4444-4444-8444-444444444444', 'مقدمة بايثون', 'python-intro', 'التفكير المنطقي وكتابة أول برامج بايثون.', 'https://img.youtube.com/vi/kqtD5dpn9C8/hqdefault.jpg', 'برمجة', 'secondary', 'sec-2', '2026', 'published'),
  ('a5555555-5555-4555-8555-555555555555', 'مشروع ويب كامل', 'web-project', 'تجمع HTML و CSS و JS في مشروع واحد خطوة بخطوة.', 'https://img.youtube.com/vi/hdI2bqOjy3c/hqdefault.jpg', 'برمجة', 'secondary', 'sec-3', '2026', 'published')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  image_url = excluded.image_url,
  status = 'published',
  updated_at = now();

insert into public.course_modules (id, course_id, title, description, order_index, is_published)
values
  ('b1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', 'الشهر الأول — البداية', 'التعرف على HTML وبناء أول صفحة.', 0, true),
  ('b2222222-2222-4222-8222-222222222222', 'a2222222-2222-4222-8222-222222222222', 'الشهر الأول — التنسيق', 'قواعد CSS الأساسية.', 0, true),
  ('b3333333-3333-4333-8333-333333333333', 'a3333333-3333-4333-8333-333333333333', 'الشهر الأول — التفاعل', 'أساسيات JavaScript.', 0, true),
  ('b4444444-4444-4444-8444-444444444444', 'a4444444-4444-4444-8444-444444444444', 'الشهر الأول — المنطق', 'المتغيرات والشروط في بايثون.', 0, true),
  ('b5555555-5555-4555-8555-555555555555', 'a5555555-5555-4555-8555-555555555555', 'الشهر الأول — المشروع', 'تجميع صفحة هبوط كاملة.', 0, true)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  is_published = true;

insert into public.lessons (id, module_id, title, slug, description, order_index, is_published, video_provider, video_id, video_title, video_thumbnail, upload_method, video_visible, pdf_visible, editor_visible, assignment_visible)
values
  ('c1111111-1111-4111-8111-111111111111', 'b1111111-1111-4111-8111-111111111111', 'أول صفحة HTML', 'first-html-page', 'العناصر الأساسية وهيكل الصفحة.', 0, true, 'youtube', 'UB1O30fR-EE', 'أول صفحة HTML', 'https://img.youtube.com/vi/UB1O30fR-EE/hqdefault.jpg', 'manual', true, true, true, true),
  ('c2222222-2222-4222-8222-222222222222', 'b2222222-2222-4222-8222-222222222222', 'الألوان والصندوق', 'css-box-model', 'كيف تتحكم في الشكل والمسافات.', 0, true, 'youtube', '1Rs2ND1voeU', 'الألوان والصندوق', 'https://img.youtube.com/vi/1Rs2ND1voeU/hqdefault.jpg', 'manual', true, true, true, true),
  ('c3333333-3333-4333-8333-333333333333', 'b3333333-3333-4333-8333-333333333333', 'المتغيرات والدوال', 'js-variables', 'أول كود JavaScript يشتغل في المتصفح.', 0, true, 'youtube', 'W6NZfCO5SIk', 'المتغيرات والدوال', 'https://img.youtube.com/vi/W6NZfCO5SIk/hqdefault.jpg', 'manual', true, true, true, true),
  ('c4444444-4444-4444-8444-444444444444', 'b4444444-4444-4444-8444-444444444444', 'أول برنامج بايثون', 'first-python', 'طباعة، إدخال، وشروط بسيطة.', 0, true, 'youtube', 'kqtD5dpn9C8', 'أول برنامج بايثون', 'https://img.youtube.com/vi/kqtD5dpn9C8/hqdefault.jpg', 'manual', true, true, false, true),
  ('c5555555-5555-4555-8555-555555555555', 'b5555555-5555-4555-8555-555555555555', 'بناء صفحة هبوط', 'landing-project', 'تجميع المهارات في مشروع واحد.', 0, true, 'youtube', 'hdI2bqOjy3c', 'بناء صفحة هبوط', 'https://img.youtube.com/vi/hdI2bqOjy3c/hqdefault.jpg', 'manual', true, true, true, true)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  is_published = true,
  video_id = excluded.video_id,
  video_thumbnail = excluded.video_thumbnail,
  editor_visible = excluded.editor_visible,
  assignment_visible = true;

insert into public.lesson_editor_blocks (lesson_id, html, css, js)
values
  ('c1111111-1111-4111-8111-111111111111', '<h1>أهلاً بمسار تك</h1>\n<p>عدّل الصفحة وشوف النتيجة.</p>', 'body { font-family: Cairo, sans-serif; padding: 24px; }', 'console.log("HTML lesson")'),
  ('c2222222-2222-4222-8222-222222222222', '<section class="card">صندوق تجريبي</section>', '.card { background: #3b82f6; color: white; padding: 24px; border-radius: 16px; }', ''),
  ('c3333333-3333-4333-8333-333333333333', '<button id="btn">اضغطني</button>\n<p id="out"></p>', 'button { padding: 12px 20px; }', 'document.getElementById("btn").onclick = () => { document.getElementById("out").textContent = "اشتغل!" }'),
  ('c5555555-5555-4555-8555-555555555555', '<header><h1>مشروعي</h1></header>', 'header { padding: 40px; text-align: center; }', '')
on conflict (lesson_id) do update set
  html = excluded.html,
  css = excluded.css,
  js = excluded.js;

insert into public.subscription_plans (id, course_id, name, type, price, duration_days, module_id, is_active)
values
  ('d1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', 'شهر HTML', 'monthly', 150, 30, 'b1111111-1111-4111-8111-111111111111', true),
  ('d2222222-2222-4222-8222-222222222222', 'a2222222-2222-4222-8222-222222222222', 'شهر CSS', 'monthly', 150, 30, 'b2222222-2222-4222-8222-222222222222', true),
  ('d3333333-3333-4333-8333-333333333333', 'a3333333-3333-4333-8333-333333333333', 'ترم JavaScript كامل', 'full_term', 450, 180, null, true),
  ('d4444444-4444-4444-8444-444444444444', 'a4444444-4444-4444-8444-444444444444', 'ترم بايثون كامل', 'full_term', 400, 180, null, true),
  ('d5555555-5555-4555-8555-555555555555', 'a5555555-5555-4555-8555-555555555555', 'ترم المشروع الكامل', 'full_term', 550, 180, null, true)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  duration_days = excluded.duration_days,
  module_id = excluded.module_id,
  is_active = true;

insert into public.assignments (id, lesson_id, title, description, passing_score, max_attempts, is_required, is_published)
values
  ('e1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111', 'واجب HTML', 'اختبر فهمك للعناصر الأساسية.', 60, 3, true, true),
  ('e2222222-2222-4222-8222-222222222222', 'c2222222-2222-4222-8222-222222222222', 'واجب CSS', 'سؤال على الصندوق والألوان.', 60, 3, true, true),
  ('e3333333-3333-4333-8333-333333333333', 'c3333333-3333-4333-8333-333333333333', 'واجب JavaScript', 'المتغيرات والدوال.', 60, 3, true, true),
  ('e4444444-4444-4444-8444-444444444444', 'c4444444-4444-4444-8444-444444444444', 'واجب بايثون', 'أول برنامج.', 60, 3, true, true),
  ('e5555555-5555-4555-8555-555555555555', 'c5555555-5555-4555-8555-555555555555', 'واجب المشروع', 'تجميع الصفحة.', 60, 3, true, true)
on conflict (id) do update set
  title = excluded.title,
  is_published = true,
  is_required = true;

insert into public.questions (id, assignment_id, question_text, question_type, points, order_index, explanation)
values
  ('f1111111-1111-4111-8111-111111111111', 'e1111111-1111-4111-8111-111111111111', 'إيه الوسم المستخدم لأكبر عنوان في الصفحة؟', 'multiple_choice', 2, 0, 'h1 هو أكبر عنوان.'),
  ('f2222222-2222-4222-8222-222222222222', 'e2222222-2222-4222-8222-222222222222', 'padding بيتحكم في المسافة داخل العنصر.', 'true_false', 2, 0, 'صح، padding من جوّه.'),
  ('f3333333-3333-4333-8333-333333333333', 'e3333333-3333-4333-8333-333333333333', 'إيه الكلمة اللي بنعرّف بيها متغير في JavaScript الحديثة؟', 'multiple_choice', 2, 0, 'const أو let.'),
  ('f4444444-4444-4444-8444-444444444444', 'e4444444-4444-4444-8444-444444444444', 'print في بايثون بتطبع نص على الشاشة.', 'true_false', 2, 0, 'صح.'),
  ('f5555555-5555-4555-8555-555555555555', 'e5555555-5555-4555-8555-555555555555', 'إيه ناتج 2 + "2" في JavaScript غالبًا؟', 'code_output', 2, 0, 'بيتحول لنص: 22.')
on conflict (id) do update set
  question_text = excluded.question_text,
  explanation = excluded.explanation;

delete from public.question_options
where question_id in (
  'f1111111-1111-4111-8111-111111111111',
  'f2222222-2222-4222-8222-222222222222',
  'f3333333-3333-4333-8333-333333333333',
  'f4444444-4444-4444-8444-444444444444',
  'f5555555-5555-4555-8555-555555555555'
);

insert into public.question_options (id, question_id, option_text, is_correct, order_index)
values
  ('01111111-1111-4111-8111-111111111111', 'f1111111-1111-4111-8111-111111111111', '<h1>', true, 0),
  ('01111111-1111-4111-8111-111111111112', 'f1111111-1111-4111-8111-111111111111', '<title>', false, 1),
  ('01111111-1111-4111-8111-111111111113', 'f1111111-1111-4111-8111-111111111111', '<p>', false, 2),
  ('02222222-2222-4222-8222-222222222221', 'f2222222-2222-4222-8222-222222222222', 'صح', true, 0),
  ('02222222-2222-4222-8222-222222222222', 'f2222222-2222-4222-8222-222222222222', 'غلط', false, 1),
  ('03333333-3333-4333-8333-333333333331', 'f3333333-3333-4333-8333-333333333333', 'const', true, 0),
  ('03333333-3333-4333-8333-333333333332', 'f3333333-3333-4333-8333-333333333333', 'define', false, 1),
  ('03333333-3333-4333-8333-333333333333', 'f3333333-3333-4333-8333-333333333333', 'dim', false, 2),
  ('04444444-4444-4444-8444-444444444441', 'f4444444-4444-4444-8444-444444444444', 'صح', true, 0),
  ('04444444-4444-4444-8444-444444444442', 'f4444444-4444-4444-8444-444444444444', 'غلط', false, 1),
  ('05555555-5555-4555-8555-555555555551', 'f5555555-5555-4555-8555-555555555555', '22', true, 0),
  ('05555555-5555-4555-8555-555555555552', 'f5555555-5555-4555-8555-555555555555', '4', false, 1),
  ('05555555-5555-4555-8555-555555555553', 'f5555555-5555-4555-8555-555555555555', 'خطأ', false, 2);

insert into public.live_sessions (id, course_id, title, description, starts_at, join_url, recording_url, is_published)
values
  ('11111111-aaaa-4aaa-8aaa-111111111111', 'a1111111-1111-4111-8111-111111111111', 'لايف مراجعة HTML', 'أسئلة مباشرة على أول صفحة.', now() + interval '2 days', 'https://meet.google.com/masar-html', null, true),
  ('22222222-aaaa-4aaa-8aaa-222222222222', 'a2222222-2222-4222-8222-222222222222', 'لايف CSS', 'نتدرب على الفليكس مع بعض.', now() + interval '4 days', 'https://meet.google.com/masar-css', null, true),
  ('33333333-aaaa-4aaa-8aaa-333333333333', 'a3333333-3333-4333-8333-333333333333', 'لايف JavaScript', 'حل تمارين تفاعل.', now() + interval '6 days', 'https://meet.google.com/masar-js', null, true),
  ('44444444-aaaa-4aaa-8aaa-444444444444', 'a4444444-4444-4444-8444-444444444444', 'لايف بايثون', 'كتابة أول برامج مع المدرس.', now() + interval '8 days', 'https://meet.google.com/masar-py', null, true),
  ('55555555-aaaa-4aaa-8aaa-555555555555', 'a5555555-5555-4555-8555-555555555555', 'لايف المشروع', 'مراجعة صفحة الهبوط.', now() + interval '10 days', 'https://meet.google.com/masar-project', 'https://youtube.com/watch?v=hdI2bqOjy3c', true)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  starts_at = excluded.starts_at,
  join_url = excluded.join_url,
  is_published = true;

do $$
declare
  author uuid;
  student uuid;
  students uuid[];
begin
  select id into author from public.profiles order by created_at limit 1;
  if author is null then
    return;
  end if;

  insert into public.community_posts (id, author_id, course_id, title, body, is_hidden)
  values
    ('91111111-1111-4111-8111-111111111111', author, 'a1111111-1111-4111-8111-111111111111', 'الفرق بين h1 و title؟', 'إمتى أستخدم كل واحد؟', false),
    ('92222222-2222-4222-8222-222222222222', author, 'a2222222-2222-4222-8222-222222222222', 'padding ولا margin؟', 'لسه متلخبط بينهم.', false),
    ('93333333-3333-4333-8333-333333333333', author, 'a3333333-3333-4333-8333-333333333333', 'ليه console مش ظاهر؟', 'كتبت الكود ومش شايف حاجة.', false),
    ('94444444-4444-4444-8444-444444444444', author, 'a4444444-4444-4444-8444-444444444444', 'بايثون على الموبايل؟', 'ينفع أتعلم من غير لابتوب؟', false),
    ('95555555-5555-4555-8555-555555555555', author, 'a5555555-5555-4555-8555-555555555555', 'فكرة لمشروع التخرج', 'عايز أعمل صفحة لمدرستي.', false)
  on conflict (id) do update set title = excluded.title, body = excluded.body, is_hidden = false;

  insert into public.community_replies (id, post_id, author_id, body, is_teacher_answer)
  values
    ('a0111111-1111-4111-8111-111111111111', '91111111-1111-4111-8111-111111111111', author, 'title في التبويب، h1 ظاهر في الصفحة.', true),
    ('a0222222-2222-4222-8222-222222222222', '92222222-2222-4222-8222-222222222222', author, 'padding جوّه العنصر، margin برّه.', true),
    ('a0333333-3333-4333-8333-333333333333', '93333333-3333-4333-8333-333333333333', author, 'افتح Inspect واختار Console.', true),
    ('a0444444-4444-4444-8444-444444444444', '94444444-4444-4444-8444-444444444444', author, 'ينفع تبدأ من الموبايل، والتطبيق أحسن على الكمبيوتر.', false),
    ('a0555555-5555-4555-8555-555555555555', '95555555-5555-4555-8555-555555555555', author, 'ابدأ بهيدر، نبذة، وجدول الحصص.', true)
  on conflict (id) do update set body = excluded.body;

  select array_agg(id) into students
  from (
    select id from public.profiles where role = 'student' order by created_at limit 5
  ) s;

  if students is null or array_length(students, 1) is null then
    students := array[author];
  end if;

  student := students[1];

  insert into public.notifications (id, user_id, title, body, is_read)
  values
    ('11111111-1111-4111-8111-a11111111111', student, 'أهلاً في مسار تك', 'الكورسات التجريبية اتنشرت. اختار خطتك.', false),
    ('22222222-2222-4222-8222-a22222222222', student, 'طرق الدفع جاهزة', 'تقدر تحوّل فودافون أو إنستاباي من صفحة الدفع.', false),
    ('33333333-3333-4333-8333-a33333333333', student, 'لايف الأسبوع', 'فيه محاضرة HTML بعد يومين.', false),
    ('44444444-4444-4444-8444-a44444444444', student, 'المحفظة', 'لو الأدمن اعتمد تحويل، الرصيد يظهر هنا.', false),
    ('55555555-5555-4555-8555-a55555555555', student, 'المجتمع مفتوح', 'اسأل سؤالك والدرس هيتناقش.', false)
  on conflict (id) do update set title = excluded.title, body = excluded.body;

  insert into public.payments (id, student_id, course_id, plan_id, method, amount, reference, status, kind)
  values
    ('11111111-1111-4111-8111-b11111111111', students[1], 'a1111111-1111-4111-8111-111111111111', 'd1111111-1111-4111-8111-111111111111', 'vodafone_cash', 150, 'VF-10001', 'pending', 'course_purchase'),
    ('22222222-2222-4222-8222-b22222222222', students[least(2, array_length(students, 1))], 'a3333333-3333-4333-8333-333333333333', 'd3333333-3333-4333-8333-333333333333', 'instapay', 450, 'IP-20002', 'pending', 'course_purchase'),
    ('33333333-3333-4333-8333-b33333333333', students[1], null, null, 'orange_cash', 200, 'OR-30003', 'pending', 'wallet_deposit'),
    ('44444444-4444-4444-8444-b44444444444', students[least(3, array_length(students, 1))], 'a4444444-4444-4444-8444-444444444444', 'd4444444-4444-4444-8444-444444444444', 'etisalat_cash', 400, 'ET-40004', 'rejected', 'course_purchase'),
    ('55555555-5555-4555-8555-b55555555555', students[1], 'a2222222-2222-4222-8222-222222222222', 'd2222222-2222-4222-8222-222222222222', 'bank_transfer', 150, 'BK-50005', 'approved', 'course_purchase')
  on conflict (id) do update set
    status = excluded.status,
    amount = excluded.amount,
    reference = excluded.reference;

  insert into public.wallet_transactions (id, student_id, payment_id, type, amount, status, description)
  values
    ('11111111-1111-4111-8111-c11111111111', students[1], '55555555-5555-4555-8555-b55555555555', 'deposit', 150, 'completed', 'شحن بعد اعتماد التحويل'),
    ('22222222-2222-4222-8222-c22222222222', students[1], '55555555-5555-4555-8555-b55555555555', 'course_purchase', -150, 'completed', 'شراء شهر CSS'),
    ('33333333-3333-4333-8333-c33333333333', students[1], null, 'adjustment', 50, 'completed', 'رصيد تجريبي للتجربة'),
    ('44444444-4444-4444-8444-c44444444444', students[least(2, array_length(students, 1))], null, 'deposit', 100, 'completed', 'شحن تجريبي'),
    ('55555555-5555-4555-8555-c55555555555', students[least(3, array_length(students, 1))], '44444444-4444-4444-8444-b44444444444', 'deposit', 0, 'failed', 'تحويل مرفوض')
  on conflict (id) do nothing;

  insert into public.subscriptions (id, student_id, course_id, plan_id, module_id, status, starts_at, ends_at)
  values
    ('11111111-1111-4111-8111-d11111111111', students[1], 'a2222222-2222-4222-8222-222222222222', 'd2222222-2222-4222-8222-222222222222', 'b2222222-2222-4222-8222-222222222222', 'active', now() - interval '2 days', now() + interval '28 days'),
    ('22222222-2222-4222-8222-d22222222222', students[1], 'a1111111-1111-4111-8111-111111111111', 'd1111111-1111-4111-8111-111111111111', 'b1111111-1111-4111-8111-111111111111', 'active', now() - interval '5 days', now() + interval '25 days'),
    ('33333333-3333-4333-8333-d33333333333', students[least(2, array_length(students, 1))], 'a3333333-3333-4333-8333-333333333333', 'd3333333-3333-4333-8333-333333333333', null, 'active', now(), now() + interval '180 days'),
    ('44444444-4444-4444-8444-d44444444444', students[least(3, array_length(students, 1))], 'a4444444-4444-4444-8444-444444444444', 'd4444444-4444-4444-8444-444444444444', null, 'expired', now() - interval '200 days', now() - interval '20 days'),
    ('55555555-5555-4555-8555-d55555555555', students[least(4, array_length(students, 1))], 'a5555555-5555-4555-8555-555555555555', 'd5555555-5555-4555-8555-555555555555', null, 'cancelled', now() - interval '10 days', now() + interval '170 days')
  on conflict (id) do update set
    status = excluded.status,
    ends_at = excluded.ends_at;

  insert into public.lesson_progress (student_id, lesson_id, video_progress, video_completed, assignment_completed, lesson_completed, completed_at)
  values
    (students[1], 'c1111111-1111-4111-8111-111111111111', 100, true, true, true, now() - interval '1 day'),
    (students[1], 'c2222222-2222-4222-8222-222222222222', 40, false, false, false, null)
  on conflict (student_id, lesson_id) do nothing;
end $$;
