<template>
  <div>
    <div class="q-mb-xl">
      <div class="photo-caption">Photo</div>
      <div class="row gutter-profile">
        <div class="col-xs-12 col-md-6">
          <ni-picture-uploader :user="userProfile" :refresh-picture="refreshUser" />
        </div>
      </div>
    </div>
    <div class="row gutter-profile q-mb-lg">
      <ni-input v-model.trim="userProfile.identity.firstname" caption="Prénom"
        @focus="saveTmp('identity.firstname')" @blur="updateUser('identity.firstname')" />
      <ni-input v-model.trim="userProfile.identity.lastname" caption="Nom" @focus="saveTmp('identity.lastname')"
        @blur="updateUser('identity.lastname')" :error="v$.userProfile.identity.lastname.$error" required-field />
      <div class="col-12 col-md-6 row items-center">
        <div class="col-xs-11">
          <ni-input ref="userEmail" name="emailInput" caption="Adresse email" type="email" lower-case
            :error="v$.userProfile.local.email.$error" :error-message="emailError(v$.userProfile)" required-field
            :disable="emailLock" v-model.trim="userProfile.local.email" @focus="saveTmp('local.email')" />
        </div>
        <div :class="['col-xs-1', 'row', 'justify-end', { 'cursor-pointer': emailLock }]">
          <ni-button color="copper-grey-500" :icon="lockIcon" @click="toggleEmailLock(!emailLock)" />
        </div>
      </div>
      <div class="col-xs-12 row col-md-6">
          <phone-select :contact="userPhone" :validation="v$.userPhone" @update="updatePhone" @blur="onPhoneBlur"
            required-field :error-message="phoneNbrError(v$.userPhone)" />
      </div>
    </div>
  </div>
</template>

<script>
import { useStore } from 'vuex';
import { computed, ref } from 'vue';
import useVuelidate from '@vuelidate/core';
import get from 'lodash/get';
import Input from '@components/form/Input';
import PhoneSelect from '@components/form/PhoneSelect';
import Button from '@components/Button';
import PictureUploader from '@components/PictureUploader';
import { useUser } from '@composables/user';
import { required, email } from '@vuelidate/validators';
import { frPhoneNumber, countryCode } from '@helpers/vuelidateCustomVal';

export default {
  name: 'ProfileInfo',
  components: {
    'ni-input': Input,
    'phone-select': PhoneSelect,
    'ni-button': Button,
    'ni-picture-uploader': PictureUploader,
  },
  setup () {
    const $store = useStore();

    const tmpInput = ref('');
    const emailLock = ref(true);

    const userProfile = computed(() => $store.state.userProfile.userProfile);

    const userPhone = ref({
      countryCode: userProfile.value.contact.countryCode || '+33',
      phone: userProfile.value.contact.phone || '',
    });

    const refreshUser = async () => {
      await $store.dispatch('userProfile/fetchUserProfile', { userId: userProfile.value._id });
    };

    const rules = computed(() => ({
      userProfile: {
        identity: { lastname: { required } },
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
      savePhone,
      updatePhone,
      phoneNbrError,
    } = useUser(refreshUser, v$, emailLock, tmpInput, userPhone);

    const mounted = async () => {
      v$.value.userProfile.$touch();
    };

    const saveTmp = (path) => {
      if (tmpInput.value === '') tmpInput.value = get(userProfile.value, path);
    };

    mounted();

    return {
      // Data
      emailLock,
      lockIcon,
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
      savePhone,
      updatePhone,
      phoneNbrError,
    };
  },
};
</script>

<style lang="sass" scoped>
.photo-caption
  font-size: 12px
  margin: 0 0 4px 0
</style>
