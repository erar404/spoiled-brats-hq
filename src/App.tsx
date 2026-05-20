import {
  IonApp, IonIcon, IonLabel,
  IonRouterOutlet, IonSpinner, IonTabBar, IonTabButton, IonTabs,
  createAnimation, setupIonicReact,
} from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { cafeOutline, homeOutline, musicalNotesOutline, personCircleOutline, shieldOutline } from 'ionicons/icons'
import { Redirect, Route } from 'react-router-dom'

import { AuthProvider, useAuth } from './context/AuthContext'
import { DarkModeProvider } from './context/DarkModeContext'
import AccountPage from './pages/AccountPage'
import AdminPage from './pages/AdminPage'
import CafePage from './pages/CafePage'
import HomePage from './pages/HomePage'
import StudioPage from './pages/StudioPage'

/* Ionic core CSS */
import '@ionic/react/css/core.css'
import '@ionic/react/css/normalize.css'
import '@ionic/react/css/structure.css'
import '@ionic/react/css/typography.css'
import '@ionic/react/css/padding.css'
import '@ionic/react/css/float-elements.css'
import '@ionic/react/css/text-alignment.css'
import '@ionic/react/css/text-transformation.css'
import '@ionic/react/css/flex-utils.css'
import '@ionic/react/css/display.css'

/* Acoustic Brew theme */
import './theme/variables.css'
import './theme/dark.css'

// Custom page transition: smooth fade-up slide
const pageTransition = (baseEl: HTMLElement, opts: { enteringEl: HTMLElement; leavingEl: HTMLElement }) => {
  const enter = createAnimation()
    .addElement(opts.enteringEl)
    .duration(300)
    .easing('cubic-bezier(0.22, 1, 0.36, 1)')
    .fromTo('opacity', '0', '1')
    .fromTo('transform', 'translateY(16px)', 'translateY(0px)')

  const leave = createAnimation()
    .addElement(opts.leavingEl)
    .duration(180)
    .easing('ease-out')
    .fromTo('opacity', '1', '0')
    .fromTo('transform', 'translateY(0px)', 'translateY(-8px)')

  return createAnimation().addAnimation([enter, leave])
}

setupIonicReact({ mode: 'md', navAnimation: pageTransition as any })

function AppTabs() {
  const { isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100vh', gap: 24,
        background: '#fff8f8',
      }}>
        <img src="/cafe-logo-transparent.png" alt="Spoiled Brats HQ"
          style={{ height: 80, width: 'auto', objectFit: 'contain' }} />
        <IonSpinner name="crescent" color="primary" style={{ width: 32, height: 32 }} />
      </div>
    )
  }

  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path="/home" component={HomePage} />
        <Route exact path="/cafe" component={CafePage} />
        <Route exact path="/studio" component={StudioPage} />
        <Route exact path="/account" component={AccountPage} />
        <Route exact path="/admin" component={AdminPage} />
        <Route exact path="/">
          <Redirect to="/home" />
        </Route>
      </IonRouterOutlet>

      <IonTabBar slot="bottom">
        <IonTabButton tab="home" href="/home">
          <IonIcon icon={homeOutline} />
          <IonLabel>Home</IonLabel>
        </IonTabButton>
        <IonTabButton tab="cafe" href="/cafe">
          <IonIcon icon={cafeOutline} />
          <IonLabel>Cafe</IonLabel>
        </IonTabButton>
        <IonTabButton tab="studio" href="/studio">
          <IonIcon icon={musicalNotesOutline} />
          <IonLabel>Studio</IonLabel>
        </IonTabButton>

        {/* Admin tab (only visible to admins) */}
        {isAdmin && (
          <IonTabButton tab="admin" href="/admin">
            <IonIcon icon={shieldOutline} />
            <IonLabel>Admin</IonLabel>
          </IonTabButton>
        )}

        {/* Account — rightmost */}
        <IonTabButton tab="account" href="/account">
          <IonIcon icon={personCircleOutline} />
          <IonLabel>Account</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  )
}

export default function App() {
  return (
    <IonApp>
      <DarkModeProvider>
        <AuthProvider>
          <IonReactRouter>
            <AppTabs />
          </IonReactRouter>
        </AuthProvider>
      </DarkModeProvider>
    </IonApp>
  )
}
