<template>
  <q-page :class="backgroundClass" padding>
    <div v-if="userProfile && userProfile._id">
      <ni-title-header title="Mon compte" class="q-mb-xl" />
      <div class="q-mb-xl">
        <div class="photo-caption">Photo</div>
        <div class="row gutter-profile">
          <div class="col-xs-12 col-md-6">
            <ni-picture-uploader :user="userProfile" :refresh-picture="refreshUser" />
          </div>
        </div>
      </div>
      <div class="row gutter-profile q-mb-xl">
        <ni-input caption="Prénom" :error="v$.userProfile.identity.firstname.$error"
          v-model.trim="userProfile.identity.firstname" @blur="updateUser('identity.firstname')"
          @focus="saveTmp('identity.firstname')" required-field />
        <ni-input caption="Nom" :error="v$.userProfile.identity.lastname.$error"
          v-model.trim="userProfile.identity.lastname" @blur="updateUser('identity.lastname')"
          @focus="saveTmp('identity.lastname')" required-field />
        <div class="col-xs-12 col-md-6 row items-center">
          <div class="col-11">
            <ni-input ref="userEmail" name="emailInput" caption="Email" type="email" :disable="emailLock"
              :error="v$.userProfile.local.email.$error" @focus="saveTmp('local.email')" lower-case
              :error-message="emailError(v$.userProfile)" v-model.trim="userProfile.local.email" required-field />
          </div>
          <div :class="['col-1', 'row', 'justify-end', { 'cursor-pointer': emailLock }]">
            <ni-button :icon="lockIcon" @click="toggleEmailLock(!emailLock)" color="copper-grey-500" />
          </div>
        </div>
        <div class="col-xs-12 col-md-6">
          <phone-select :contact="userPhone" :validation="v$.userPhone" @update="updatePhone" @blur="onPhoneBlur" />
        </div>
      </div>
      <div class="account-button">
        <ni-button @click="newPasswordModal = true" color="white" class="bg-copper-500" icon="mdi-lock-reset"
          label="Modifier mon mot de passe" />
      </div>
      <q-separator class="q-my-lg" />
      <div class="account-button">
        <ni-button color="white" class="bg-copper-500 q-mb-md" @click="logout" icon="logout" label="Déconnexion" />
        <ni-button size="16px" href="https://www.compani.fr/cgu-cgv" label="Conditions générales d’utilisation"
          type="a" />
        <ni-button size="16px" type="a" href="https://www.compani.fr/rgpd" label="Politique RGPD" />
      </div>
    </div>

    <new-password-modal :confirm-error-message="passwordConfirmError(v$.newPassword.confirm)" :validations="v$"
      v-model="newPasswordModal" :user-profile="userProfile" @hide="resetForm" v-model:new-password="newPassword"
      :password-error-message="passwordError(v$.newPassword.password)" @submit="submitPasswordChange"
      :loading="loading" />
  </q-page>
</template>

<script>
import { useMeta } from 'quasar';
import { ref, computed, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import { useRoute } from 'vue-router';
import useVuelidate from '@vuelidate/core';
import { required, email, sameAs } from '@vuelidate/validators';
import get from 'lodash/get';
import set from 'lodash/set';
import Authentication from '@api/Authentication';
import TitleHeader from '@components/TitleHeader';
import Input from '@components/form/Input';
import PhoneSelect from '@components/form/PhoneSelect';
import Button from '@components/Button';
import { NotifyWarning, NotifyPositive, NotifyNegative } from '@components/popup/notify';
import PictureUploader from '@components/PictureUploader';
import { useUser } from '@composables/user';
import { usePassword } from '@composables/password';
import { frPhoneNumber, countryCode } from '@helpers/vuelidateCustomVal';
import { logOutAndRedirectToLogin } from 'src/router/redirect';
import NewPasswordModal from 'src/core/pages/NewPasswordModal';

export default {
  name: 'AccountInfo',
  components: {
    'ni-title-header': TitleHeader,
    'ni-button': Button,
    'ni-input': Input,
    'phone-select': PhoneSelect,
    'ni-picture-uploader': PictureUploader,
    'new-password-modal': NewPasswordModal,
  },
  setup () {
    const metaInfo = { title: 'Mon compte' };
    useMeta(metaInfo);

    const $route = useRoute();
    const $store = useStore();

    const tmpInput = ref('');
    const emailLock = ref(true);
    const newPasswordModal = ref(false);
    const newPassword = ref({ password: '', confirm: '' });
    const loading = ref(false);
    const isLoggingOut = ref(false);
    const backgroundClass = /\/ad\//.test($route.path) ? 'vendor-background' : 'client-background';

    const userProfile = computed(() => $store.state.main.loggedUser);

    const userPhone = ref({
      countryCode: userProfile.value.contact.countryCode || '+33',
      phone: userProfile.value.contact.phone || '',
    });

    const refreshUser = async () => {
      await $store.dispatch('main/fetchLoggedUser', userProfile.value._id);
    };

    const { passwordError, passwordConfirmError, passwordValidation } = usePassword();

    const rules = computed(() => ({
      userProfile: {
        identity: { firstname: { required }, lastname: { required } },
        local: { email: { required, email } },
        contact: { phone: { frPhoneNumber } },
      },
      newPassword: {
        password: { ...passwordValidation.value },
        confirm: { required, sameAs: sameAs(newPassword.value.password) },
      },
      userPhone: { phone: { frPhoneNumber }, countryCode: { countryCode } },
    }));

    const v$ = useVuelidate(rules, { userProfile, newPassword, userPhone });

    const {
      toggleEmailLock,
      updateUser,
      emailError,
      lockIcon,
      userEmail,
      onPhoneBlur,
      updatePhone,
    } = useUser(refreshUser, v$, emailLock, tmpInput, userPhone);

    const saveTmp = (path) => {
      if (tmpInput.value === '') tmpInput.value = get(userProfile.value, path);
    };

    const submitPasswordChange = async () => {
      try {
        loading.value = true;

        v$.value.newPassword.$touch();
        if (v$.value.newPassword.$error) return NotifyWarning('Champ(s) invalide(s)');

        const payload = set({}, 'local.password', get(newPassword.value, 'password'));
        await Authentication.updatePassword(userProfile.value._id, payload);

        NotifyPositive('Modification enregistrée.');
        newPasswordModal.value = false;
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la modification.');
      } finally {
        loading.value = false;
      }
    };

    const resetForm = () => {
      newPassword.value = { password: '', confirm: '' };
      v$.value.newPassword.$reset();
    };

    const logout = () => {
      isLoggingOut.value = true;
      logOutAndRedirectToLogin();
    };

    onBeforeUnmount(() => {
      if (isLoggingOut.value) $store.dispatch('main/resetMain');
    });

    return {
      // Data
      tmpInput,
      emailLock,
      newPasswordModal,
      newPassword,
      loading,
      backgroundClass,
      isLoggingOut,
      updateUser,
      emailError,
      toggleEmailLock,
      userEmail,
      lockIcon,
      passwordError,
      passwordConfirmError,
      userPhone,
      // Computed
      userProfile,
      // Methods
      v$,
      refreshUser,
      saveTmp,
      resetForm,
      logout,
      submitPasswordChange,
      updatePhone,
      onPhoneBlur,
    };
  },
};
</script>

<style lang="sass" scoped>
.account-button
  display: flex
  flex-direction: column
  align-items: flex-start
  @media screen and (max-width: 676px)
    align-items: center
.photo-caption
  font-size: 12px
  margin: 0 0 4px 0
</style>
