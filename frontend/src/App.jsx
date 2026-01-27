import { useEffect, useState } from 'react'

import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Route,Routes,useNavigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ExploreWorkflows from './pages/ExploreWorkflows'
import ExploreSteps from './pages/ExploreSteps'
import DisplaySteps from './ReactPractive'
import Demo from './pages/Demo';
import CreateWorkflow from './pages/CreateWorkflow';
function App() {
  return (
    <div className="app-container">
      <Routes>
        <Route path='/' element={<HomePage/>}/>
        <Route path='/workflows' element={<ExploreWorkflows/>}></Route>
        <Route path='/steps/:workflow_id' element={<ExploreSteps/>}></Route>
        <Route path='/create' element={<CreateWorkflow/>}></Route>
      </Routes>
      {/* <Demo/> */}
    
    </div>
  )
  // return <DisplaySteps/>;
}

export default App
