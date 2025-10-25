import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [message, setMessage] = useState('Loading...');

  async function getMessage() {
    try{
      const res = await fetch('http://127.0.0.1:8001/api/view/');
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMessage(data["message"]);
    }
    catch (err){
      console.error('Failed:', err);
    }
  }
  useEffect(function(){
    getMessage();
  },[]);
  return (
    <div>
      <p>{message}</p>
    </div>
    
  )
}

function HomePage(){
  return (
    <div>
      <button id='explore_workflows'>Explore Workflows</button>
      <button id='create_workflow'>Create Workflow</button>
    </div>
  )
}

export default HomePage
