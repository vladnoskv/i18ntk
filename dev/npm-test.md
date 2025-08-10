$tarball = npm pack mkdir 
test-i18ntk7; cd test-i18ntk7 
npm init -y 
npm i ..$tarball 
npx i18ntk --help 
node -e "console.log(require.resolve('i18ntk/ui-locales/en.json'))"