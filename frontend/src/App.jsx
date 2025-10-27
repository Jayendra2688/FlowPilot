import { useEffect, useState } from 'react'

import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Route,Routes,useNavigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ExploreWorkflows from './pages/ExploreWorkflows'
import ExploreSteps from './pages/ExploreSteps'

function App() {
  return (
    <div className="app-container">
      <Routes>
      <Route path='/' element={<HomePage/>}/>
      <Route path='/workflows' element={<ExploreWorkflows/>}></Route>
      <Route path='/steps/:id' element={<ExploreSteps/>}></Route>
    
      </Routes>
    
    </div>
  )
}

export default App
