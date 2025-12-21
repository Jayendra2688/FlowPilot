import { Route,Routes,useNavigate } from 'react-router-dom'

function HomePage(){
    const navigate = useNavigate();
    return (
        <div className="page-style">
        <div className="home-page">
            <div>
            <h1 className='main-header'>FlowPilot</h1>
            </div>
            <p className='text-xl text-gray-500 mb-6'>
                Workflow Management
            </p>
            <div className='flex justify-center gap-4'>
            <div className='btn-primary' onClick={() => navigate('/workflows')}>
                Explore Workflow
            </div>
            <div className='btn-primary' onClick={() => navigate('/create')}>
                Create Workflow
            </div>
            </div>
        </div>
        </div>
    )

}

export default HomePage;