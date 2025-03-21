<template>
  <div>
    <p class="text-weight-bold">Identité</p>
    <div class="row gutter-profile q-mb-lg">
      <ni-input v-model.trim="userProfile.identity.firstname" caption="Prénom"
        @focus="saveTmp('identity.firstname')" @blur="updateUser('identity.firstname')" />
      <ni-input v-model.trim="userProfile.identity.lastname" caption="Nom" @focus="saveTmp('identity.lastname')"
        @blur="updateUser('identity.lastname')" :error="v$.userProfile.identity.lastname.$error" />
      <ni-select caption="Civilité" :error="v$.userProfile.identity.title.$error" v-model="userProfile.identity.title"
        :options="civilityOptions" @focus="saveTmp('identity.title')" @blur="updateUser('identity.title')" />
      <div class="col-12 col-md-6 row items-center">
        <div class="col-xs-11">
          <ni-input ref="userEmail" name="emailInput" caption="Adresse email" type="email" lower-case
            :error="v$.userProfile.local.email.$error" :error-message="emailError(v$.userProfile)"
            :disable="emailLock" v-model.trim="userProfile.local.email" @focus="saveTmp('local.email')" />
        </div>
        <div :class="['col-xs-1', 'row', 'justify-end', { 'cursor-pointer': emailLock }]">
          <ni-button :icon="lockIcon" color="copper-grey-500" @click="toggleEmailLock(!emailLock)" />
        </div>
      </div>
      <div class="col-xs-12 col-md-6">
        <phone-select :contact="userPhone" :validation="v$.userPhone" @update="updatePhone" @blur="onPhoneBlur"
          required-field :error-message="phoneNbrError(v$.userPhone)" />
      </div>
    </div>
    <div class="row gutter-profile q-mb-xl">
      <ni-input caption="Biographie" v-model="userProfile.biography" type="textarea"
        @blur="updateUser('biography')" @focus="saveTmp('biography')" />
    </div>
  </div>
</template>

<script>
import { useStore } from 'vuex';
import { computed, ref } from 'vue';
import { required, email } from '@vuelidate/validators';
import get from 'lodash/get';
import Input from '@components/form/Input';
import Button from '@components/Button';
import PhoneSelect from '@components/form/PhoneSelect';
import Select from '@components/form/Select';
import { useUser } from '@composables/user';
import { TRAINER, CIVILITY_OPTIONS, MR, MRS } from '@data/constants';
import { frPhoneNumber, countryCode } from '@helpers/vuelidateCustomVal';
import useVuelidate from '@vuelidate/core';

export default {
  name: 'ProfileInfo',
  components: {
    'ni-input': Input,
    'phone-select': PhoneSelect,
    'ni-button': Button,
    'ni-select': Select,
  },
  setup () {
    const $store = useStore();

    const tmpInput = ref('');
    const emailLock = ref(true);
    const civilityOptions = CIVILITY_OPTIONS.filter(opt => [MR, MRS].includes(opt.value));

    const userProfile = computed(() => (
      (TRAINER === get($store.state.main.loggedUser, 'role.vendor.name')
        ? $store.state.main.loggedUser
        : $store.state.userProfile.userProfile
      )));

    const vendorRole = computed(() => $store.getters['main/getVendorRole']);

    const userPhone = ref({
      countryCode: userProfile.value.contact.countryCode || '+33',
      phone: userProfile.value.contact.phone || '',
    });

    const refreshUser = async () => {
      TRAINER === vendorRole.value
        ? await $store.dispatch('main/fetchLoggedUser', userProfile.value._id)
        : await $store.dispatch('userProfile/fetchUserProfile', { userId: userProfile.value._id });
    };

    const rules = computed(() => ({
      userProfile: {
        identity: { lastname: { required }, title: { required } },
        local: { email: { required, email } },
      },
      userPhone: { phone: { required, frPhoneNumber }, countryCode: { required, countryCode } },
    }));
    const v$ = useVuelidate(rules, { userProfile, userPhone });

    const {
      toggleEmailLock,
      updateUser,
      emailError,
      lockIcon,
      onPhoneBlur,
      updatePhone,
      phoneNbrError,
    } = useUser(refreshUser, v$, emailLock, tmpInput, userPhone);

    const created = async () => {
      v$.value.userProfile.$touch();
      v$.value.userPhone.$touch();
    };

    const saveTmp = (path) => {
      if (tmpInput.value === '') tmpInput.value = get(userProfile.value, path);
    };

    created();

    return {
      // Data
      emailLock,
      lockIcon,
      civilityOptions,
      // Computed
      userProfile,
      userPhone,
      // Validations
      v$,
      // Methods
      saveTmp,
      updateUser,
      refreshUser,
      emailError,
      toggleEmailLock,
      onPhoneBlur,
      updatePhone,
      phoneNbrError,
    };
  },
};
</script>
