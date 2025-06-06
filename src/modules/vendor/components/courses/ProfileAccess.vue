<template>
  <div>
    <p class="text-weight-bold">Règle d'accès</p>
    <q-card>
      <ni-responsive-table :data="accessRules" :columns="columns" v-model:pagination="pagination"
        no-data-label="Pas de règle - la formation est en libre accès" :hide-bottom="false">
        <template #body="{ props }">
          <q-tr :props="props">
            <q-td v-for="col in props.cols" :key="col.name" :data-label="col.label" :props="props" :class="col.name"
              :style="col.style">
              <template v-if="col.name === 'actions'">
                <div class="row no-wrap table-actions">
                  <ni-button icon="close" @click="validateAccessRuleDeletion(col.value)" />
                </div>
              </template>
              <template v-else>{{ col.value }}</template>
            </q-td>
          </q-tr>
        </template>
      </ni-responsive-table>
      <q-card-actions align="right">
        <ni-button color="primary" icon="add" label="Ajouter une règle" :disable="tableLoading"
          @click="openAddAccessRuleModal" />
      </q-card-actions>
    </q-card>

    <access-rule-creation-modal v-model="accessRuleCreationModal" :loading="modalLoading" @submit="addAccessRule"
      :validations="v$.newAccessRule" @hide="resetAccessRuleCreationModal" v-model:new-access-rule="newAccessRule"
      :company-options="companyOptions" />
  </div>
</template>

<script>
import { ref, computed, toRefs } from 'vue';
import { useQuasar } from 'quasar';
import { useStore } from 'vuex';
import useVuelidate from '@vuelidate/core';
import { required } from '@vuelidate/validators';
import { DIRECTORY } from '@data/constants';
import ResponsiveTable from '@components/table/ResponsiveTable';
import Button from '@components/Button';
import { NotifyPositive, NotifyNegative, NotifyWarning } from '@components/popup/notify';
import Companies from '@api/Companies';
import Courses from '@api/Courses';
import { formatAndSortCompanyOptions } from '@helpers/utils';
import AccessRuleCreationModal from 'src/modules/vendor/components/courses/AccessRuleCreationModal';

export default {
  name: 'ProfileAccess',
  components: {
    'ni-responsive-table': ResponsiveTable,
    'ni-button': Button,
    'access-rule-creation-modal': AccessRuleCreationModal,
  },
  props: {
    profileId: { type: String, required: true },
  },
  setup (props) {
    const { profileId } = toRefs(props);
    const $q = useQuasar();
    const $store = useStore();

    const tableLoading = ref(false);
    const columns = ref([
      { name: 'name', label: 'Structure', align: 'left', field: 'name', style: 'width: 92%' },
      { name: 'actions', label: '', field: '_id' },
    ]);
    const pagination = ref({ sortBy: 'name', ascending: true, page: 1, rowsPerPage: 15 });
    const newAccessRule = ref([]);
    const companyOptions = ref([]);
    const accessRuleCreationModal = ref(false);
    const modalLoading = ref(false);

    const rules = computed(() => ({
      newAccessRule: { required },
    }));

    const v$ = useVuelidate(rules, { newAccessRule });

    const course = computed(() => $store.state.course.course);

    const accessRules = computed(() => course.value.accessRules || []);

    const refreshCourse = async () => {
      try {
        await $store.dispatch('course/fetchCourse', { courseId: profileId.value });
      } catch (e) {
        console.error(e);
      }
    };

    const openAddAccessRuleModal = async () => {
      try {
        const companies = await Companies.list({ action: DIRECTORY });
        const companiesWithoutAccessRules = companies.filter(
          c => !accessRules.value.map(ar => ar.name).includes(c.name)
        );

        companyOptions.value = formatAndSortCompanyOptions(companiesWithoutAccessRules, 'name');
        accessRuleCreationModal.value = true;
      } catch (e) {
        console.error(e);
        accessRuleCreationModal.value = false;
        companyOptions.value = [];
      }
    };

    const resetAccessRuleCreationModal = () => {
      companyOptions.value = [];
      newAccessRule.value = [];
      v$.value.newAccessRule.$reset();
    };

    const addAccessRule = async () => {
      try {
        v$.value.newAccessRule.$touch();
        if (v$.value.newAccessRule.$error) return NotifyWarning('Une règle d\'accès est requise');

        modalLoading.value = true;
        await Courses.addAccessRule(profileId.value, { companies: newAccessRule.value });

        accessRuleCreationModal.value = false;
        NotifyPositive('Règle d\'accès créée.');

        await refreshCourse();
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la création de la règle d\'accès.');
      } finally {
        modalLoading.value = false;
      }
    };

    const validateAccessRuleDeletion = (accessRuleId) => {
      $q.dialog({
        title: 'Confirmation',
        message: 'Êtes-vous sûr(e) de vouloir supprimer cette règle d\'accès&nbsp;?',
        html: true,
        ok: true,
        cancel: 'Annuler',
      }).onOk(() => deleteAccessRule(accessRuleId))
        .onCancel(() => NotifyPositive('Suppression annulé.'));
    };

    const deleteAccessRule = async (accessRuleId) => {
      try {
        await Courses.deleteAccessRule(profileId.value, accessRuleId);

        NotifyPositive('Règle d\'accès suprimée.');

        await refreshCourse();
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la suppression de la règle d\'accès.');
      }
    };

    return {
      // Validations
      v$,
      // Data
      tableLoading,
      columns,
      pagination,
      newAccessRule,
      companyOptions,
      accessRuleCreationModal,
      modalLoading,
      // Methods
      openAddAccessRuleModal,
      addAccessRule,
      resetAccessRuleCreationModal,
      validateAccessRuleDeletion,
      // Computed
      accessRules,
    };
  },
};
</script>
