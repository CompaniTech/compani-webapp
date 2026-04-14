<template>
  <div>
    <compani-header />
    <div class="col-12 row justify-center client-background">
      <div class="signup-body-padding">
        <div class="row items-center">
          <div class="col-2" style="text-align: left">
            <span><q-icon name="lock" size="2rem" /></span>
          </div>
          <div class="col-10 signup-bloctext-padding">
            <p class="no-margin" style="font-size: 0.8rem">
              Pour vous connecter à votre compte, merci de <span class="text-weight-bold">saisir votre
                identifiant</span> et votre <span class="text-weight-bold">mot de passe</span>
            </p>
          </div>
        </div>
        <ni-input data-cy="email" :model-value="credentials.email" @blur="v$.credentials.email.$touch"
          @update:model-value="$event =>set(credentials, 'email', $event.trim())" caption="Email"
          @keyup-enter="submit" :error="v$.credentials.email.$error" :error-message="emailErrorMessage" />
        <ni-input data-cy="password" v-model="credentials.password" caption="Mot de passe" type="password"
          @keyup-enter="submit" :error="v$.credentials.password.$error" @blur="v$.credentials.password.$touch" />
        <router-link class="row justify-end" :to="{ name: 'forgotPassword' }">
          <small>Mot de passe oublié&nbsp;?</small>
        </router-link>
        <div class="q-my-lg buttons">
          <ni-button @click="$router.push({ name: 'forgotPassword' })" color="primary" class="firstLoginBtn"
            label="C'est ma première connexion" />
          <ni-primary-button data-cy="login" label="Me connecter" icon="ion-log-in" @click="submit" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { useMeta } from 'quasar';
import get from 'lodash/get';
import set from 'lodash/set';
import useVuelidate from '@vuelidate/core';
import { required, email } from '@vuelidate/validators';
import CompaniHeader from '@components/CompaniHeader';
import Input from '@components/form/Input';
import Button from '@components/Button';
import PrimaryButton from '@components/PrimaryButton';
import { NotifyNegative } from '@components/popup/notify';
import { useLogin } from '@composables/login';
import { REQUIRED_LABEL } from '@data/constants';
import { isUserLogged } from '@helpers/alenvi';

export default {
  name: 'Authentication',
  components: {
    'compani-header': CompaniHeader,
    'ni-input': Input,
    'ni-button': Button,
    'ni-primary-button': PrimaryButton,
  },
  setup () {
    const credentials = ref({ email: '', password: '' });

    const metaInfo = {
      title: 'Connexion',
      meta: [{
        name: 'description',
        content: 'Outil collaboratif pour transformer le secteur du prendre soin.',
      }],
    };
    useMeta(metaInfo);

    const { logInUser } = useLogin();

    const rules = computed(() => ({
      credentials: { email: { required, email }, password: { required } },
    }));

    const v$ = useVuelidate(rules, { credentials });

    const emailErrorMessage = computed(() => {
      if (!v$.value.credentials.email.required) return REQUIRED_LABEL;
      return 'Email invalide';
    });

    const submit = async () => {
      try {
        v$.value.credentials.$touch();
        if (v$.value.credentials.$error) return;
        await logInUser({ email: credentials.value.email.toLowerCase(), password: credentials.value.password });
      } catch (e) {
        console.error(e);
        if (get(e, 'response.status') === 401) return NotifyNegative('Identifiant ou mot de passe invalide');
        NotifyNegative('Impossible de se connecter');
      }
    };

    return {
      // Data
      credentials,
      // Computed
      emailErrorMessage,
      // Methods
      submit,
      set,
      v$,
    };
  },
  async beforeRouteEnter () {
    const isLogged = await isUserLogged();
    if (isLogged) return { path: '/' };
    return true;
  },
};
</script>

<style lang="sass" scoped>
.signup
  &-bloctext-padding
    padding: 24px 0px 24px 0px
  &-body-padding
    padding: 0px 24px 0px 24px

.client-background
  min-height: 100vh
  @media screen and (max-width: 768px)
    height: 85vh

.buttons
  display: flex
  justify-content: center
  @media screen and (max-width: 420px)
    flex-direction: column-reverse
    .firstLoginBtn
      margin-top: 16px
</style>
