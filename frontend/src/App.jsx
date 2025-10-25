import { useEffect, useState } from 'react'

import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Route,Routes,useNavigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ExploreWorkflow from './pages/ExploreWorkflow'

function App() {
  return (
    <div className="app-container">
      <Routes>
      <Route path='/' element={<HomePage/>}/>
      <Route path='/explore' element={<ExploreWorkflow/>}></Route>
    
      </Routes>
    
    </div>
  )
}

export default App
