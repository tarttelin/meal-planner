import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './components/Layout/AppLayout'
import WeekView from './components/Calendar/WeekView'
import RecipeList from './components/Recipes/RecipeList'
import RecipeDetail from './components/Recipes/RecipeDetail'
import RecipeEditor from './components/Recipes/RecipeEditor'
import ShoppingList from './components/Shopping/ShoppingList'
import PantryList from './components/Pantry/PantryList'
import DailyLog from './components/DailyLog/DailyLog'
import ProfileManager from './components/Profiles/ProfileManager'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<WeekView />} />
          <Route path="/recipes" element={<RecipeList />} />
          <Route path="/recipes/new" element={<RecipeEditor />} />
          <Route path="/recipes/:id" element={<RecipeDetail />} />
          <Route path="/recipes/:id/edit" element={<RecipeEditor />} />
          <Route path="/shopping" element={<ShoppingList />} />
          <Route path="/pantry" element={<PantryList />} />
          <Route path="/log" element={<DailyLog />} />
          <Route path="/profiles" element={<ProfileManager />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
