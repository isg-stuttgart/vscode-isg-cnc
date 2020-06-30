FROM node:lts-alpine
LABEL maintainer="andreas.hafner@isg-stuttgart.de"

RUN npm install -g vsce typescript 
RUN npm install

CMD /bin/bash