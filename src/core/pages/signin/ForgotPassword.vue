<template>
  <div>
    <compani-header />
    <div class="row justify-center q-layout-padding client-background page-container">
      <div class="col-md-6 col-xs-12">
        <div class="q-mb-lg message">
          Nous allons vous envoyer un email pour réinitialiser votre mot de passe.
          Veuillez renseigner votre adresse email.
        </div>
        <ni-input caption="Email" :error="v$.email.$error" :model-value="email" @blur="v$.email.$touch"
          error-message="Veuillez rentrer un email valide. (ex: mail@mail.com)" required-field
          @update:model-value="$event => email = $event.trim()" />
        <div class="row justify-center">
          <q-btn class="btn-submit" @click="submit" color="primary" :disable="v$.email.$invalid" big>Envoyer</q-btn>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import useVuelidate from '@vuelidate/core';
import { email, required } from '@vuelidate/validators';
import Authentication from '@api/Authentication';
import CompaniHeader from '@components/CompaniHeader';
import Input from '@components/form/Input';
import { NotifyPositive, NotifyNegative } from '@components/popup/notify';
import { isUserLogged } from '@helpers/alenvi';
import { useMeta } from 'quasar';

export default {
  components: {
    'compani-header': CompaniHeader,
    'ni-input': Input,
  },
  setup () {
    return { v$: useVuelidate() };
  },
  data () {
    const metaInfo = { title: 'Mot de passe oublié' };
    useMeta(metaInfo);

    return { email: '' };
  },
  validations: {
    email: { email, required },
  },
  async beforeRouteEnter () {
    const isLogged = await isUserLogged();
    if (isLogged) return { path: '/' };
    return true;
  },
  methods: {
    async submit () {
      try {
        const payload = { email: this.email.toLowerCase() };
        await Authentication.forgotPassword(payload);
        NotifyPositive('Un email a été envoyé à l\'adresse indiquée');
      } catch (e) {
        let content = '';
        if (e.response && e.response.status) {
          if (e.response.status === 400) {
            content = 'Veuillez remplir le champ email.';
          } else if (e.response.status === 404) {
            content = 'Aucun compte ne correspond à l\'email indiqué.';
          } else {
            content = 'Erreur. Si le problème persiste, contactez le support technique.';
          }
        }
        NotifyNegative(content);
        console.error(e.response);
      }
    },
  },
};
</script>

<style lang="sass" scoped>
.message
  font-size: 14px
</style>
