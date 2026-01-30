import { useState, useEffect } from 'react'
import { PlusCircle, Calculator } from 'lucide-react'

export default function AddFoodForm({ onAdd }) {
  const [formData, setFormData] = useState({
    name: '',
    calories: '',
    carbs: '',
    fiber: '',
    protein: '',
    fat: ''
  })

  // Calculate net carbs for display
  const netCarbs = Math.max(0, (parseFloat(formData.carbs) || 0) - (parseFloat(formData.fiber) || 0))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name) return

    onAdd({
      id: Date.now(),
      name: formData.name,
      calories: parseInt(formData.calories) || 0,
      carbs: parseFloat(formData.carbs) || 0,
      fiber: parseFloat(formData.fiber) || 0,
      netCarbs: netCarbs, // calculated field
      protein: parseFloat(formData.protein) || 0,
      fat: parseFloat(formData.fat) || 0,
      timestamp: new Date().toISOString()
    })

    // Reset form
    setFormData({
      name: '',
      calories: '',
      carbs: '',
      fiber: '',
      protein: '',
      fat: ''
    })
  }

  return (
    <div className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
      <h3 className="section-title">
        <span>Log Meal</span> 
        <span style={{ fontSize: '0.9rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
           <Calculator size={14}/> Est. Net Carbs: {netCarbs}g
        </span>
      </h3>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 'var(--spacing-md)' }}>
          <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: '500' }}>Food Name</label>
          <input 
            type="text" 
            placeholder="e.g., Avocado Toast" 
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: '0.9rem' }}>Fat (g)</label>
            <input 
              type="number" 
              placeholder="0" 
              value={formData.fat}
              onChange={e => setFormData({...formData, fat: e.target.value})}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: '0.9rem' }}>Protein (g)</label>
            <input 
              type="number" 
              placeholder="0" 
              value={formData.protein}
              onChange={e => setFormData({...formData, protein: e.target.value})}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: '0.9rem' }}>Total Carbs (g)</label>
            <input 
              type="number" 
              placeholder="0" 
              value={formData.carbs}
              onChange={e => setFormData({...formData, carbs: e.target.value})}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: '0.9rem' }}>Fiber (g)</label>
            <input 
              type="number" 
              placeholder="0" 
              value={formData.fiber}
              onChange={e => setFormData({...formData, fiber: e.target.value})}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Subtracts from Total Carbs
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
             <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: '0.9rem' }}>Calories</label>
            <input 
              type="number" 
              placeholder="0" 
              value={formData.calories}
              onChange={e => setFormData({...formData, calories: e.target.value})}
            />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
          <PlusCircle size={20} /> Add to Log
        </button>
      </form>
    </div>
  )
}
