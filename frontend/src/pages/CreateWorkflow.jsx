function CreateWorkflow(){
    
   return ( 
    <div>
        <p>Hello1</p>
        <form action="/hleo" method="POST">
            <label htmlFor="name">Please Enter Name</label>
            <input type="text" name="Name" id="" />
            <button type="submit">Submit</button>
        </form>
    </div>
   );
}
export default CreateWorkflow;