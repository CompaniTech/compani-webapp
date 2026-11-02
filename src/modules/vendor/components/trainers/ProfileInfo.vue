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
    </div>
    <div class="row gutter-profile q-mb-lg">
      <div class="col-xs-12 col-md-6">
        <phone-select :contact="userPhone" :validation="v$.userPhone" @update="updatePhone" @blur="onPhoneBlur"
          required-field :error-message="phoneNbrError(v$.userPhone)" />
      </div>
      <ni-search-address v-model="userProfile.contact.address" :error-message="addressError"
        @blur="updateUser('contact.address')" @focus="saveTmp('contact.address.fullAddress')"
        :error="v$.userProfile.contact.address.$error" />
    </div>
    <div class="q-mb-xl">
      <p class="text-weight-bold">Coordonnées bancaires</p>
      <div class="row gutter-profile">
        <ni-bank-detail-input caption="IBAN" name="ibanInput" v-model="userProfile.iban" deletable
          :error="v$.userProfile.iban.$error" :error-message="ibanErrorMessage" @focus="saveTmp('iban')"
          @update:locked="updateBankInfoLock('iban', $event)" @save="updateUser('iban')"
          @delete="validateBankDetailDeletion('iban')" />
        <ni-bank-detail-input caption="BIC" name="bicInput" v-model="userProfile.bic" deletable
          :error="v$.userProfile.bic.$error" :error-message="bicErrorMessage" @focus="saveTmp('bic')"
          @update:locked="updateBankInfoLock('bic', $event)" @save="updateUser('bic')"
          @delete="validateBankDetailDeletion('bic')" />
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
import { useQuasar } from 'quasar';
import { computed, ref } from 'vue';
import { required, requiredIf, email } from '@vuelidate/validators';
import get from 'lodash/get';
import Input from '@components/form/Input';
import BankDetailInput from '@components/form/BankDetailInput';
import SearchAddress from '@components/form/SearchAddress';
import Button from '@components/Button';
import PhoneSelect from '@components/form/PhoneSelect';
import Select from '@components/form/Select';
import Users from '@api/Users';
import { NotifyNegative, NotifyPositive } from '@components/popup/notify';
import { useUser } from '@composables/user';
import { TRAINER, CIVILITY_OPTIONS, MR, MRS, REQUIRED_LABEL } from '@data/constants';
import { frPhoneNumber, countryCode, frAddress, iban, bic } from '@helpers/vuelidateCustomVal';
import useVuelidate from '@vuelidate/core';

export default {
  name: 'ProfileInfo',
  components: {
    'ni-input': Input,
    'ni-bank-detail-input': BankDetailInput,
    'phone-select': PhoneSelect,
    'ni-button': Button,
    'ni-select': Select,
    'ni-search-address': SearchAddress,
  },
  setup () {
    const $store = useStore();
    const $q = useQuasar();

    const tmpInput = ref('');
    const emailLock = ref(true);
    const bankInfoLocked = ref({ iban: true, bic: true });
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
      if (TRAINER === vendorRole.value) await $store.dispatch('main/fetchLoggedUser', userProfile.value._id);
      else await $store.dispatch('userProfile/fetchUserProfile', { userId: userProfile.value._id });
    };

    const rules = computed(() => ({
      userProfile: {
        identity: { lastname: { required }, title: { required } },
        local: { email: { required, email } },
        contact: { address: { fullAddress: { frAddress } } },
        iban: { required: requiredIf(() => !bankInfoLocked.value.iban), iban },
        bic: { required: requiredIf(() => !bankInfoLocked.value.bic), bic },
      },
      userPhone: { phone: { required, frPhoneNumber }, countryCode: { required, countryCode } },
    }));
    const v$ = useVuelidate(rules, { userProfile, userPhone });

    const updateBankInfoLock = (path, isLocked) => {
      bankInfoLocked.value[path] = isLocked;
      if (!isLocked) v$.value.userProfile[path].$reset();
    };

    const addressError = computed(() => {
      const validation = v$.value.userProfile.contact.address.fullAddress;
      if (get(validation, 'frAddress.$response') === false) return 'Adresse non valide';
      return '';
    });

    const ibanErrorMessage = computed(() => {
      const validation = v$.value.userProfile.iban;
      if (get(validation, 'required.$response') === false) return REQUIRED_LABEL;
      if (get(validation, 'iban.$response') === false) return 'IBAN non valide';
      return '';
    });

    const bicErrorMessage = computed(() => {
      const validation = v$.value.userProfile.bic;
      if (get(validation, 'required.$response') === false) return REQUIRED_LABEL;
      if (get(validation, 'bic.$response') === false) return 'BIC non valide';
      return '';
    });

    const {
      toggleEmailLock,
      updateUser,
      emailError,
      lockIcon,
      onPhoneBlur,
      updatePhone,
      phoneNbrError,
    } = useUser(refreshUser, v$, emailLock, tmpInput, userPhone);

    const deleteBankDetail = async (path) => {
      try {
        await Users.updateById(userProfile.value._id, { [path]: '' });
        await refreshUser();
        NotifyPositive('Modification enregistrée.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la modification.');
      }
    };

    const validateBankDetailDeletion = (path) => {
      $q.dialog({
        title: 'Confirmation',
        message: `Êtes-vous sûr(e) de vouloir supprimer ${path === 'iban' ? 'l\'IBAN' : 'le BIC'}&nbsp;?`,
        html: true,
        ok: 'Oui',
        cancel: 'Non',
      }).onOk(() => deleteBankDetail(path))
        .onCancel(() => NotifyPositive('Suppression annulée.'));
    };

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
      addressError,
      ibanErrorMessage,
      bicErrorMessage,
      // Validations
      v$,
      // Methods
      saveTmp,
      updateUser,
      refreshUser,
      validateBankDetailDeletion,
      updateBankInfoLock,
      emailError,
      toggleEmailLock,
      onPhoneBlur,
      updatePhone,
      phoneNbrError,
    };
  },
};
</script>
