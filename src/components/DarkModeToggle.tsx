import { IonButton, IonIcon } from '@ionic/react'
import { cafe, cafeOutline } from 'ionicons/icons'
import { useDarkMode } from '../context/DarkModeContext'

export default function DarkModeToggle() {
  const { isDark, toggle } = useDarkMode()
  return (
    <IonButton
      fill="clear"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{ '--padding-start': '8px', '--padding-end': '8px' } as React.CSSProperties}
    >
      <IonIcon
        slot="icon-only"
        icon={isDark ? cafe : cafeOutline}
        style={{ fontSize: 22 }}
        aria-hidden="true"
      />
    </IonButton>
  )
}
