import { Wordmark } from '@/components/vantra/Primitives'
import s from '@/components/vantra/vantra.module.css'

export default function Loading() {
  return <div className={s.page}><div className={s.detailSkeleton} role="status"><Wordmark /><p className={s.muted}>Finding your next story…</p></div></div>
}
