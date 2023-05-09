npm ci
npx webpack --mode=production

cp index.html dist/
cp new.json dist/
mkdir -p dist/dist/
mv dist/bundle.js dist/dist/bundle.js

