import { useGetOverviewQuery } from '@/store/api/adminApi'

export function OverviewPage() {
  const { data } = useGetOverviewQuery()

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'الطلاب', value: data?.students ?? '—' },
          { label: 'الكورسات', value: data?.courses ?? '—' },
          { label: 'اشتراكات سارية', value: data?.subscriptions ?? '—' },
          { label: 'مدفوعات قيد المراجعة', value: data?.pending ?? '—' },
        ].map((card) => (
          <article key={card.label} className="neuro-raised-sm rounded-3xl p-5">
            <p className="neuro-text-muted text-sm">{card.label}</p>
            <p className="neuro-text mt-2 text-3xl font-extrabold">{card.value}</p>
          </article>
        ))}
      </div>
      <div className="neuro-raised-sm rounded-3xl p-6">
        <h3 className="neuro-text text-xl font-bold">حلقة العمل</h3>
        <p className="neuro-text-muted mt-3 leading-8">
          أنشئ كورس، أضف شهر ودرس، اربط فيديو يوتيوب أو ارفعه، ارفع PDF، فعّل المحرر والواجب، انشر، وبعدها اعتمد دفع الطالب.
        </p>
      </div>
    </div>
  )
}
