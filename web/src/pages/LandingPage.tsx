import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle2,
  Code2,
  FileText,
  GraduationCap,
  HelpCircle,
  PlayCircle,
  Radio,
  TrendingUp,
  Unlock,
  Wallet,
} from 'lucide-react'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { Button } from '@/components/ui/Button'
import { cx } from '@/lib/cx'
import { formatMoney } from '@/lib/labels'
import { useGetPublishedCoursesQuery } from '@/store/api/studentApi'

const reasons = [
  {
    icon: PlayCircle,
    title: 'دروس فيديو مرتبة',
    text: 'كل شهر له مسار واضح: فيديو، ملف، تدريب، وواجب. مش محتوى مبعثر.',
  },
  {
    icon: Code2,
    title: 'محرر جوه الدرس',
    text: 'HTML و CSS و JavaScript تتجرب في نفس الصفحة، وتشوف النتيجة فورًا.',
  },
  {
    icon: CheckCircle2,
    title: 'واجبات بتصحيح فوري',
    text: 'تحل، تاخد النتيجة، والدرس اللي بعده يتفتح لما تخلّص المطلوب.',
  },
  {
    icon: Wallet,
    title: 'اشتراك يناسب الأسرة',
    text: 'دفع يدوي من المحافظ الإلكترونية، والمحفظة جوه حسابك.',
  },
]

const steps = [
  { title: 'سجّل بحسابك', text: 'إيميل للتأكيد، وبعدها تدخل بالإيميل أو رقمك.' },
  { title: 'اختار الكورس والخطة', text: 'شهري أو الترم كامل، حسب اللي يناسبك.' },
  { title: 'حوّل واطلب التفعيل', text: 'تبعت التحويل وصورة الإيصال، والأدمن يراجع.' },
  { title: 'اتعلّم وكمّل المسار', text: 'اتفرج، تدرّب، حل، وافتح الدرس اللي بعده.' },
]

const courses = [
  {
    title: 'أساسيات البرمجة',
    grade: 'الأول الثانوي',
    points: ['التفكير المنطقي', 'أول سطر كود', 'مشاريع صغيرة'],
  },
  {
    title: 'تطوير الويب',
    grade: 'الثاني الثانوي',
    points: ['HTML و CSS', 'صفحات حقيقية', 'محرر تفاعلي'],
  },
  {
    title: 'JavaScript والمشاريع',
    grade: 'الثالث الثانوي',
    points: ['التفاعل في الصفحة', 'واجبات أسبوعية', 'بناء مشروع'],
  },
]

const experiences = [
  { icon: BookOpen, title: 'تجربة التعلم', text: 'درس واضح: فيديو، ملخص، وملف PDF.' },
  { icon: Code2, title: 'التجربة العملية', text: 'اكتب كود واتفرج على النتيجة في نفس الشاشة.' },
  { icon: FileText, title: 'الواجبات', text: 'أسئلة اختيار وتصحيح تلقائي من غير انتظار.' },
  { icon: TrendingUp, title: 'التقدم', text: 'تشوف وقفت فين، وإيه اللي اتفتح لك.' },
  { icon: Radio, title: 'المحاضرات لايف', text: 'مواعيد، أسئلة، وتسجيل بعد الجلسة.' },
  { icon: Unlock, title: 'فتح الدروس', text: 'الخطوة الجاية تظهر بعد ما تخلّص الحالية.' },
]

const plans = [
  {
    name: 'الاشتراك الشهري',
    text: 'تفتح شهر دراسي واحد، وتكمّل الشهر اللي بعده لما تحتاج.',
    items: ['دروس الشهر', 'المحرر والواجبات', 'ملفات PDF'],
  },
  {
    name: 'الترم الكامل',
    text: 'مسار الترم كله من أول درس لآخر واجب، من غير تقطيع.',
    items: ['كل شهور الترم', 'التقدم محفوظ', 'أولوية في اللايف'],
    featured: true,
  },
]

const faqs = [
  {
    q: 'المنصة عربي؟',
    a: 'أيوه. الواجهة عربي بالكامل ومن اليمين لليسار. المصطلحات الإنجليزية تظهر بس جوه الكود.',
  },
  {
    q: 'أدخل بإيه؟',
    a: 'إنشاء الحساب بالإيميل وهو اللي بيتأكد. الدخول بعد كده بالإيميل أو رقم تليفونك + كلمة السر.',
  },
  {
    q: 'الدفع إلكتروني؟',
    a: 'الدفع يدوي في النسخة الأولى: فودافون كاش، أورانج كاش، إنستاباي، وغيرهم حسب إعداد الأدمن.',
  },
  {
    q: 'لو محتاج أراجع الدرس؟',
    a: 'الدروس المفتوحة تفضل معاك. الفيديو والملف والمحرر في نفس صفحة الدرس.',
  },
]

const voices = [
  {
    name: 'يوسف — أولى ثانوي',
    text: 'أول مرة أحس إن البرمجة مش فيديوهات طويلة وخلاص. بحل وافتح اللي بعده.',
  },
  {
    name: 'مروة — تانية ثانوي',
    text: 'المحرر جوه الدرس وفّر عليا التنقل. بكتب وبشوف النتيجة في مكان واحد.',
  },
  {
    name: 'أحمد ولي أمر',
    text: 'الدفع واضح، والتقدم ظاهر. عارف ابني واصل لحد فين من غير ما أسأل كل يوم.',
  },
]

export function LandingPage() {
  const { data: published = [] } = useGetPublishedCoursesQuery()
  const catalog = published.slice(0, 5)
  const heroRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = heroRef.current
    if (!video) return
    video.muted = true
    void video.play().catch(() => undefined)
  }, [])

  return (
    <div className="min-h-svh">
      <PublicHeader />

      <section className="relative h-svh w-full overflow-hidden">
        <video
          ref={heroRef}
          className="absolute inset-0 h-full w-full object-cover object-center"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-label="فيديو Go Tech"
        >
          <source src="/hero.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/25 to-black/10" />
        <div className="relative z-10 flex h-full w-full flex-col landing-pad pt-28 pb-8 md:pt-32 md:pb-12">
          <h1 className="landing-hero-title w-fit self-start text-start leading-[1.05]">
            <span className="block whitespace-nowrap text-6xl font-black tracking-tight text-teal-300 md:text-8xl lg:text-9xl" dir="ltr">
              Go Tech
            </span>
            <span className="mt-3 block w-0 min-w-full text-xl font-black leading-snug text-white md:mt-4 md:text-2xl lg:text-3xl">
              مسار واضح لتعلّم البرمجة
            </span>
          </h1>
          <Link
            to="/register"
            className="landing-hero-cta neuro-brand neuro-hover mt-auto inline-flex self-end items-center justify-center gap-2 rounded-full px-6 py-2.5 text-base font-bold md:px-8 md:py-3 md:text-lg"
          >
            ابدأ دلوقتي
            <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" strokeWidth={2.5} />
          </Link>
        </div>
      </section>

      <Reveal as="section" id="why" className="landing-pad py-12">
        <SectionTitle title="ليه Go Tech" text="المنصة مش فيديوهات بس. التعلم، التطبيق، والتصحيح في حلقة واحدة." />
        <div className="landing-stagger grid gap-5 md:grid-cols-2">
          {reasons.map((item) => (
            <article key={item.title} className="neuro-raised-sm neuro-hover rounded-3xl p-6">
              <item.icon className="mb-4 h-8 w-8 neuro-accent" />
              <h3 className="neuro-text mb-2 text-xl font-bold">{item.title}</h3>
              <p className="neuro-text-muted leading-7">{item.text}</p>
            </article>
          ))}
        </div>
      </Reveal>

      <Reveal as="section" id="instructor" className="landing-pad py-12">
        <SectionTitle title="مين ورا Go Tech" text="بتتعلم مع مهندس شغال في السوق، مش محتوى جاهز من غير صاحب." />
        <div className="neuro-raised grid items-center gap-8 rounded-4xl p-5 md:grid-cols-[minmax(0,18rem)_1fr] md:p-8 lg:grid-cols-[minmax(0,22rem)_1fr]">
          <img
            src="/fares.jpg"
            alt="فارس أبو النصر"
            className="h-full max-h-[32rem] w-full rounded-3xl object-cover object-[center_20%]"
          />
          <div className="space-y-5">
            <p className="text-sm font-semibold neuro-accent">مؤسس Go Tech</p>
            <h3 className="neuro-text text-3xl font-black md:text-4xl">فارس أبو النصر</h3>
            <p className="neuro-text-muted text-lg leading-8">
              مهندس برمجيات (Software Engineer)، خريج كلية الحاسبات والمعلومات، بخبرة أكتر من 5 سنين في مجال البرمجة.
              شغال بالفعل في سوق العمل مع شركات، وكمان فريلانس — وبنقل الخبرة دي لطلاب الثانوية خطوة بخطوة.
            </p>
            <div className="landing-stagger grid gap-3 sm:grid-cols-3">
              <article className="neuro-pressed rounded-2xl p-4">
                <GraduationCap className="mb-2 h-6 w-6 neuro-accent" />
                <p className="neuro-text text-sm font-bold">حاسبات ومعلومات</p>
                <p className="neuro-text-muted mt-1 text-xs leading-6">خريج كلية الحاسبات</p>
              </article>
              <article className="neuro-pressed rounded-2xl p-4">
                <Briefcase className="mb-2 h-6 w-6 neuro-accent" />
                <p className="neuro-text text-sm font-bold">+5 سنين خبرة</p>
                <p className="neuro-text-muted mt-1 text-xs leading-6">في مجال البرمجة</p>
              </article>
              <article className="neuro-pressed rounded-2xl p-4">
                <Building2 className="mb-2 h-6 w-6 neuro-accent" />
                <p className="neuro-text text-sm font-bold">شركات وفريلانس</p>
                <p className="neuro-text-muted mt-1 text-xs leading-6">شغال في سوق العمل</p>
              </article>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal as="section" id="how" className="landing-pad py-12">
        <SectionTitle title="إزاي بتشتغل" text="أربع خطوات، من أول حساب لحد ما الدرس اللي بعده يتفتح." />
        <div className="landing-stagger grid gap-5 md:grid-cols-4">
          {steps.map((step, index) => (
            <article key={step.title} className="neuro-raised-sm rounded-3xl p-5">
              <span className="neuro-pressed mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl font-bold neuro-accent">
                {index + 1}
              </span>
              <h3 className="neuro-text mb-2 font-bold">{step.title}</h3>
              <p className="neuro-text-muted text-sm leading-7">{step.text}</p>
            </article>
          ))}
        </div>
      </Reveal>

      <Reveal as="section" id="courses" className="landing-pad py-12">
        <SectionTitle title="كورسات مقسمة على الصف" text="الكورسات المنشورة تظهر هنا. بعد التسجيل تقدر تشوف الخطط وتدفع." />
        <div className="landing-stagger grid gap-5 lg:grid-cols-3">
          {(catalog.length ? catalog : courses).map((course) => {
            const publishedCourse = 'id' in course ? course : null
            const prices = publishedCourse?.subscription_plans?.filter((item) => item.is_active).map((item) => item.price) ?? []
            const min = prices.length ? Math.min(...prices) : null
            return (
              <article key={publishedCourse?.id ?? course.title} className="neuro-raised-sm neuro-hover flex flex-col rounded-3xl p-6">
                <GraduationCap className="mb-4 h-8 w-8 text-violet-500" />
                <p className="text-sm neuro-accent">{publishedCourse?.grade ?? ('grade' in course ? course.grade : '')}</p>
                <h3 className="neuro-text mt-1 mb-4 text-2xl font-bold">{course.title}</h3>
                {publishedCourse ? (
                  <p className="neuro-text-muted mb-6 flex-1 text-sm leading-7">{publishedCourse.description}</p>
                ) : (
                  <ul className="neuro-text-muted mb-6 flex-1 space-y-2 text-sm">
                    {'points' in course
                      ? course.points.map((point) => (
                          <li key={point} className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 neuro-accent" />
                            {point}
                          </li>
                        ))
                      : null}
                  </ul>
                )}
                {min != null ? <p className="mb-4 text-sm font-bold neuro-accent">يبدأ من {formatMoney(min)}</p> : null}
                <Link to="/register">
                  <Button variant="raised" className="w-full">
                    سجّل عشان تشوف التفاصيل
                  </Button>
                </Link>
              </article>
            )
          })}
        </div>
      </Reveal>

      <Reveal as="section" id="experience" className="landing-pad py-12">
        <SectionTitle title="تجربة التعلم من جوّه" text="كل الأدوات اللي الطالب محتاجها في مكان واحد." />
        <div className="landing-stagger grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {experiences.map((item) => (
            <article key={item.title} className="neuro-pressed rounded-3xl p-6">
              <item.icon className="mb-3 h-7 w-7 neuro-accent" />
              <h3 className="neuro-text mb-2 font-bold">{item.title}</h3>
              <p className="neuro-text-muted text-sm leading-7">{item.text}</p>
            </article>
          ))}
        </div>
      </Reveal>

      <Reveal as="section" id="pricing" className="landing-pad py-12">
        <SectionTitle title="خطط الاشتراك" text="السعر النهائي يظهر مع كل كورس بعد النشر. الخطة بتتحدد من الأدمن." />
        <div className="landing-stagger grid gap-5 md:grid-cols-2">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={plan.featured ? 'neuro-raised rounded-3xl p-8' : 'neuro-raised-sm rounded-3xl p-8'}
            >
              <h3 className="neuro-text text-2xl font-extrabold">{plan.name}</h3>
              <p className="neuro-text-muted mt-3 leading-7">{plan.text}</p>
              <ul className="mt-6 space-y-3">
                {plan.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 neuro-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </Reveal>

      <Reveal as="section" id="voices" className="landing-pad py-12">
        <SectionTitle title="إيه اللي بتقدمه التجربة" text="كلام من نوع الاستخدام اللي المنصة متعملة عشانه." />
        <div className="landing-stagger grid gap-5 lg:grid-cols-3">
          {voices.map((item) => (
            <blockquote key={item.name} className="neuro-raised-sm rounded-3xl p-6">
              <p className="neuro-text leading-8">«{item.text}»</p>
              <footer className="neuro-text-muted mt-4 text-sm">{item.name}</footer>
            </blockquote>
          ))}
        </div>
      </Reveal>

      <Reveal as="section" id="faq" className="landing-pad py-12">
        <SectionTitle title="أسئلة متكررة" text="لو حاجة مش واضحة، الإجابات المختصرة هنا." />
        <div className="landing-stagger space-y-4">
          {faqs.map((item) => (
            <article key={item.q} className="neuro-raised-sm rounded-3xl p-6">
              <h3 className="neuro-text mb-2 flex items-center gap-2 font-bold">
                <HelpCircle className="h-5 w-5 neuro-accent" />
                {item.q}
              </h3>
              <p className="neuro-text-muted leading-7">{item.a}</p>
            </article>
          ))}
        </div>
      </Reveal>

      <Reveal as="section" className="landing-pad py-12">
        <div className="neuro-raised rounded-4xl px-6 py-12 text-center">
          <h2 className="neuro-text text-3xl font-extrabold md:text-4xl">جاهز تبدأ المسار؟</h2>
          <p className="neuro-text-muted mx-auto mt-3 max-w-xl leading-8">
            أنشئ حسابك بالإيميل، أكّده، وبعدها ادخل بالإيميل أو رقمك. الكورسات هتتفتح أول ما الأدمن ينشرها.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/register">
              <Button>إنشاء حساب طالب</Button>
            </Link>
            <Link to="/login">
              <Button variant="raised">عندك حساب؟ ادخل</Button>
            </Link>
          </div>
        </div>
      </Reveal>

      <PublicFooter />
    </div>
  )
}

function SectionTitle({ title, text }: { title: string; text: string }) {
  return (
    <div className="mb-8 max-w-2xl">
      <h2 className="neuro-text text-3xl font-extrabold">{title}</h2>
      <p className="neuro-text-muted mt-3 leading-8">{text}</p>
    </div>
  )
}

function Reveal({
  children,
  className,
  delay = 0,
  id,
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  delay?: number
  id?: string
  as?: 'div' | 'section'
}) {
  const ref = useRef<HTMLElement | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setShown(true)
        observer.disconnect()
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag
      id={id}
      ref={(node) => {
        ref.current = node
      }}
      className={cx(shown ? 'landing-reveal' : 'opacity-0', 'scroll-mt-28', className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  )
}
