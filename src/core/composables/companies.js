import get from 'lodash/get';
import { computed } from 'vue';
import { REQUIRED_LABEL } from '@data/constants';

export const useCompanies = (v$) => {
  const addressError = computed(() => {
    const validation = v$.value.company.address.fullAddress;
    if (get(validation, 'required.$response') === false) return REQUIRED_LABEL;
    if (get(validation, 'frAddress.$response') === false) return 'Adresse non valide';
    return '';
  });

  const ibanErrorMessage = computed(() => {
    const validation = v$.value.company.iban;
    if (get(validation, 'required.$response') === false) return REQUIRED_LABEL;
    if (get(validation, 'iban.$response') === false) return 'IBAN non valide';

    return '';
  });

  return {
    // Computed
    addressError,
    ibanErrorMessage,
  };
};
