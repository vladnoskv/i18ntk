$tarball = npm pack
mkdir test-i18ntk2; cd test-i18ntk2
npm init -y
npm i ..\$tarball
npx i18ntk --help
node -e "console.log(require.resolve('i18ntk/ui-locales/en.json'))"
node -e "console.log(require.resolve('i18ntk/ui-locales/ru.json'))"
node -e "console.log(require.resolve('i18ntk/ui-locales/zh.json'))"
node -e "console.log(require.resolve('i18ntk/ui-locales/ja.json'))"
node -e "console.log(require.resolve('i18ntk/ui-locales/es.json'))"
node -e "console.log(require.resolve('i18ntk/ui-locales/de.json'))"
node -e "console.log(require.resolve('i18ntk/ui-locales/fr.json'))"

## Change mkdir to test-i18ntk5;cd test-i18ntk5 etc per version
