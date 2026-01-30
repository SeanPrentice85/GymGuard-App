import { Trash2 } from 'lucide-react'

export default function FoodList({ foods, onDelete }) {
  if (foods.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        No meals logged today. Start by adding some food!
      </div>
    )
  }

  return (
    <div className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
      <h3 className="section-title">Today's Entries</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
        {foods.map(food => (
          <div key={food.id} style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            paddingBottom: 'var(--spacing-md)',
            borderBottom: '1px solid var(--color-border)'
          }}>
            <div>
              <div style={{ fontWeight: '600' }}>{food.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', gap: '8px', marginTop: '4px' }}>
                <span style={{ color: 'var(--color-text)' }}>{food.calories} kcal</span>
                <span style={{ color: 'var(--color-net-carbs)' }}>• {food.netCarbs}g Net C</span>
                <span style={{ color: 'var(--color-protein)' }}>• {food.protein}g P</span>
                <span style={{ color: 'var(--color-fat)' }}>• {food.fat}g F</span>
              </div>
            </div>
            
            <button 
              onClick={() => onDelete(food.id)}
              className="btn btn-icon"
              style={{ color: 'var(--color-text-muted)' }}
              aria-label="Delete entry"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
