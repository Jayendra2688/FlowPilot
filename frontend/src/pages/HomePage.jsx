import { Route,Routes,useNavigate } from 'react-router-dom'

function HomePage(){
    const navigate = useNavigate();
    return (
        <div className="home-page">
            <h1>FlowPilot</h1>
            <p>Workflow Management</p>
            <button className="explore-workflow" onClick={() => navigate('/explore')}>
                Explore Workflow
            </button>
            <button className="create-workflow" onClick={() => navigate('/create')}>
                Create Workflow
            </button>
        </div>
    )

}

export default HomePage;