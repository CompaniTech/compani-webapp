<template>
  <q-page padding class="client-background">
    <ni-title-header title="Factures">
      <template v-if="hasHoldingRole" #content>
        <ni-select caption="Structure" :model-value="selectedCompany._id"
          :options="companiesOptions" @update:model-value="setCompany($event)" clearable class="selector" />
      </template>
    </ni-title-header>
    <course-billing-infos v-if="currentCompany" :company="currentCompany" @refresh-company="refreshCompany" />
  </q-page>
</template>

<script>
import get from 'lodash/get';
import { useMeta } from 'quasar';
import { computed, ref, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import { useRoute } from 'vue-router';
import Companies from '@api/Companies';
import TitleHeader from '@components/TitleHeader';
import Select from '@components/form/Select';
import { NotifyNegative } from '@components/popup/notify';
import CourseBillingInfos from '@components/courseBilling/CourseBillingInfos';
import { formatAndSortOptions } from '@helpers/utils';

export default {
  name: 'BillingProfile',
  components: {
    'ni-title-header': TitleHeader,
    'course-billing-infos': CourseBillingInfos,
    'ni-select': Select,
  },
  setup () {
    const metaInfo = { title: 'Factures' };
    useMeta(metaInfo);

    const $route = useRoute();

    const selectedCompany = ref({});
    const companiesOptions = ref([]);

    const $store = useStore();
    const loggedUser = computed(() => $store.state.main.loggedUser);

    const hasHoldingRole = computed(() => !!get(loggedUser.value, 'role.holding'));

    const currentCompany = computed(() => (
      hasHoldingRole.value
        ? selectedCompany.value
        : $store.state.company.company
    ));

    const setCompany = async (companyId) => {
      try {
        if (!companyId) {
          selectedCompany.value = {};
          return;
        }
        await $store.dispatch('company/fetchCompany', { companyId });
        selectedCompany.value = $store.state.company.company;
      } catch (e) {
        console.error(e);
      }
    };

    const refreshHoldingCompanies = async () => {
      try {
        const companies = await Companies.list({ holding: loggedUser.value.holding._id });
        companiesOptions.value = formatAndSortOptions(companies, 'name');
      } catch (e) {
        console.error(e);
        companiesOptions.value = [];
        NotifyNegative('Erreur lors de la récupération des structures.');
      }
    };

    const refreshCompany = async () => {
      try {
        if (hasHoldingRole.value) {
          if (currentCompany.value._id) {
            await $store.dispatch('company/fetchCompany', { companyId: currentCompany.value._id });
          }
          if ($store.state.company.company) selectedCompany.value = $store.state.company.company;
        } else await $store.dispatch('company/fetchCompany', { companyId: loggedUser.value.company._id });
      } catch (e) {
        console.error(e);
      }
    };

    const created = async () => {
      await refreshCompany();
      if (hasHoldingRole.value) await refreshHoldingCompanies();
    };

    created();

    onBeforeUnmount(() => {
      if ($route.name !== 'ni courses info') $store.dispatch('company/resetCompany');
    });

    return {
      // Data
      selectedCompany,
      companiesOptions,
      // Computed
      currentCompany,
      hasHoldingRole,
      // Methods
      setCompany,
      refreshCompany,
    };
  },
};
</script>

<style lang="sass" scoped>
.selector
  width: 50%
</style>
