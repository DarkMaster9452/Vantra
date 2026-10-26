import type { ReactNode } from 'react'

export default function Template({ children }: { children: ReactNode }) {
  return <div className="route-enter" style={{ minHeight: '100vh' }}>{children}</div>
}
