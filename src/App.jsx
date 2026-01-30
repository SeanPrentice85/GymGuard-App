import { useState, useEffect } from 'react'
import { Leaf } from 'lucide-react'
import DailyDashboard from './components/DailyDashboard'
import AddFoodForm from './components/AddFoodForm'
import FoodList from './components/FoodList'

// Keto Goals (Standard)
const DAILY_GOALS = {
  netCarbs: 20,
  fat: 130,
  protein: 100,
  calories: 1800
}

function App() {
  const [foods, setFoods] = useState(() => {
    const saved = localStorage.getItem('keto_foods_v1')
    return saved ? JSON.parse(saved) : []
  })

  // Persist to local storage
  useEffect(() => {
    localStorage.setItem('keto_foods_v1', JSON.stringify(foods))
  }, [foods])

  // Calculate totals
  const today = new Date().toDateString()
  const todaysFoods = foods.filter(f => new Date(f.timestamp).toDateString() === today)

  const totals = todaysFoods.reduce((acc, food) => ({
    netCarbs: acc.netCarbs + food.netCarbs,
    fat: acc.fat + food.fat,
    protein: acc.protein + food.protein,
    calories: acc.calories + food.calories
  }), { netCarbs: 0, fat: 0, protein: 0, calories: 0 })

  const addFood = (food) => {
    setFoods([food, ...foods])
  }

  const deleteFood = (id) => {
    setFoods(foods.filter(f => f.id !== id))
  }

  return (
    <div className="container">
      <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Leaf color="var(--color-primary)" size={32} />
          <h1 style={{ marginBottom: 0 }}>KetoTrack</h1>
        </div>
        <p style={{ color: 'var(--color-text-muted)' }}>Stay in ketosis, one meal at a time.</p>
      </header>

      <main>
        <DailyDashboard macros={totals} goals={DAILY_GOALS} />
        
        <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
          <AddFoodForm onAdd={addFood} />
          <FoodList foods={todaysFoods} onDelete={deleteFood} />
        </div>
      </main>
      
      <footer style={{ marginTop: '4rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
        <p>© 2026 KetoTrack. Stay Salty.</p>
      </footer>
    </div>
  )
}

export default App
