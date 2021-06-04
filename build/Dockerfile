FROM node:lts-alpine
LABEL maintainer="andreas.hafner@isg-stuttgart.de"

# Add dependencies
ADD package.json /package.json

# install npm dependencies and tools
RUN npm install -g vsce typescript 
RUN npm install

CMD /bin/sh