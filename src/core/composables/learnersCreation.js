import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import useVuelidate from '@vuelidate/core';
import { required, email, requiredIf } from '@vuelidate/validators';
import get from 'lodash/get';
import pick from 'lodash/pick';
import escapeRegExp from 'lodash/escapeRegExp';
import Users from '@api/Users';
import Email from '@api/Email';
import UserCompanies from '@api/UserCompanies';
import {
  TRAINEE,
  DAY,
  HELPER,
  AUXILIARY_WITHOUT_COMPANY,
  TRAINING_ORGANISATION_MANAGER,
  VENDOR_ADMIN,
  DIRECTORY,
} from '@data/constants';
import CompaniDate from '@helpers/dates/companiDates';
import {
  clear,
  formatIdentity,
  removeDiacritics,
  removeEmptyProps,
  formatPhoneForPayload,
  getLastVersion,
} from '@helpers/utils';
import { frPhoneNumber } from '@helpers/vuelidateCustomVal';
import { NotifyNegative, NotifyWarning, NotifyPositive } from '@components/popup/notify';

export const useLearnersCreation = (
  refresh,
  isClientInterface,
  isDirectory,
  companies = { value: [] },
  isInterCourse = false
) => {
  const newLearner = ref({
    identity: { firstname: '', lastname: '' },
    contact: { phone: '' },
    local: { email: '' },
    company: '',
    userCompanyStartDate: CompaniDate().startOf(DAY).toISO(),
  });
  const searchStr = ref('');
  const learnerCreationModalLoading = ref(false);
  const learnerCreationModal = ref(false);
  const firstStep = ref(true);
  const learnerList = ref([]);
  const tableLoading = ref(false);
  const learnerAlreadyExists = ref(false);
  const traineeAdditionModal = ref(false);
  const newTraineeRegistration = ref({ user: '', ...(isInterCourse && { company: '' }), isCertified: false });
  const disableUserInfoEdition = ref(false);

  const $store = useStore();
  const vendorRole = computed(() => $store.getters['main/getVendorRole']);
  const loggedUser = computed(() => $store.state.main.loggedUser);
  const isRofOrAdmin = ref([TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN].includes(vendorRole.value));

  const filteredLearners = computed(() => {
    const formattedString = escapeRegExp(removeDiacritics(searchStr.value));

    return learnerList.value.filter(user => user.learner.noDiacriticsName.match(new RegExp(formattedString, 'i')));
  });

  const learnerRules = computed(() => ({
    newLearner: {
      identity: { lastname: { required } },
      local: { email: { required, email } },
      contact: { phone: { required: requiredIf(!disableUserInfoEdition.value), frPhoneNumber } },
      company: { required },
      userCompanyStartDate: { required },
    },
  }));
  const traineeRules = {
    newTraineeRegistration: { user: { required }, company: { required: requiredIf(isInterCourse) } },
  };

  const learnerValidation = useVuelidate(learnerRules, { newLearner });
  const traineeRegistrationValidation = useVuelidate(traineeRules, { newTraineeRegistration });

  const goToNextStep = () => {
    firstStep.value = false;
    learnerValidation.value.newLearner.$reset();
  };

  const getISODurationSinceLastActivityHistory = (lastActivityHistory) => {
    if (!lastActivityHistory) return null;

    return CompaniDate().diff(lastActivityHistory.updatedAt, 'days');
  };

  const formatRow = (user) => {
    const formattedName = formatIdentity(user.identity, 'FL');

    return {
      _id: user._id,
      learner: {
        fullName: formattedName,
        lastname: user.identity.lastname,
        picture: user.picture ? user.picture.link : null,
        noDiacriticsName: removeDiacritics(formattedName),
      },
      company: get(user, 'company.name') || '',
      blendedCoursesCount: user.blendedCoursesCount,
      eLearningCoursesCount: user.eLearningCoursesCount,
      isoDurationSinceLastActivityHistory: getISODurationSinceLastActivityHistory(user.lastActivityHistory),
    };
  };

  const getLearnerList = async () => {
    try {
      tableLoading.value = true;
      const learners = await Users
        .learnerList({ action: DIRECTORY, ...(companies.value.length && { companies: companies.value }) });
      learnerList.value = Object.freeze(learners.map(formatRow));
    } catch (e) {
      console.error(e);
      learnerList.value = [];
    } finally {
      tableLoading.value = false;
    }
  };

  const formatUserCreationPayload = () => {
    const payload = removeEmptyProps(
      pick(newLearner.value, ['identity', 'local', 'contact', 'company', 'userCompanyStartDate'])
    );
    if (get(payload, 'contact.phone')) payload.contact.phone = formatPhoneForPayload(newLearner.value.contact.phone);

    return payload;
  };

  const formatUserEditionPayload = () => {
    const payload = removeEmptyProps(
      pick(newLearner.value, ['identity', 'local', 'contact'])
    );
    if (get(payload, 'contact.phone')) payload.contact.phone = formatPhoneForPayload(newLearner.value.contact.phone);

    return payload;
  };

  const sendWelcome = async () => {
    try {
      await Email.sendWelcome({ email: newLearner.value.local.email, type: TRAINEE });
      NotifyPositive('Email envoyé');
    } catch (e) {
      console.error(e);
      NotifyNegative('Erreur lors de l\'envoi du mail.');
    }
  };

  const setNewLearner = (user, lastUserCompany) => {
    newLearner.value._id = user._id;
    newLearner.value.identity = {
      firstname: get(user, 'identity.firstname'),
      lastname: get(user, 'identity.lastname'),
    };
    newLearner.value.contact = { phone: get(user, 'contact.phone') };

    if (lastUserCompany && lastUserCompany.endDate && CompaniDate().isBefore(lastUserCompany.endDate)) {
      newLearner.value.userCompanyStartDate = CompaniDate(lastUserCompany.endDate).startOf(DAY).add('P1D').toISO();
    }

    if (companies.value.length === 1) newLearner.value.company = companies.value[0];
  };

  const goToCreateUser = () => {
    if (companies.value.length === 1) newLearner.value.company = companies.value[0];

    return goToNextStep();
  };

  const handleErrorsForUserWithNoEndingUserCompany = (lastCompany) => {
    if (companies.value.includes(lastCompany)) {
      return isDirectory
        ? NotifyWarning('Un compte rattaché à la structure existe déjà avec cette adresse mail.')
        : NotifyWarning('La personne existe déjà et peut être ajoutée à la formation sans modification.');
    }
    return NotifyNegative('La personne existe déjà et n\'est pas reliée à la bonne structure.');
  };

  const nextStepLearnerCreationModal = async () => {
    try {
      learnerValidation.value.newLearner.$touch();
      if (learnerValidation.value.newLearner.local.email.$error) return NotifyWarning('Champ invalide.');

      learnerCreationModalLoading.value = true;
      const userInfo = await Users.exists({ email: newLearner.value.local.email });

      if (!userInfo.exists) return goToCreateUser();
      if (isDirectory && !isClientInterface) return NotifyWarning('L\'apprenant(e) est déjà ajouté(e).');

      if (!get(userInfo, 'user._id')) {
        return NotifyNegative('L\'apprenant(e) existe déjà et n\'est pas relié(e) à la bonne structure.');
      }

      const lastUserCompany = getLastVersion(userInfo.user.userCompanyList, 'startDate');
      const hasUserCompanyWithoutEndDate = lastUserCompany && !lastUserCompany.endDate;
      if (hasUserCompanyWithoutEndDate) return handleErrorsForUserWithNoEndingUserCompany(lastUserCompany.company);

      if (!isDirectory && [HELPER, AUXILIARY_WITHOUT_COMPANY].includes(get(userInfo, 'user.role.client.name'))) {
        return NotifyNegative('Cette personne ne peut pas être ajoutée à la formation.');
      }

      setNewLearner(userInfo.user, lastUserCompany);
      learnerAlreadyExists.value = true;

      const hasCurrentCompany = lastUserCompany && CompaniDate().isBefore(lastUserCompany.endDate);
      const sameCompany = lastUserCompany && lastUserCompany.company === get(loggedUser.value, 'company._id');
      disableUserInfoEdition.value = (isClientInterface || !isRofOrAdmin.value) && hasCurrentCompany && !sameCompany;

      return goToNextStep();
    } catch (e) {
      console.error(e);
      NotifyNegative('Erreur lors de l\'ajout de l\'apprenant(e).');
    } finally {
      learnerCreationModalLoading.value = false;
    }
  };

  const createLearner = async () => {
    try {
      const payload = formatUserCreationPayload();
      const user = await Users.create(payload);
      NotifyPositive('Apprenant(e) ajouté(e) avec succès.');

      await sendWelcome();
      return user._id;
    } catch (e) {
      console.error(e);
      if (e.status === 409) NotifyNegative(e.data.message);
      throw e;
    }
  };

  const updateLearner = async () => {
    await UserCompanies.create({
      company: newLearner.value.company,
      user: newLearner.value._id,
      startDate: newLearner.value.userCompanyStartDate,
    });

    if (!disableUserInfoEdition.value) {
      const payload = formatUserEditionPayload();

      await Users.updateById(newLearner.value._id, payload);
      NotifyPositive('Apprenant(e) modifié(e).');
    }

    return newLearner.value._id;
  };

  const submitLearnerCreationModal = async () => {
    learnerValidation.value.newLearner.$touch();
    if (learnerValidation.value.newLearner.$error) return NotifyWarning('Champ(s) invalide(s).');

    try {
      learnerCreationModalLoading.value = true;
      if (learnerAlreadyExists.value) newTraineeRegistration.value = { user: await updateLearner() };
      else newTraineeRegistration.value = { user: await createLearner(), isCertified: false };

      if (isInterCourse) newTraineeRegistration.value.company = newLearner.value.company;

      await refresh();
      learnerCreationModal.value = false;
      traineeAdditionModal.value = true;
    } catch (e) {
      if (e.status === 409) return NotifyNegative(e.data.message);
      NotifyNegative('Erreur lors de l\'ajout de l\'apprenant(e).');
    } finally {
      learnerCreationModalLoading.value = false;
    }
  };

  const resetLearnerCreationModal = () => {
    firstStep.value = true;
    newLearner.value = { ...clear(newLearner.value), userCompanyStartDate: CompaniDate().startOf(DAY).toISO() };
    learnerValidation.value.newLearner.$reset();
    learnerAlreadyExists.value = false;
    disableUserInfoEdition.value = false;
  };

  const updateSearch = (value) => {
    searchStr.value = value;
  };

  return {
    // Data
    searchStr,
    learnerCreationModal,
    newLearner,
    learnerCreationModalLoading,
    firstStep,
    learnerList,
    tableLoading,
    learnerAlreadyExists,
    traineeAdditionModal,
    newTraineeRegistration,
    disableUserInfoEdition,
    // Computed
    filteredLearners,
    isRofOrAdmin,
    // Validations
    learnerValidation,
    traineeRegistrationValidation,
    // Methods
    updateSearch,
    goToNextStep,
    getLearnerList,
    submitLearnerCreationModal,
    resetLearnerCreationModal,
    nextStepLearnerCreationModal,
  };
};
