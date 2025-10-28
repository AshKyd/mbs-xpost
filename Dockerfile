# First stage: build
FROM node:22-alpine AS build
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --production
COPY . .
# Second stage: run
FROM node:22-alpine
WORKDIR /usr/src/app
COPY --from=build /usr/src/app .
ARG PASSWORD
ARG SERVER_PASSWORD
ARG SERVER_NAME
ARG CLIENT_NAME
ARG SERVER_GAME_TYPE
CMD ["npm", "start"]