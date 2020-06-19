import get from 'lodash/get';
import { required, requiredIf, email } from 'vuelidate/lib/validators';
import { REQUIRED_LABEL } from '@data/constants'
import { frAddress, frPhoneNumber } from '@helpers/vuelidateCustomVal';
import { formatPhoneForPayload } from '@helpers/utils';
import { NotifyNegative, NotifyPositive, NotifyWarning } from '@components/popup/notify';

export const userMixin = {
  data () {
    return {
      userValidation: {
        identity: {
          lastname: { required },
          firstname: { required },
          title: { required },
        },
        contact: {
          phone: { required, frPhoneNumber },
          address: {
            zipCode: { required: requiredIf(item => !!item.fullAddress) },
            street: { required: requiredIf(item => !!item.fullAddress) },
            city: { required: requiredIf(item => !!item.fullAddress) },
            fullAddress: { frAddress },
          },
        },
        local: {
          email: { required, email },
        },
        sector: { required },
      },
    };
  },
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
        if (this.tmpInput === get(this.mergedUserProfile, path)) {
          if (path === 'local.email' && this.tmpInput !== '') this.emailLock = true;
          return;
        }

        if (get(this.$v.mergedUserProfile, path)) {
          get(this.$v.mergedUserProfile, path).$touch();
          const isValid = await this.waitForValidation(this.$v.mergedUserProfile, path);
          if (!isValid) return NotifyWarning('Champ(s) invalide(s)');
        }
        if (path === 'contact.phone') {
          this.mergedUserProfile.contact.phone = formatPhoneForPayload(this.mergedUserProfile.contact.phone)
        }

        await this.updateAlenviUser(path);

        if (path === 'local.email') this.emailLock = true;
        NotifyPositive('Modification enregistrée.');
      } catch (e) {
        console.error(e);
        if (e.data.statusCode === 409) return this.emailErrorHandler(path);
        NotifyNegative('Erreur lors de la modification.');
      } finally {
        this.tmpInput = '';
      }
    },
    emailError (validationObj) {
      if (get(validationObj, 'local.email.required', null) === false) return REQUIRED_LABEL;
      else if (!get(validationObj, 'local.email.email', null)) return 'Email non valide';
      return '';
    },
    phoneNbrError (validationObj) {
      if (get(validationObj, 'contact.phone.required', null) === false) return REQUIRED_LABEL;
      else if (!get(validationObj, 'contact.phone.frPhoneNumber', null)) return 'Numéro de téléphone non valide';
      return '';
    },
    async emailErrorHandler (path) {
      try {
        NotifyNegative('Email déjà existant.');
        this.mergedUserProfile.local.email = this.tmpInput;
        await this.$nextTick();
        this.$refs.userEmail.select();
      } catch (e) {
        console.error(e);
      }
    },
  },
}
