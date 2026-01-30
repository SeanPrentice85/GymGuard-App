import { Zap, Droplet, Beef } from 'lucide-react'

// Helper to calculate percentage
const getPercent = (cond, total) => {
  if (total === 0) return 0
  return Math.min(100, Math.round((cond / total) * 100))
}

export default function DailyDashboard({ macros, goals }) {
  // macros = { netCarbs, fat, protein, calories }
  // goals = { netCarbs: 20, fat: 120, protein: 80, calories: 2000 }

  const carbsPercent = getPercent(macros.netCarbs, goals.netCarbs)
  const fatPercent = getPercent(macros.fat, goals.fat)
  const proteinPercent = getPercent(macros.protein, goals.protein)

  return (
    <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
      <header style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>
        <h2 style={{ fontSize: '1rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Net Carbs Remaining
        </h2>
        <div style={{ 
          fontSize: '4rem', 
          fontWeight: '900', 
          lineHeight: '1',
          color: macros.netCarbs > goals.netCarbs ? 'var(--color-danger)' : 'var(--color-net-carbs)'
        }}>
          {Math.max(0, goals.netCarbs - macros.netCarbs)}g
        </div>
        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          / {goals.netCarbs}g Daily Limit
        </div>
      </header>

      <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
        {/* Fat Progress */}
        <div className="macro-row">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', color: 'var(--color-text)' }}>
              <Droplet size={16} color="var(--color-fat)" fill="var(--color-fat)" /> Fat
            </span>
            <span style={{ color: 'var(--color-text-muted)' }}>{macros.fat} / {goals.fat}g</span>
          </div>
          <div style={{ height: '8px', background: '#eee', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
            <div style={{ 
              width: `${fatPercent}%`, 
              height: '100%', 
              background: 'var(--color-fat)',
              borderRadius: 'var(--radius-full)',
              transition: 'width 0.5s ease-out'
            }} />
          </div>
        </div>

        {/* Protein Progress */}
        <div className="macro-row">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', color: 'var(--color-text)' }}>
              <Beef size={16} color="var(--color-protein)" /> Protein
            </span>
            <span style={{ color: 'var(--color-text-muted)' }}>{macros.protein} / {goals.protein}g</span>
          </div>
          <div style={{ height: '8px', background: '#eee', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
            <div style={{ 
              width: `${proteinPercent}%`, 
              height: '100%', 
              background: 'var(--color-protein)',
              borderRadius: 'var(--radius-full)',
              transition: 'width 0.5s ease-out'
            }} />
          </div>
        </div>

        {/* Calories (optional small display) */}
        <div style={{ textAlign: 'center', marginTop: 'var(--spacing-sm)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          <Zap size={12} color="orange" style={{ verticalAlign: 'middle', marginRight: '4px' }} />
          {macros.calories} / {goals.calories} kcal consumed
        </div>
      </div>
    </div>
  )
}
