<template>
  <div>
    <q-page padding class="vendor-background q-pb-xl">
      <ni-title-header title="Configuration" class="q-mb-xl" />
      <div class="q-mb-xl">
        <p class="text-weight-bold">Informations de l'organisation</p>
        <div class="row gutter-profile">
          <ni-input caption="Raison sociale" v-model="vendorCompany.name" @focus="saveTmp('name')"
            @blur="updateVendorCompany('name')" :error="validations.vendorCompany.name.$error" required-field />
          <ni-search-address v-model="vendorCompany.address" :error-message="addressErrorMessage"
            @blur="updateVendorCompany('address')" @focus="saveTmp('address.fullAddress')" required-field
            :error="validations.vendorCompany.address.$error" />
          <ni-input caption="SIRET" v-model="vendorCompany.siret" @focus="saveTmp('siret')" required-field
            @blur="updateVendorCompany('siret')" :error="validations.vendorCompany.siret.$error"
            :error-message="siretErrorMessage" />
          <ni-input caption="Numéro de déclaration d'activité" v-model="vendorCompany.activityDeclarationNumber"
            @focus="saveTmp('activityDeclarationNumber')" @blur="updateVendorCompany('activityDeclarationNumber')"
            :error="validations.vendorCompany.activityDeclarationNumber.$error" required-field />
          <ni-input caption="IBAN" v-model="vendorCompany.iban" @blur="updateVendorCompany('iban')" required-field
            :error="validations.vendorCompany.iban.$error" :error-message="ibanErrorMessage" @focus="saveTmp('iban')" />
          <ni-input caption="BIC" v-model="vendorCompany.bic" @focus="saveTmp('bic')" @blur="updateVendorCompany('bic')"
            :error="validations.vendorCompany.bic.$error" :error-message="bicErrorMessage" required-field />
          <ni-input caption="Capital social" v-model="vendorCompany.shareCapital" @focus="saveTmp('shareCapital')"
            @blur="updateVendorCompany('shareCapital')" :error="validations.vendorCompany.shareCapital.$error"
            :error-message="shareCapitalErrorMessage" required-field />
          <ni-input caption="ICS" v-model="vendorCompany.ics" @focus="saveTmp('ics')" @blur="updateVendorCompany('ics')"
            :error="validations.vendorCompany.ics.$error" :error-message="icsErrorMessage" required-field />
          <ni-file-uploader caption="Template mandat de prélèvement SEPA" path="debitMandateTemplate"
            :entity="vendorCompany" :url="templateUploadUrl" @delete="validateTemplateDeletion"
            @uploaded="templateUploaded" drive-storage hide-image :extensions="UPLOAD_TEMPLATE_EXTENSIONS" />
        </div>
      </div>
      <p class="text-weight-bold">Contacts</p>
      <div class="interlocutor-container q-mb-xl">
        <interlocutor-cell :interlocutor="vendorCompany.billingRepresentative" caption="Chargé de facturation"
          label="Ajouter un chargé de facturation" can-update @open-modal="openBillingRepresentativeModal" />
      </div>
      <p class="text-weight-bold">Financeurs</p>
      <q-card>
        <ni-responsive-table :data="courseFundingOrganisations" :columns="courseFundingOrganisationColumns"
          v-model:pagination="pagination" class="q-mb-md" :loading="organisationsLoading">
          <template #body="{ props }">
            <q-tr :props="props">
                <q-td v-for="col in props.cols" :key="col.name" :data-label="col.label" :props="props"
                  :class="col.name">
                  <template v-if="col.name === 'actions'">
                    <div class="row no-wrap table-actions">
                      <ni-button icon="delete" @click="validateOrganisationDeletion(col.value)"
                        :disable="!!props.row.courseBillCount" />
                    </div>
                  </template>
                  <template v-else>{{ col.value }}</template>
                </q-td>
            </q-tr>
          </template>
        </ni-responsive-table>
        <q-card-actions align="right">
          <ni-button color="primary" icon="add" label="Ajouter un financeur" :disable="organisationsLoading"
            @click="openOrganisationCreationModal" />
        </q-card-actions>
      </q-card>
      <p class="text-weight-bold q-mt-xl">Articles de facturation</p>
      <q-card>
        <ni-responsive-table :data="courseBillingItems" :columns="courseBillingItemColumns"
          v-model:pagination="pagination" class="q-mb-md" :loading="itemsLoading">
          <template #body="{ props }">
            <q-tr :props="props">
              <q-td v-for="col in props.cols" :key="col.name" :data-label="col.label" :props="props" :class="col.name">
                <template v-if="col.name === 'actions'">
                  <div class="row no-wrap table-actions">
                    <ni-button icon="delete" @click="validateBillingItemsDeletion(col.value)"
                      :disable="!!props.row.courseBillCount" />
                  </div>
                </template>
                <template v-else>{{ col.value }}</template>
              </q-td>
            </q-tr>
          </template>
        </ni-responsive-table>
        <q-card-actions align="right">
          <ni-button color="primary" icon="add" label="Ajouter un article" :disable="itemsLoading"
            @click="openItemCreationModal" />
        </q-card-actions>
      </q-card>
    </q-page>

    <ni-organisation-creation-modal v-model="organisationCreationModal" v-model:new-organisation="newOrganisation"
      @submit="addOrganisation" :validations="validations.newOrganisation" @hide="resetOrganisationAdditionForm"
      :loading="organisationsLoading" />

    <ni-item-creation-modal v-model="itemCreationModal" v-model:new-item="newItem"
      @submit="addItem" :validations="validations.newItem" @hide="resetItemAdditionForm"
      :loading="itemsLoading" />

    <interlocutor-modal v-model="billingRepresentativeModal" v-model:interlocutor="tmpBillingRepresentativeId"
      @submit="updateVendorCompany('billingRepresentative')" :label="billingRepresentativeModalLabel"
      :interlocutors-options="billingRepresentativeOptions" :loading="billingRepresentativeModalLoading"
      :validations="validations.tmpBillingRepresentativeId" @hide="resetBillingRepresentative" />
  </div>
</template>

<script>
import { useMeta, useQuasar } from 'quasar';
import { computed, ref } from 'vue';
import useVuelidate from '@vuelidate/core';
import { required } from '@vuelidate/validators';
import get from 'lodash/get';
import set from 'lodash/set';
import { frAddress, validSiret, iban, bic, strictPositiveNumber, ics } from '@helpers/vuelidateCustomVal';
import { sortStrings, formatAndSortUserOptions } from '@helpers/utils';
import CourseFundingOrganisations from '@api/CourseFundingOrganisations';
import VendorCompanies from '@api/VendorCompanies';
import CourseBillingItems from '@api/CourseBillingItems';
import Users from '@api/Users';
import { NotifyNegative, NotifyPositive, NotifyWarning } from '@components/popup/notify';
import TitleHeader from '@components/TitleHeader';
import ResponsiveTable from '@components/table/ResponsiveTable';
import Button from '@components/Button';
import Input from '@components/form/Input';
import SearchAddress from '@components/form/SearchAddress';
import OrganisationCreationModal from 'src/modules/vendor/components/billing/CourseFundingOrganisationCreationModal';
import ItemCreationModal from 'src/modules/vendor/components/billing/CourseBillingItemCreationModal';
import InterlocutorCell from '@components/courses/InterlocutorCell';
import InterlocutorModal from '@components/courses/InterlocutorModal';
import FileUploader from '@components/form/FileUploader';
import {
  REQUIRED_LABEL,
  EDITION,
  TRAINING_ORGANISATION_MANAGER,
  VENDOR_ADMIN,
  UPLOAD_TEMPLATE_EXTENSIONS,
} from '@data/constants';
import { useValidations } from '@composables/validations';

export default {
  name: 'BillingConfig',
  components: {
    'ni-title-header': TitleHeader,
    'ni-responsive-table': ResponsiveTable,
    'ni-organisation-creation-modal': OrganisationCreationModal,
    'ni-item-creation-modal': ItemCreationModal,
    'ni-button': Button,
    'ni-input': Input,
    'ni-search-address': SearchAddress,
    'interlocutor-cell': InterlocutorCell,
    'interlocutor-modal': InterlocutorModal,
    'ni-file-uploader': FileUploader,
  },
  setup () {
    const metaInfo = { title: 'Configuration' };
    useMeta(metaInfo);
    const $q = useQuasar();

    const organisationsLoading = ref(false);
    const itemsLoading = ref(false);
    const courseFundingOrganisations = ref([]);
    const courseFundingOrganisationColumns = [
      { name: 'name', label: 'Nom', align: 'left', field: 'name' },
      { name: 'address', label: 'Adresse', align: 'left', field: 'address' },
      { name: 'actions', label: '', align: 'right', field: '_id', style: 'width: 10%' },
    ];
    const vendorCompany = ref({
      name: '',
      address: { fullAddress: '' },
      siret: '',
      billingRepresentative: {},
      activityDeclarationNumber: '',
      iban: '',
      bic: '',
      shareCapital: '',
      ics: '',
    });
    const courseBillingItems = ref([]);
    const courseBillingItemColumns = [
      { name: 'name', label: 'Nom', align: 'left', field: 'name' },
      { name: 'actions', label: '', align: 'right', field: '_id', style: 'width: 10%' },
    ];
    const pagination = { rowsPerPage: 0 };
    const organisationCreationModal = ref(false);
    const itemCreationModal = ref(false);
    const newOrganisation = ref({ name: '', address: '' });
    const newItem = ref({ name: '' });
    const tmpInput = ref('');
    const billingRepresentativeOptions = ref([]);
    const billingRepresentativeModal = ref(false);
    const billingRepresentativeModalLoading = ref(false);
    const billingRepresentativeModalLabel = ref({ action: '', interlocutor: '' });
    const tmpBillingRepresentativeId = ref('');

    const rules = {
      newOrganisation: { address: { required }, name: { required } },
      newItem: { name: { required } },
      vendorCompany: {
        name: { required },
        siret: { required, validSiret },
        address: { fullAddress: { required, frAddress } },
        activityDeclarationNumber: { required },
        iban: { required, iban },
        bic: { required, bic },
        shareCapital: { required, strictPositiveNumber },
        ics: { required, ics },
      },
      tmpBillingRepresentativeId: { required },
    };
    const validations = useVuelidate(rules, { newOrganisation, newItem, vendorCompany, tmpBillingRepresentativeId });
    const { waitForValidation } = useValidations();

    const siretErrorMessage = computed(() => {
      const validation = get(validations, 'value.vendorCompany.siret');

      if (get(validation, 'required.$response') === false) return REQUIRED_LABEL;
      if (get(validation, 'validSiret.$response') === false) return 'SIRET non valide';

      return '';
    });

    const addressErrorMessage = computed(() => {
      const validation = get(validations, 'value.vendorCompany.address.fullAddress');

      if (get(validation, 'required.$response') === false) return REQUIRED_LABEL;
      if (get(validation, 'frAddress.$response') === false) return 'Adresse non valide';

      return '';
    });

    const ibanErrorMessage = computed(() => {
      const validation = get(validations, 'value.vendorCompany.iban');

      if (get(validation, 'required.$response') === false) return REQUIRED_LABEL;
      if (get(validation, 'iban.$response') === false) return 'IBAN non valide';

      return '';
    });

    const bicErrorMessage = computed(() => {
      const validation = get(validations, 'value.vendorCompany.bic');

      if (get(validation, 'required.$response') === false) return REQUIRED_LABEL;
      if (get(validation, 'bic.$response') === false) return 'BIC non valide';

      return '';
    });

    const icsErrorMessage = computed(() => {
      const validation = get(validations, 'value.vendorCompany.ics');

      if (get(validation, 'required.$response') === false) return REQUIRED_LABEL;
      if (get(validation, 'ics.$response') === false) return 'ICS non valide';

      return '';
    });

    const shareCapitalErrorMessage = computed(() => {
      const validation = get(validations, 'value.vendorCompany.shareCapital');
      if (get(validation, 'required.$response') === false) return REQUIRED_LABEL;
      if (get(validation, 'strictPositiveNumber.$response') === false) return 'Nombre non valide';

      return '';
    });

    const templateUploadUrl = computed(() => `${process.env.API_HOSTNAME}/vendorcompanies/mandate/upload`);

    const refreshVendorCompany = async () => {
      try {
        vendorCompany.value = await VendorCompanies.get();
        validations.value.vendorCompany.$touch();
      } catch (e) {
        console.error(e);
        vendorCompany.value = { name: '', address: { fullAddress: '' }, siret: '', billingRepresentative: {} };
        NotifyNegative('Erreur lors de la récupération de la structure.');
      }
    };

    const saveTmp = (path) => {
      tmpInput.value = get(vendorCompany.value, path);
    };

    const updateVendorCompany = async (path) => {
      try {
        if (path === 'address' && tmpInput.value === get(vendorCompany.value, 'address.fullAddress')) return;
        if (tmpInput.value === get(vendorCompany.value, path)) return;

        if (get(validations.value.vendorCompany, path)) {
          const isValid = await waitForValidation(validations.value.vendorCompany, path);
          if (!isValid) return NotifyWarning('Champ(s) invalide(s)');
        }

        let payload;
        if (path === 'billingRepresentative') {
          billingRepresentativeModalLoading.value = true;
          validations.value.tmpBillingRepresentativeId.$touch();
          if (validations.value.tmpBillingRepresentativeId.$error) return NotifyWarning('Champ(s) invalide(s)');

          payload = { billingRepresentative: tmpBillingRepresentativeId.value };
        } else {
          payload = set({}, path, get(vendorCompany.value, path));
        }

        await VendorCompanies.update(payload);
        NotifyPositive('Modification enregistrée.');

        await refreshVendorCompany();
        billingRepresentativeModal.value = false;
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la modification.');
      } finally {
        tmpBillingRepresentativeId.value = '';
        billingRepresentativeModalLoading.value = false;
      }
    };

    const refreshCourseFundingOrganisations = async () => {
      try {
        const organisations = await CourseFundingOrganisations.list();
        courseFundingOrganisations.value = organisations.sort((a, b) => sortStrings(a.name, b.name));
      } catch (e) {
        console.error(e);
        courseFundingOrganisations.value = [];
        NotifyNegative('Erreur lors de la récupération des financeurs.');
      }
    };

    const refreshCourseBillingItems = async () => {
      try {
        const items = await CourseBillingItems.list();
        courseBillingItems.value = items.sort((a, b) => sortStrings(a.name, b.name));
      } catch (e) {
        console.error(e);
        courseBillingItems.value = [];
        NotifyNegative('Erreur lors de la récupération des articles.');
      }
    };

    const openOrganisationCreationModal = () => { organisationCreationModal.value = true; };
    const resetOrganisationAdditionForm = () => {
      newOrganisation.value = { name: '', address: '' };
      validations.value.newOrganisation.$reset();
    };
    const addOrganisation = async () => {
      try {
        validations.value.newOrganisation.$touch();
        if (validations.value.newOrganisation.$error) return NotifyWarning('Champ(s) invalide(s)');

        organisationsLoading.value = true;
        await CourseFundingOrganisations.create(newOrganisation.value);
        NotifyPositive('Financeur ajouté.');

        organisationCreationModal.value = false;
        await refreshCourseFundingOrganisations();
      } catch (e) {
        console.error(e);
        if (e.status === 409) return NotifyNegative(e.data.message);
        NotifyNegative('Erreur lors de l\'ajout du financeur.');
      } finally {
        organisationsLoading.value = false;
      }
    };

    const deleteOrganisation = async (organisationId) => {
      try {
        await CourseFundingOrganisations.delete(organisationId);
        await refreshCourseFundingOrganisations();
        NotifyPositive('Financeur supprimé.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la suppression du financeur.');
      }
    };

    const validateOrganisationDeletion = (organisationId) => {
      $q.dialog({
        title: 'Confirmation',
        message: 'Êtes-vous sûr(e) de vouloir supprimer le financeur&nbsp;?',
        html: true,
        ok: true,
        cancel: 'Annuler',
      }).onOk(() => deleteOrganisation(organisationId))
        .onCancel(() => NotifyPositive('Suppression annulée.'));
    };

    const openItemCreationModal = () => { itemCreationModal.value = true; };

    const resetItemAdditionForm = () => {
      newItem.value = { name: '' };
      validations.value.newItem.$reset();
    };

    const addItem = async () => {
      try {
        validations.value.newItem.$touch();
        if (validations.value.newItem.$error) return NotifyWarning('Champ(s) invalide(s)');

        itemsLoading.value = true;
        await CourseBillingItems.create(newItem.value);
        NotifyPositive('Article ajouté.');

        itemCreationModal.value = false;
        await refreshCourseBillingItems();
      } catch (e) {
        console.error(e);
        if (e.status === 409) return NotifyNegative(e.data.message);
        NotifyNegative('Erreur lors de l\'ajout de l\'article.');
      } finally {
        itemsLoading.value = false;
      }
    };

    const deleteBillingItems = async (billingItemId) => {
      try {
        await CourseBillingItems.delete(billingItemId);
        await refreshCourseBillingItems();
        NotifyPositive('Article de facturation supprimé.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la suppression de l’article de facturation.');
      }
    };

    const validateBillingItemsDeletion = (billingItemId) => {
      $q.dialog({
        title: 'Confirmation',
        message: 'Êtes-vous sûr(e) de vouloir supprimer l\'article de facturation&nbsp;?',
        html: true,
        ok: true,
        cancel: 'Annuler',
      }).onOk(() => deleteBillingItems(billingItemId))
        .onCancel(() => NotifyPositive('Suppression annulée.'));
    };

    const openBillingRepresentativeModal = (event) => {
      const { action: eventAction } = event;
      const action = eventAction === EDITION ? 'Modifier le ' : 'Ajouter un ';

      tmpBillingRepresentativeId.value = get(vendorCompany.value, 'billingRepresentative._id');
      billingRepresentativeModalLabel.value = { action, interlocutor: 'chargé de facturation' };
      billingRepresentativeModal.value = true;
    };

    const refreshBillingRepresentativeOptions = async () => {
      const vendorUsers = await Users.list({ role: [TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN] });

      billingRepresentativeOptions.value = formatAndSortUserOptions(vendorUsers, false);
    };

    const resetBillingRepresentative = () => {
      tmpBillingRepresentativeId.value = '';
      billingRepresentativeModalLabel.value = { action: '', interlocutor: '' };
      validations.value.tmpBillingRepresentativeId.$reset();
    };

    const templateUploaded = async () => {
      NotifyPositive('Document chargé.');

      await refreshVendorCompany();
    };

    const deleteTemplate = async () => {
      try {
        await VendorCompanies.removeTemplate();

        await refreshVendorCompany();
        NotifyPositive('Template supprimé.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la suppression du template.');
      }
    };

    const validateTemplateDeletion = async () => {
      $q.dialog({
        title: 'Confirmation',
        message: 'Êtes-vous sûr(e) de vouloir supprimer ce template&nbsp;?',
        html: true,
        ok: true,
        cancel: 'Annuler',
      }).onOk(deleteTemplate)
        .onCancel(() => NotifyPositive('Suppression annulée.'));
    };

    const created = async () => {
      await refreshVendorCompany();
      await refreshCourseFundingOrganisations();
      await refreshCourseBillingItems();
      await refreshBillingRepresentativeOptions();
    };

    created();

    return {
      // Data
      courseFundingOrganisationColumns,
      courseBillingItemColumns,
      organisationsLoading,
      itemsLoading,
      pagination,
      courseFundingOrganisations,
      courseBillingItems,
      organisationCreationModal,
      itemCreationModal,
      vendorCompany,
      newOrganisation,
      newItem,
      billingRepresentativeOptions,
      billingRepresentativeModalLabel,
      billingRepresentativeModal,
      billingRepresentativeModalLoading,
      tmpBillingRepresentativeId,
      UPLOAD_TEMPLATE_EXTENSIONS,
      // Computed
      validations,
      siretErrorMessage,
      addressErrorMessage,
      ibanErrorMessage,
      bicErrorMessage,
      shareCapitalErrorMessage,
      icsErrorMessage,
      templateUploadUrl,
      // Methods
      refreshCourseFundingOrganisations,
      resetOrganisationAdditionForm,
      addOrganisation,
      openOrganisationCreationModal,
      validateOrganisationDeletion,
      validateBillingItemsDeletion,
      refreshCourseBillingItems,
      resetItemAdditionForm,
      addItem,
      openItemCreationModal,
      saveTmp,
      updateVendorCompany,
      openBillingRepresentativeModal,
      resetBillingRepresentative,
      templateUploaded,
      validateTemplateDeletion,
    };
  },
};
</script>
