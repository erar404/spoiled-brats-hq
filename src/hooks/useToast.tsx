import { useCallback, useState } from 'react'
import { IonToast } from '@ionic/react'

type ToastColor = 'success' | 'danger' | 'warning' | 'medium'

interface ToastState {
  message: string
  color: ToastColor
  isOpen: boolean
}

export function useToast() {
  const [state, setState] = useState<ToastState>({ message: '', color: 'success', isOpen: false })

  const toast = useCallback((message: string, color: ToastColor = 'success') => {
    setState({ message, color, isOpen: true })
  }, [])

  const ToastEl = (
    <IonToast
      isOpen={state.isOpen}
      message={state.message}
      color={state.color}
      duration={3000}
      position="top"
      onDidDismiss={() => setState(s => ({ ...s, isOpen: false }))}
    />
  )

  return { toast, ToastEl }
}
