import { Route,useNavigate,Router } from "react-router-dom";
import { useState,useEffect } from 'react';
import { useParams } from "react-router-dom";

export default function ExploreSteps(){
    const {id} = useParams();
    console.log(id);

    const [data,setData] = useState(null);

    useEffect(function(){

        async function fetchStep() {
            try{
                const res = await fetch(`http://127.0.0.1:8001/api/steps/?id=${id}`);
                console.log(res);
                if(!res.ok) throw Error(`HTTP ${res.status}`);
                const body = await res.json();
                
                setData(body);
            }catch(err){
                console.log("Error: ",err);
            }
            
        }
        fetchStep();
    },[id]);

    return (
        <p>{JSON.stringify(data, null, 2)}</p>
    )

}
