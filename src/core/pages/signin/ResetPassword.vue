<template>
  <div>
    <compani-header />
    <div class="row justify-center q-layout-padding client-background page-container">
      <div class="col-md-6 col-xs-12">
        <p class="q-mb-lg message">Veuillez renseigner un nouveau mot de passe.</p>
        <ni-input caption="Nouveau mot de passe (6 caractères minimum)" :error="v$.password.$error"
          v-model.trim="password" @blur="v$.password.$touch" type="password"
          :error-message="passwordError(v$.password)" required-field />
        <ni-input caption="Confirmation nouveau mot de passe" :error="v$.passwordConfirm.$error"
          v-model.trim="passwordConfirm" @blur="v$.passwordConfirm.$touch" type="password" required-field
          :error-message="passwordConfirmError(v$.passwordConfirm)" />
        <div class="row justify-center">
          <q-btn @click="submit" color="primary" :disable="v$.$invalid">Envoyer</q-btn>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onBeforeUnmount, onMounted } from 'vue';
import { useRoute } from 'vue-router'; // Add this import
import { sameAs, required } from '@vuelidate/validators';
import useVuelidate from '@vuelidate/core';
import CompaniHeader from '@components/CompaniHeader';
import Input from '@components/form/Input';
import { useLogin } from '@composables/login';
import { usePassword } from '@composables/password';
import Authentication from '@api/Authentication';
import { NotifyPositive, NotifyNegative, NotifyWarning } from '@components/popup/notify';
import { isUserLogged } from '@helpers/alenvi';
import { logOutAndRedirectToLogin } from 'src/router/redirect';

export default {
  components: {
    'compani-header': CompaniHeader,
    'ni-input': Input,
  },
  setup () {
    const route = useRoute(); // Get the route object
    const password = ref('');
    const passwordConfirm = ref('');
    const userId = ref(null);
    const timeout = ref(null);
    const userEmail = ref('');

    const { logInUser } = useLogin();

    const { passwordError, passwordConfirmError, passwordValidation } = usePassword();

    const rules = computed(() => ({
      password: { ...passwordValidation.value },
      passwordConfirm: { required, sameAs: sameAs(password.value) },
    }));

    const v$ = useVuelidate(rules, { password, passwordConfirm });

    const setData = (checkToken) => {
      userId.value = checkToken.user._id;
      userEmail.value = checkToken.user.email;
    };

    const logIn = async () => {
      try {
        await logInUser({ email: userEmail.value, password: password.value });
      } catch (e) {
        NotifyNegative('Erreur lors de la connexion. Si le problème persiste, contactez le support technique.');
        console.error(e);
      }
    };

    const submit = async () => {
      try {
        v$.value.$touch();
        if (v$.value.error) return NotifyWarning('Champ(s) invalide(s)');

        await Authentication.updatePassword(userId.value, { local: { password: password.value }, isConfirmed: true });

        NotifyPositive('Mot de passe changé. Connexion en cours ...');
        timeout.value = setTimeout(() => logIn(), 2000);
      } catch (e) {
        NotifyNegative('Erreur, si le problème persiste, contactez le support technique.');
        console.error(e.response);
      }
    };

    onMounted(() => {
      const { checkTokenData } = route.meta;
      if (checkTokenData) {
        setData(checkTokenData);
      }
    });

    onBeforeUnmount(() => {
      clearTimeout(timeout.value);
    });

    return {
      // Data
      password,
      passwordConfirm,
      passwordError,
      passwordConfirmError,
      // Methods
      submit,
      setData,
      v$,
    };
  },
  async beforeRouteEnter (to) {
    try {
      const isLogged = await isUserLogged();
      if (isLogged) return { path: '/' };

      if (to.params.token) {
        const checkToken = await Authentication.checkPasswordToken(to.params.token);
        to.meta.checkTokenData = checkToken;
        return true;
      }
      logOutAndRedirectToLogin();
    } catch (e) {
      if (e.response) console.error(e.response);
      else console.error(e);
      logOutAndRedirectToLogin();
    }
  },
};
</script>

<style lang="sass" scoped>
  .message
    font-size: 14px
</style>
