import {
  IonApp, IonIcon, IonLabel,
  IonRouterOutlet, IonTabBar, IonTabButton, IonTabs,
  setupIonicReact,
} from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { cafeOutline, musicalNotesOutline, personCircleOutline, shieldOutline } from 'ionicons/icons'
import { Redirect, Route } from 'react-router-dom'

import { AuthProvider, useAuth } from './context/AuthContext'
import AccountPage from './pages/AccountPage'
import AdminPage from './pages/AdminPage'
import CafePage from './pages/CafePage'
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

setupIonicReact({ mode: 'md' })

function AppTabs() {
  const { isAdmin } = useAuth()

  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path="/cafe" component={CafePage} />
        <Route exact path="/studio" component={StudioPage} />
        <Route exact path="/account" component={AccountPage} />
        <Route exact path="/admin" component={AdminPage} />
        <Route exact path="/">
          <Redirect to="/cafe" />
        </Route>
      </IonRouterOutlet>

      <IonTabBar slot="bottom">
        {/* Left tabs */}
        <IonTabButton tab="cafe" href="/cafe">
          <IonIcon icon={cafeOutline} />
          <IonLabel>Cafe</IonLabel>
        </IonTabButton>
        <IonTabButton tab="studio" href="/studio">
          <IonIcon icon={musicalNotesOutline} />
          <IonLabel>Studio</IonLabel>
        </IonTabButton>

        {/* Spacer pushes remaining tabs right */}
        <IonTabButton tab="spacer" disabled style={{ flex: 1, pointerEvents: 'none' }} />

        {/* Admin tab (only visible to admins) */}
        {isAdmin && (
          <IonTabButton tab="admin" href="/admin">
            <IonIcon icon={shieldOutline} />
            <IonLabel>Admin</IonLabel>
          </IonTabButton>
        )}

        {/* Right: Account */}
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
      <AuthProvider>
        <IonReactRouter>
          <AppTabs />
        </IonReactRouter>
      </AuthProvider>
    </IonApp>
  )
}
