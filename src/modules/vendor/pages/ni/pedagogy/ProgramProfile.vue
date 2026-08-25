<template>
  <q-page padding class="vendor-background">
    <ni-profile-header :title="programName" :header-info="headerInfo">
      <template #title v-if="isAdmin">
        <ni-button :flat="false" :label="archiveLabel" @click="validateProgramArchive" />
      </template>
    </ni-profile-header>
    <profile-tabs :profile-id="programId" :tabs-content="tabsContent" @refresh="refreshProgram" />
  </q-page>
</template>

<script>
import { useMeta, useQuasar } from 'quasar';
import { ref, computed, watch, onBeforeUnmount, toRefs } from 'vue';
import get from 'lodash/get';
import { useStore } from 'vuex';
import { useRoute } from 'vue-router';
import Programs from '@api/Programs';
import ProfileHeader from '@components/ProfileHeader';
import ProfileTabs from '@components/ProfileTabs';
import Button from '@components/Button';
import QuestionnaireContainer from '@components/questionnaires/QuestionnaireContainer';
import ProfileInfo from 'src/modules/vendor/components/programs/ProfileInfo';
import ProfileContent from 'src/modules/vendor/components/programs/ProfileContent';
import { NotifyPositive, NotifyNegative } from '@components/popup/notify';
import { VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER } from '@data/constants';
import CompaniDate from '@helpers/dates/companiDates';

export default {
  name: 'ProgramProfile',
  props: {
    programId: { type: String, required: true },
    defaultTab: { type: String, default: 'infos' },
  },
  components: {
    'ni-profile-header': ProfileHeader,
    'profile-tabs': ProfileTabs,
    'ni-button': Button,
  },
  setup (props) {
    const metaInfo = { title: 'Fiche programme' };
    useMeta(metaInfo);
    const { defaultTab, programId } = toRefs(props);
    const $store = useStore();
    const $q = useQuasar();

    const isAdmin = computed(() => {
      const vendorRole = $store.getters['main/getVendorRole'];
      return [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER].includes(vendorRole);
    });
    const programName = ref('');
    const tabsContent = [
      { label: 'Infos', name: 'infos', default: defaultTab.value === 'infos', component: ProfileInfo },
      { label: 'Sous-programmes', name: 'content', default: defaultTab.value === 'content', component: ProfileContent },
      ...isAdmin.value
        ? [{
          label: 'Questionnaires',
          name: 'questionnaire',
          default: defaultTab.value === 'questionnaire',
          component: QuestionnaireContainer,
        }]
        : [],
    ];

    const $route = useRoute();
    const program = computed(() => $store.state.program.program);

    watch(program, () => { refreshProgramName(); });

    const refreshProgramName = () => { programName.value = get(program.value, 'name') || ''; };

    const isArchived = computed(() => !!get(program.value, 'archivedAt'));

    const headerInfo = computed(() => (isArchived.value
      ? [{ icon: 'circle', label: 'Archivé', class: 'info-archived' }]
      : []));

    const archiveLabel = computed(() => (isArchived.value ? 'Désarchiver' : 'Archiver'));

    const refreshProgram = async () => {
      try {
        await $store.dispatch('program/fetchProgram', { programId: programId.value });
      } catch (e) {
        console.error(e);
      }
    };

    const validateProgramArchive = () => {
      const message = isArchived.value
        ? 'Êtes-vous sûr(e) de vouloir désarchiver ce programme&nbsp;? <br /><br /> Il sera de nouveau possible de le'
          + ' modifier et de l\'utiliser pour créer des formations.'
        : 'Êtes-vous sûr(e) de vouloir archiver ce programme&nbsp;? <br /><br /> Vous ne pourrez plus le modifier ni'
          + ' l\'utiliser pour créer des formations.';

      $q.dialog({ title: 'Confirmation', message, html: true, ok: 'Oui', cancel: 'Non' })
        .onOk(archiveOrUnarchiveProgram)
        .onCancel(() => NotifyPositive(isArchived.value ? 'Désarchivage annulé.' : 'Archivage annulé.'));
    };

    const archiveOrUnarchiveProgram = async () => {
      try {
        await Programs.update(programId.value, { archivedAt: isArchived.value ? '' : CompaniDate().toISO() });

        NotifyPositive(isArchived.value ? 'Programme désarchivé.' : 'Programme archivé.');
        await refreshProgram();
      } catch (e) {
        console.error(e);
        NotifyNegative(
          isArchived.value ? 'Erreur lors du désarchivage du programme.' : 'Erreur lors de l\'archivage du programme.'
        );
      }
    };

    const created = async () => {
      if (!program.value) await refreshProgram();
      refreshProgramName();
    };

    onBeforeUnmount(() => {
      if (!(new RegExp(`programs/${get(program.value, '_id')}`)).test($route.path)) {
        $store.dispatch('program/resetProgram');
      }
    });

    created();

    return {
      // Data
      programName,
      tabsContent,
      // Computed
      program,
      isAdmin,
      headerInfo,
      archiveLabel,
      // Methods
      refreshProgram,
      validateProgramArchive,
    };
  },
};
</script>
