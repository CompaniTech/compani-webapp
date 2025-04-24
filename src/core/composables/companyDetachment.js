import { computed, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import get from 'lodash/get';
import { formatIdentity } from '@helpers/utils';
import CompaniDate from '@helpers/dates/companiDates';
import UserCompanies from '@api/UserCompanies';
import { DAY } from '@data/constants';
import { NotifyPositive, NotifyNegative } from '@components/popup/notify';

const DETACHMENT_ALLOWED_COMPANY_IDS = process.env.DETACHMENT_ALLOWED_COMPANY_IDS.split(';');

export const useCompanyDetachment = (userProfile, refresh) => {
  const $q = useQuasar();
  const $router = useRouter();

  const companyDetachModal = ref(false);
  const detachmentDate = ref(CompaniDate().endOf(DAY).toISO());
  const detachModalLoading = ref(false);
  const userIdentity = ref('');
  const isClientInterface = !/\/ad\//.test($router.currentRoute.value.path);

  const detachableUserCompany = computed(() => (get(userProfile.value, 'userCompanyList') || [])
    .find(uc => !uc.endDate && CompaniDate().isAfter(uc.startDate)));

  const minDetachmentDate = computed(() => (get(detachableUserCompany.value, 'startDate') || ''));

  const companyName = computed(() => get(userProfile.value, 'company.name'));

  const canDetachFromCompany = computed(() => {
    const isCompanyAllowed = DETACHMENT_ALLOWED_COMPANY_IDS.includes(get(userProfile.value, 'company._id'));
    const userHasRole = !!get(userProfile.value, 'role.client._id') || !!get(userProfile.value, 'role.vendor._id');

    return isCompanyAllowed && !userHasRole && !!detachableUserCompany.value;
  });

  const canLinkToCompany = computed(() => !get(userProfile.value, 'userCompanyList') ||
    userProfile.value.userCompanyList.every(uc => uc.endDate));

  watch(userProfile, () => { userIdentity.value = formatIdentity(get(userProfile.value, 'identity'), 'FL'); });

  const openCompanyDetachModal = () => (companyDetachModal.value = true);

  const validateCompanyDetachement = () => {
    $q.dialog({
      title: 'Confirmation',
      message: `Êtes-vous sûr(e) de vouloir détacher <b>${userIdentity.value}</b> de la structure
        <b>${companyName.value}</b>&nbsp;?
        <br /> <br />La structure n’aura plus accès aux informations de cette personne et ne pourra plus l’inscrire en
        formation.`,
      html: true,
      ok: true,
      cancel: 'Annuler',
    }).onOk(() => detachCompany())
      .onCancel(() => NotifyPositive('Détachement annulé.'));
  };

  const detachCompany = async () => {
    try {
      await UserCompanies.update(
        get(detachableUserCompany.value, '_id'),
        { endDate: CompaniDate(detachmentDate.value).toISO() }
      );

      companyDetachModal.value = false;
      NotifyPositive('Modification enregistrée.');

      await refresh();
      if (CompaniDate().isAfter(detachmentDate.value) && isClientInterface) {
        $router.push({ name: 'ni courses learners' });
      }
    } catch (e) {
      console.error(e);
      if (e.status === 403) return NotifyNegative(e.data.message);
      NotifyNegative('Erreur lors de la modification.');
    }
  };

  const resetDetachmentModal = () => { detachmentDate.value = CompaniDate().endOf(DAY).toISO(); };

  return {
    // Data
    companyDetachModal,
    detachmentDate,
    detachModalLoading,
    userIdentity,
    // Computed
    companyName,
    canDetachFromCompany,
    canLinkToCompany,
    minDetachmentDate,
    // Methods
    openCompanyDetachModal,
    validateCompanyDetachement,
    resetDetachmentModal,
  };
};
