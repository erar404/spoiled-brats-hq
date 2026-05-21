import { useEffect, useState } from 'react'
import { IonModal } from '@ionic/react'

interface AppModalProps {
  isOpen: boolean
  onDidDismiss: () => void
  children?: React.ReactNode
  className?: string
  /** Sheet breakpoints — used on mobile only, ignored on desktop */
  breakpoints?: number[]
  /** Initial sheet breakpoint — used on mobile only */
  initialBreakpoint?: number
}

/**
 * Responsive modal wrapper.
 * • Mobile (< 768px): renders as a bottom sheet using the provided breakpoints.
 * • Desktop (≥ 768px): renders as a centered dialog — breakpoints are removed so
 *   Ionic does not apply the sheet translateY math that puts the modal off-screen.
 */
export default function AppModal({
  isOpen,
  onDidDismiss,
  children,
  className,
  breakpoints = [0, 0.6, 0.95],
  initialBreakpoint = 0.92,
}: AppModalProps) {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 768
  )

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onDidDismiss}
      className={className}
      breakpoints={isDesktop ? undefined : breakpoints}
      initialBreakpoint={isDesktop ? undefined : initialBreakpoint}
    >
      {children}
    </IonModal>
  )
}
