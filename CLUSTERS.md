# Docker
- Building encapsulated version of program to be ran on some other hardware.
- Idea is that you can create more instances if theres many users.
- You can host on multiple machines (nodes) to ensure uptime

# Cluster
- A cluster takes care of all the networking, storage, and is a group of containers.

# Container
- You will be building a container which will have all its dependencies, files, etc
- Will have its own mini OS, quite similar to a vm.
- Will be packaged such that it can be recreated on a (the VT) cluster.

# Dockerization
- One container should run backend
- One container runs frontend
- One container runs database
- They should not be in the same file structure.
- Separate backend, frontend, db, folders (or however many are necessary)

- Once you have something that can run, you can containerize it.
- You need to ensure that things work, so sooner is better so steps are smaller with more iterations.

- Create a DOCKERFILE 
- This will tell docker how to build the container

```dockerfile
# Choose a base image (for this instance, the node source)
# These are found on dockerhub, the goto source for prebuilt containers
# https://docker.hub.com
# When possible, go w the docker official image.
# Ideally you should go with the alpine tag when possible. He didn't explain why. Tags are the various versions of dockers.
FROM node:lts-alpine

# Choose a working directory
WORKDIR /app

#copy deps
COPY package.json /app

# Install packages
RUN npm install

# Copy rest of app
COPY . /app

# Run the server
CMD ["node", "app.js"]
```

You can also have a dockerfile where you build with npm, then use nginx to run it (which is apparently more secure)

repository -> deploy -> container registry
this will then give you the commands you need.

https://git.cs.vt.edu/anonymous/capsp26-coe-pdf-extraction-team-e-zspot/container_registry

1. Login: `docker login container.cs.vt.edu`
2. Build: `docker build -t container.cs.vt.edu/anonymous/capsp26-coe-pdf-extraction-team-e-zspot/name:v0.0 .`
    a. Note here, that the / gives you versioning, then the colon and v give you tags
    b. You can add `--platform linux/amd64` if ur mac, but thats not our issue
3. Push `docker push container.cs.vt.edu/anonymous/capsp26-coe-pdf-extraction-team-e-zspot/name:v0.0`
    a. same command, you just replace build with push. (and remove the period.)

This will then give you the container and you can copy the path from the same page from earlier.

(You must build and push the frontend, backend, and db seperately.)
(And this can take a long time sometimes (if it takes hella long you can build it on rlogin.))

- Now that it's online, you go to https://launch.cs.vt.edu to actually deploy it.
- Well theres a cli im pretty sure but whatever just use the webpage

- Go to discovery
- Go to projects/namespaces
- Create project
- Ensure project name is unique. 
    - Suggestion is to put the "CRN and S26 (spring 26) - team name"
    - DO NOT ADD TEAM MEMBERS ITS GLITCHED
- Click edit config
- NOW you can add your team members.
    - Team members must login once for an account to be created before they'll show up as added
- Next create a namespace
    - cannot have capital letters, nor underscores
    - just copy the project name and modify it
    - this is where your resources are pooled together. 
    - Everything that needs to communicate w each other should be in the same namespace.
        - If you want to, you can put separate stuff in diff namespaces to ensure they build correctly, but for interaction they must be in the same
- Now go to workloads, this is where you deploy containers
    - Click create
    - Click deployment
    - Fill out all the stuff 
        - One issue, repository is private.
        - Create an access token in the repository
        - Assign july 1 expiration date
        - Give maintainer or owner
        - needs to be able to read_registry
    - Go back, now to storage
    - Secrets
    - Create registry secret.
        - Custom
        - (registry domain name) = container.cs.vt.edu
        - username is the access token key
        - password is the access token value
    - Go to workloads
    - Create
    - Deployment
    - Name it something simple
    - Go back to gitlab
    - Deploy -> container registry
    - Copy image path
    - Set your pull secret to the token you made earlier
    - Create a Cluster IP (exposes image internally so you can communicate more easily between (in most cases, db, and backend))
    - Port 80 is default for nginx but you'll know what to set
    - Set environment variables if you need them
    - Hit create
    - It'll take some time, but it'll start booting up.
    - If it doesn't work, click it, click the pod (running instance), click recent events, and it'll tell you what its complaining about.
    - If you need to fix something, scale it down (to 0), then scale it up.
        - You need to build, push, scale down, wait for it to terminate all, scale up.
        - This is how you send out updated code.
        - You can also view logs and it will tell you whats up.
- NOW THAT ITS RUNNING
- time to eexpose it
- Service Discovery
- Ingress -> Create
    - name: ingress
    - request host -> same name as namespace with -> .discovery.cs.vt.edu
    - ccreate path (prefix/frontend) port whatever
    - create
    - Now you should be able to access your project.

- Just a frontend
- If you want a backend, you'd have to deploy it.
- Add it to the ingress as a separate path (most of the time /api)
- If you want a database, you do it a bit differently
- deployment -> create
- name it mysql
- use the default mysql image (from dockerhub) (remember to use docker official image)
- no pull secret necessary, its public
- networking cluster ip, name it mysql, by default port is 3306 most of the time.
    - add environment variables to set it up
    - has a fat list on dockerhub on all the ones it needs
    - like
    - `ROOT_PASSWORD` - pass
    - `MYSQL_DATABASE` - name
    - `MYSQL_USER` - user to interact w database (don't give system root access)
- then just create
- scale project down when you are not actively using resources and don't let project loop crash.
- execute shell lets you access the command line for your container
- Once its scaled down, everything is gone.
    - So, you need to mount a sep directory each time it loads
    - Edit config
    - Pod
    - Storage
    - Add volume
    - Create Persistent Volume Claim
    - Name it mysql-pvc
    - give capacity of 5
    - Single-node read/write
- Go back to container itself
    - storage
    - select persistent volume claim
    - mount it.
    - at `/var/lib/mysql` (this is on the dockerhub)
    - no subpath necessary in this case
    - save
- make it more secure too
- go to storage
- secrets
    - make an opaque secret
    - 4 keys
    - k,v
    - database, database
    - root_password, toor (or yours)
    - username, user (or yours)
    - password, password (or yours)
    - name it db-credentials
    - create
- Workloads
    - edit config
    - scroll down to environment variables
    - switch type to secret key
    - keep variable name
    - choose secret
    - choose key.
    - repeat for all.
    - save
    - remember to scale down and up to reflect changes
- once again now you can interact with it
- `mysql -u user -p`
- enter password
- then you can do all your actions like making tables
- database is inaccessible outside of cluster
- it won't let you attach it to an ingress.
- Instead, use a deployment
- create deployment
    - named adminer
    - networking name adminer, port 8080
    - this is a widely available dockerhub
- add adminer to your ingress
- prefix /db target service adminer port 8080
- gives you a tool accessible via frontend
    - system `mysql`
    - server is the server name
    - username is username
    - password is password
- discovery is restricted to on-campus internet
    - solution, add annotation to your ingress
    - on site it has info about this
    - set whitelist key
    - value 0.0.0.0/0,::/0
    - OR use university vpn
    - but the ingress one is most likely what you want.
- All covered in `docker-example.discovery.cs.vt.edu`
- it lowkey actually has everything written even better than i got
- imma lowkey download that to the repo maybe just to have a copy
- if you read through the whole thing and still have issues, the speaker's email is at the bottom.