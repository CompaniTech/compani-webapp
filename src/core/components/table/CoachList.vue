<template>
  <div>
    <div class="q-mb-xl">
      <p class="text-weight-bold">Coachs</p>
      <q-card>
        <ni-responsive-table :data="users" :columns="usersColumns" v-model:pagination="usersPagination"
          :loading="usersLoading">
          <template #header="{ props }">
            <q-tr :props="props">
              <q-th v-for="col in props.cols" :key="col.name" :props="props" :style="col.style"
                :class="[{ 'table-actions-responsive': col.name === 'actions' }]">
                {{ col.label }}
              </q-th>
            </q-tr>
          </template>
          <template #body="{ props }">
            <q-tr :props="props">
              <q-td v-for="col in props.cols" :key="col.name" :data-label="col.label" :props="props" :class="col.name"
                :style="col.style">
                <ni-button v-if="col.name === 'actions'" icon="edit" @click="openCoachEditionModal(props.row)" />
                <template v-else>{{ col.value }}</template>
              </q-td>
            </q-tr>
          </template>
        </ni-responsive-table>
        <q-card-actions align="right">
          <ni-button color="primary" icon="add" label="Ajouter une personne" @click="coachCreationModal = true"
            :disable="usersLoading" />
        </q-card-actions>
      </q-card>
    </div>

    <coach-creation-modal v-model="coachCreationModal" v-model:new-coach="newCoach" :validations="v$.newCoach"
      :first-step="firstStep" :loading="loading" :phone-nbr-error="phoneNbrError(v$.newCoach.contact)"
      :role-options="roleOptions" @hide="resetCoachCreationForm" @show="openCoachCreationModal" @submit="createCoach"
      @go-to-next-step="nextStep" :email-error="emailError(v$.newCoach)" />

    <coach-edition-modal v-model="coachEditionModal" :phone-nbr-error="phoneNbrError(v$.selectedCoach.contact)"
      :validations="v$.selectedCoach" :email-error="emailError(v$.selectedCoach)" v-model:selected-coach="selectedCoach"
      :role-options="roleOptions" @hide="resetCoachEditionForm" @submit="updateCoach" :loading="loading" />
  </div>
</template>

<script>
import { toRefs, ref, computed } from 'vue';
import { useStore } from 'vuex';
import useVuelidate from '@vuelidate/core';
import { required, email } from '@vuelidate/validators';
import get from 'lodash/get';
import has from 'lodash/has';
import pick from 'lodash/pick';
import pickBy from 'lodash/pickBy';
import omit from 'lodash/omit';
import cloneDeep from 'lodash/cloneDeep';
import Roles from '@api/Roles';
import Email from '@api/Email';
import Users from '@api/Users';
import UserCompanies from '@api/UserCompanies';
import Button from '@components/Button';
import ResponsiveTable from '@components/table/ResponsiveTable';
import CoachCreationModal from '@components/table/CoachCreationModal';
import CoachEditionModal from '@components/table/CoachEditionModal';
import { NotifyNegative, NotifyWarning, NotifyPositive } from '@components/popup/notify';
import { useUser } from '@composables/user';
import { formatPhone, clear, removeEmptyProps, formatPhoneForPayload } from '@helpers/utils';
import { defineAbilitiesFor } from '@helpers/ability';
import { ROLES_TRANSLATION, CLIENT_ADMIN, COACH } from '@data/constants';
import { frPhoneNumber, countryCode } from '@helpers/vuelidateCustomVal';

export default {
  name: 'CoachList',
  components: {
    'ni-button': Button,
    'ni-responsive-table': ResponsiveTable,
    'coach-creation-modal': CoachCreationModal,
    'coach-edition-modal': CoachEditionModal,
  },
  props: {
    company: { type: Object, default: () => ({}) },
  },
  setup (props) {
    const $store = useStore();

    const { company } = toRefs(props);

    const loading = ref(false);
    const usersLoading = ref(false);
    const coachCreationModal = ref(false);
    const coachEditionModal = ref(false);
    const firstStep = ref(true);
    const usersColumns = ref([
      { name: 'firstname', label: 'Prénom', align: 'left', field: row => get(row, 'identity.firstname') || '' },
      { name: 'lastname', label: 'Nom', align: 'left', field: row => get(row, 'identity.lastname') || '' },
      { name: 'email', label: 'Email', align: 'left', field: row => get(row, 'local.email') || '' },
      {
        name: 'phone',
        label: 'Téléphone',
        align: 'left',
        field: row => (get(row, 'contact.phone') ? row.contact : ''),
        format: formatPhone,
      },
      {
        name: 'role',
        label: 'Role',
        align: 'left',
        field: row => get(row, 'role.client.name') || '',
        format: value => (value ? ROLES_TRANSLATION[value] : ''),
      },
      { name: 'actions', label: '', align: 'center' },
    ]);
    const usersPagination = ref({ rowsPerPage: 0, sortBy: 'lastname' });
    const newCoach = ref({
      identity: { firstname: '', lastname: '' },
      contact: { phone: '', countryCode: '+33' },
      role: '',
      local: { email: '' },
      company: '',
      sendEmail: true,
    });
    const selectedCoach = ref({
      identity: {},
      local: {},
      contact: {},
    });
    const roles = ref([]);
    const users = ref([]);

    const userRules = computed(() => ({
      newCoach: {
        identity: { lastname: { required } },
        local: { email: { required, email } },
        contact: { phone: { frPhoneNumber }, countryCode: { countryCode } },
        role: { required },
      },
      selectedCoach: {
        identity: { lastname: { required } },
        local: { email: { required, email } },
        contact: { phone: { frPhoneNumber }, countryCode: { countryCode } },
        role: { required },
      },
    }));

    const v$ = useVuelidate(userRules, { newCoach, selectedCoach });

    const loggedUser = computed(() => $store.state.main.loggedUser);

    const { emailError, phoneNbrError } = useUser();

    const roleOptions = computed(() => roles.value
      .map(role => ({ label: ROLES_TRANSLATION[role.name], value: role._id })));

    const canSetUserCompany = computed(() => {
      const ability = defineAbilitiesFor(pick(loggedUser.value, ['role', 'company']));

      return ability.can('set', 'user_company');
    });

    const formatUserPayload = (user) => {
      let userPayload = cloneDeep(user);
      if (get(user, 'contact.phone')) userPayload.contact.phone = formatPhoneForPayload(user.contact.phone);
      else userPayload.contact.countryCode = '';
      userPayload = removeEmptyProps(userPayload);
      if (canSetUserCompany.value) userPayload.company = company.value._id;
      return omit(userPayload, 'sendEmail');
    };

    const nextStep = async () => {
      try {
        loading.value = true;
        v$.value.newCoach.local.email.$touch();
        if (v$.value.newCoach.local.email.$error) return NotifyWarning('Champs invalides');
        const userInfo = await Users.exists({ email: newCoach.value.local.email });
        const { user } = userInfo;

        const sameOrNoCompany = !user.company || user.company === company.value._id;
        const noDataOnUser = !Object.keys(user).length;
        if (userInfo.exists && (!sameOrNoCompany || noDataOnUser)) {
          return NotifyNegative('Ce compte n\'est pas relié à cette structure.');
        }
        if (userInfo.exists && get(userInfo, 'user.role.client')) return NotifyNegative('Compte déjà existant.');

        if (userInfo.exists) {
          const payload = { role: newCoach.value.role };
          if (!user.company) await UserCompanies.create({ user: userInfo.user._id, company: company.value._id });

          await Users.updateById(userInfo.user._id, payload);

          NotifyPositive('Compte créé.');
          await getUsers();
          coachCreationModal.value = false;
        } else firstStep.value = false;
      } catch (e) {
        console.error(e);
        if (e.status === 409) return NotifyNegative(e.data.message);
        NotifyNegative('Erreur lors de la création du compte.');
      } finally {
        loading.value = false;
      }
    };

    const sendEmail = async () => {
      try {
        const userRole = roles.value.find(role => role._id === newCoach.value.role);
        if (!get(userRole, 'name')) return NotifyNegative('Problème lors de l\'envoi du mail.');

        await Email.sendWelcome({ email: newCoach.value.local.email, type: get(userRole, 'name') });
        NotifyPositive('Email envoyé.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de l\'envoi du mail.');
      }
    };

    const createCoach = async () => {
      try {
        loading.value = true;
        v$.value.newCoach.$touch();
        if (v$.value.newCoach.$error) return NotifyWarning('Champ(s) invalide(s)');

        await Users.create(formatUserPayload(newCoach.value));

        NotifyPositive('Compte enregistré.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la création du compte.');
      } finally {
        loading.value = false;
      }

      if (newCoach.value.sendEmail) await sendEmail();

      await getUsers();
      coachCreationModal.value = false;
    };

    const resetCoachCreationForm = () => {
      firstStep.value = true;
      newCoach.value = { ...clear(newCoach.value), contact: { phone: '', countryCode: '+33' }, sendEmail: true };
      v$.value.newCoach.$reset();
    };

    const getRoles = async () => {
      try {
        roles.value = await Roles.list({ name: [CLIENT_ADMIN, COACH] });
      } catch (e) {
        console.error(e);
        roles.value = [];
      }
    };

    const openCoachCreationModal = async () => {
      if (!roles.value.length) await getRoles();
      const coachRole = roles.value.find(role => role.name === COACH);
      if (coachRole) newCoach.value.role = coachRole._id;
    };

    const openCoachEditionModal = async (user) => {
      if (!roles.value.length) await getRoles();
      selectedCoach.value = {
        ...selectedCoach.value,
        ...(!get(user, 'contact.countryCode') && { contact: { countryCode: '+33' } }),
        role: user.role.client._id,
        ...pick(
          cloneDeep(user),
          ['_id', 'identity.firstname', 'identity.lastname', 'local.email', 'contact.phone', 'contact.countryCode']
        ),
      };
      coachEditionModal.value = true;
    };

    const resetCoachEditionForm = () => {
      v$.value.selectedCoach.$reset();
      selectedCoach.value = { identity: {}, local: {}, contact: {} };
    };

    const formatUpdatedUserPayload = (user) => {
      const userPayload = pickBy(
        pick(
          user,
          ['identity.firstname', 'identity.lastname', 'local.email', 'role', 'contact.phone', 'contact.countryCode']
        )
      );
      if (get(user, 'contact.phone')) userPayload.contact.phone = formatPhoneForPayload(user.contact.phone);
      else if (!has(user, 'contact.phone')) return omit(userPayload, 'contact.countryCode');

      return userPayload;
    };

    const updateCoach = async () => {
      try {
        loading.value = true;
        v$.value.selectedCoach.$touch();
        if (v$.value.selectedCoach.$error) return NotifyWarning('Champ(s) invalide(s)');

        await Users.updateById(selectedCoach.value._id, formatUpdatedUserPayload(selectedCoach.value));
        coachEditionModal.value = false;
        await getUsers();
        NotifyPositive('Compte modifié.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la modification du compte.');
      } finally {
        loading.value = false;
      }
    };

    const getUsers = async () => {
      try {
        usersLoading.value = true;
        users.value = await Users.list({ role: [CLIENT_ADMIN, COACH], company: company.value._id });
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des comptes.');
        users.value = [];
      } finally {
        usersLoading.value = false;
      }
    };

    const created = async () => {
      await getUsers();
    };

    created();

    return {
      // Data
      loading,
      usersLoading,
      coachCreationModal,
      coachEditionModal,
      firstStep,
      usersColumns,
      usersPagination,
      newCoach,
      selectedCoach,
      users,
      // Validations
      v$,
      // Computed
      roleOptions,
      // Methods
      nextStep,
      createCoach,
      resetCoachCreationForm,
      openCoachCreationModal,
      openCoachEditionModal,
      resetCoachEditionForm,
      updateCoach,
      get,
      emailError,
      phoneNbrError,
    };
  },
};
</script>
