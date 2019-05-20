#!/usr/bin/env bash
DEPENDENCIES=(webpack
              webpack-cli
              webpack-dev-server
              style-loader
              css-loader
              lit-element
	      ramda)

echo "initializing npm..."
npm init -y

echo "installing dependencies"
for f in "${DEPENDENCIES[@]}"
do
    echo "Installing ${f}"
    npm install "${f}"
done

echo "initializing git..."
git init

echo "creating .gitignore"
echo "node_modules" >> .gitignore

mkdir src dist
