$tarball = npm pack
mkdir test-i18ntk5; cd test-i18ntk5
npm init -y
npm i ..\$tarball
npx i18ntk --help
node -e "console.log(require.resolve('i18ntk/ui-locales/en.json'))"

Change mkdir to test-i18ntk5;cd test-i18ntk5 etc per version
