from collections import deque, defaultdict

def get_levelwise_steps(steps:list[dict]): 
        indeg = {}
        for step in steps:
            indeg[step["id"]] = 0
        steps_dict = {}
        for step in steps:
            steps_dict[step["id"]] = step
            for dep_id in step["depends_on"]:
                indeg[dep_id]+=1
        q = deque()
        for step in steps:
            if indeg[step["id"]]==0:
                q.append(step["id"])
        levels = []
        visited = 0
        while q:
            l = len(q)
            lis = []
            for _ in range(l):
                curr_step_id = q.popleft()
                lis.append(steps_dict[curr_step_id])
                visited+=1
                for dep_id in steps_dict[curr_step_id]["depends_on"]:
                    indeg[dep_id]-=1
                    if indeg[dep_id]==0:
                        q.append(dep_id)
                
            levels.append({"id":len(levels),"steps":lis})
        
        if visited!=len(steps):
            raise ValueError("Cycle detected in workflow")
        
        return reversed(levels)
