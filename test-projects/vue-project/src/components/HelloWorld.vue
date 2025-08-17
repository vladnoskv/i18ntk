<template>
  <div class="hello">
    <h1>{{ $t('welcome.title') }}</h1>
    <p>{{ $t('welcome.description') }}</p>
    <button v-t="'buttons.submit'"></button>
  </div>
</template>

<script>
import { useI18n } from 'vue-i18n'

export default {
  name: 'HelloWorld',
  setup() {
    const { t } = useI18n()
    
    const submitForm = () => {
      alert(t('messages.formSubmitted'))
    }
    
    return {
      t,
      submitForm
    }
  }
}
</script>