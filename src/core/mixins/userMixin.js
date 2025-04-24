import get from 'lodash/get';
import { REQUIRED_LABEL } from '@data/constants';
import { formatPhoneForPayload } from '@helpers/utils';
import { NotifyNegative, NotifyPositive, NotifyWarning } from '@components/popup/notify';

export const userMixin = {
  computed: {
    lockIcon () {
      return this.emailLock ? 'lock' : 'lock_open';
    },
  },
  methods: {
    async toggleEmailLock () {
      if (this.emailLock) {
        this.emailLock = false;
        await this.$nextTick();
        this.$refs.userEmail.$refs.emailInput.focus();
      } else {
        await this.updateUser('local.email');
      }
    },
    async updateUser (path) {
      try {
        if (this.tmpInput === get(this.userProfile, path)) {
          if (path === 'local.email' && this.tmpInput !== '') this.emailLock = true;
          return;
        }

        if (get(this.v$.userProfile, path)) {
          get(this.v$.userProfile, path).$touch();
          const isValid = await this.waitForValidation(this.v$.userProfile, path);
          if (!isValid) return NotifyWarning('Champ(s) invalide(s)');
        }
        if (path === 'contact.phone') {
          this.userProfile.contact.phone = formatPhoneForPayload(this.userProfile.contact.phone);
        }

        await this.updateAlenviUser(path);
        this.emailLock = true;
        NotifyPositive('Modification enregistrée.');
      } catch (e) {
        console.error(e);
        if (e.status === 409) return this.emailErrorHandler(path);
        NotifyNegative('Erreur lors de la modification.');
      } finally {
        this.tmpInput = '';
      }
    },
    emailError (validationObj) {
      if (get(validationObj, 'local.email.required.$response') === false) return REQUIRED_LABEL;
      if (get(validationObj, 'local.email.email.$response') === false) return 'Email non valide';
      return '';
    },
    phoneNbrError (validationObj) {
      if (get(validationObj, 'contact.phone.required.$response') === false) return REQUIRED_LABEL;
      if (get(validationObj, 'contact.phone.frPhoneNumber.$response') === false) {
        return 'Numéro de téléphone non valide';
      }
      return '';
    },
    async emailErrorHandler (path) {
      try {
        NotifyNegative('Email déjà existant.');
        this.userProfile.local.email = this.tmpInput;
        await this.$nextTick();
        this.$refs.userEmail.select();
      } catch (e) {
        console.error(e);
      }
    },
  },
};
