import { IonSkeletonText } from '@ionic/react'

const s = (w: string, h: number, extra?: React.CSSProperties): React.CSSProperties => ({
  width: w, height: h, borderRadius: 6, margin: 0, display: 'block', ...extra,
})

function CardRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display:'flex', gap:12, background:'#ffffff', borderRadius:12,
      padding:'14px 16px', boxShadow:'0 2px 10px rgba(45,19,32,0.05)',
    }}>
      {children}
    </div>
  )
}

export function BookingCardSkeleton() {
  return (
    <CardRow>
      <IonSkeletonText animated style={s('40px', 40, { borderRadius: '50%', flexShrink: 0 })} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}>
        <IonSkeletonText animated style={s('55%', 14)} />
        <IonSkeletonText animated style={s('75%', 11)} />
      </div>
      <IonSkeletonText animated style={s('68px', 22, { borderRadius: 999, alignSelf:'center' })} />
    </CardRow>
  )
}

export function BookingListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {Array.from({ length: count }, (_, i) => <BookingCardSkeleton key={i} />)}
    </div>
  )
}

export function UserListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {Array.from({ length: count }, (_, i) => (
        <CardRow key={i}>
          <IonSkeletonText animated style={s('44px', 44, { borderRadius:'50%', flexShrink:0 })} />
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}>
            <IonSkeletonText animated style={s('45%', 14)} />
            <IonSkeletonText animated style={s('65%', 11)} />
          </div>
          <IonSkeletonText animated style={s('56px', 22, { borderRadius:999, alignSelf:'center' })} />
        </CardRow>
      ))}
    </div>
  )
}

export function MenuGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px,1fr))', gap:12 }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ background:'#fff', borderRadius:12, overflow:'hidden', boxShadow:'0 2px 10px rgba(45,19,32,0.06)' }}>
          <IonSkeletonText animated style={{ width:'100%', height:110, borderRadius:0, margin:0, display:'block' }} />
          <div style={{ padding:'10px 12px', display:'flex', flexDirection:'column', gap:8 }}>
            <IonSkeletonText animated style={s('70%', 13)} />
            <IonSkeletonText animated style={s('40%', 11)} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function MyBookingsSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:12, background:'#fff', borderRadius:12, padding:16, boxShadow:'0 2px 12px rgba(45,19,32,0.06)' }}>
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}>
            <IonSkeletonText animated style={s('60%', 14)} />
            <IonSkeletonText animated style={s('80%', 11)} />
          </div>
          <IonSkeletonText animated style={s('68px', 22, { borderRadius:999 })} />
        </div>
      ))}
    </div>
  )
}
