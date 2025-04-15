<template>
  <div>
    <div v-if="canUpdateTrainerMissions" class="clickable-name text-italic q-mb-md">
      <router-link v-if="hasGroupCourses" :to="goToGroupCourseDirectory()" @click="setSelectedTrainer" class="q-mr-md">
        Voir les formations de groupe du formateur
      </router-link>
      <router-link v-if="hasSingleCourses" :to="goToSingleCourseDirectory()" @click="setSelectedTrainer">
        Voir les formations individuelles du formateur
      </router-link>
    </div>
    <div v-else-if="courseList.length" class="clickable-name text-italic q-mb-md">
      <router-link :to="goToGroupCourseDirectory()" @click="setSelectedTrainer">Voir mes formations</router-link>
    </div>
    <trainer-mission-table :trainer-missions="trainerMissions" :loading="missionCreationLoading"
      @refresh="refreshTrainerMissions" :can-update="canUpdateTrainerMissions" />
    <q-btn v-if="canUpdateTrainerMissions" class="fixed fab-custom" no-caps rounded icon="add"
      label="Créer un ordre de mission" color="primary" @click="openTrainerMissionCreationModal"
      :loading="missionCreationLoading" :disable="!activeCourseList.length" />

    <trainer-mission-creation-modal v-model="missionCreationModal" v-model:trainer-mission="newTrainerMission"
      @submit="nextStep" :validations="v$.newTrainerMission" @hide="resetMissionCreationModal"
      :loading="missionCreationLoading" :courses="coursesWithoutTrainerMission"
      v-model:creation-method="creationMethod" />

    <trainer-mission-infos-modal v-model="trainerMissionInfosModal" :courses="selectedCourses"
      :fee="Number(newTrainerMission.fee)" :loading="missionCreationLoading" @submit="createTrainerMission"
      @hide="resetMissionCreationModal" :trainer="trainer" />
  </div>
</template>

<script>
import { subject } from '@casl/ability';
import { useStore } from 'vuex';
import { computed, ref } from 'vue';
import get from 'lodash/get';
import pick from 'lodash/pick';
import useVuelidate from '@vuelidate/core';
import { required, requiredIf } from '@vuelidate/validators';
import { positiveNumber } from '@helpers/vuelidateCustomVal';
import { defineAbilitiesForCourse } from '@helpers/ability';
import Courses from '@api/Courses';
import TrainerMissions from '@api/TrainerMissions';
import { NotifyNegative, NotifyPositive, NotifyWarning } from '@components/popup/notify';
import { TRAINER, BLENDED, OPERATIONS, UPLOAD, SINGLE } from '@data/constants';
import TrainerMissionCreationModal from '@components/courses/TrainerMissionCreationModal';
import TrainerMissionTable from '@components/courses/TrainerMissionTable';
import TrainerMissionInfosModal from '@components/courses/TrainerMissionInfosModal';

export default {
  name: 'ProfileContract',
  components: {
    'trainer-mission-creation-modal': TrainerMissionCreationModal,
    'trainer-mission-table': TrainerMissionTable,
    'trainer-mission-infos-modal': TrainerMissionInfosModal,
  },
  setup () {
    const $store = useStore();

    const missionCreationModal = ref(false);
    const missionCreationLoading = ref(false);
    const newTrainerMission = ref({ courses: [], fee: 0, program: '', file: '' });
    const activeCourseList = ref([]);
    const courseList = ref([]);
    const trainerMissions = ref([]);
    const creationMethod = ref(UPLOAD);
    const trainerMissionInfosModal = ref(false);

    const loggedUser = computed(() => $store.state.main.loggedUser);

    const canUpdateTrainerMissions = computed(() => {
      const ability = defineAbilitiesForCourse(pick(loggedUser.value, ['role']));

      return ability.can('update', subject('Courses', activeCourseList.value), 'trainer_missions');
    });

    const hasGroupCourses = computed(() => courseList.value.some(c => c.type !== SINGLE));

    const hasSingleCourses = computed(() => courseList.value.some(c => c.type === SINGLE));

    const rules = computed(() => ({
      newTrainerMission: {
        program: { required },
        file: { required: requiredIf(creationMethod.value === UPLOAD) },
        fee: { required, positiveNumber },
        courses: { required },
      },
    }));

    const v$ = useVuelidate(rules, { newTrainerMission });

    const trainer = computed(() => (TRAINER === get(loggedUser.value, 'role.vendor.name')
      ? loggedUser.value
      : $store.state.userProfile.userProfile));

    const coursesWithoutTrainerMission = computed(() => {
      const coursesWithActiveTrainerMissions = trainerMissions.value
        .filter(tm => !tm.cancelledAt)
        .map(tm => tm.courses.map(c => c._id))
        .flat();

      return activeCourseList.value.filter(c => !coursesWithActiveTrainerMissions.includes(c._id));
    });

    const selectedCourses = computed(() => activeCourseList.value
      .filter(c => newTrainerMission.value.courses.includes(c._id)));

    const refreshCourses = async () => {
      try {
        const courses = await await Courses.list({
          trainer: trainer.value._id,
          format: BLENDED,
          action: OPERATIONS,
        });
        courseList.value = courses;
        activeCourseList.value = courses.filter(c => !c.archivedAt);
      } catch (e) {
        console.error(e);
        activeCourseList.value = [];
        NotifyNegative('Erreur lors de la récupération des formations.');
      }
    };

    const refreshTrainerMissions = async () => {
      try {
        const missions = await TrainerMissions.list({ trainer: trainer.value._id });
        trainerMissions.value = missions;
      } catch (e) {
        console.error(e);
        trainerMissions.value = [];
        NotifyNegative('Erreur lors de la récupération des ordres de mission.');
      }
    };

    const formatPayload = () => {
      const { courses, file, fee } = newTrainerMission.value;
      const form = new FormData();
      courses.forEach(course => form.append('courses', course));
      if (file) form.append('file', file);
      form.append('trainer', trainer.value._id);
      form.append('fee', fee);

      return form;
    };

    const nextStep = async () => {
      v$.value.newTrainerMission.$touch();
      if (v$.value.newTrainerMission.$error) return NotifyWarning('Champ(s) invalide(s)');
      if (creationMethod.value === UPLOAD) await createTrainerMission();
      else {
        trainerMissionInfosModal.value = true;
        missionCreationModal.value = false;
      }
    };

    const createTrainerMission = async () => {
      try {
        missionCreationLoading.value = true;

        await TrainerMissions.create(formatPayload());

        missionCreationModal.value = false;
        trainerMissionInfosModal.value = false;
        resetMissionCreationModal();
        NotifyPositive('Ordre de mission ajouté.');
        await refreshTrainerMissions();
      } catch (e) {
        console.error(e);
        if (e.data.statusCode === 409) return NotifyNegative(e.data.message);
        NotifyNegative('Erreur lors de l\'ajout de l\'ordre de mission.');
      } finally {
        missionCreationLoading.value = false;
      }
    };

    const openTrainerMissionCreationModal = () => {
      if (!coursesWithoutTrainerMission.value.length) {
        return NotifyWarning('Toutes les formations sont rattachées à un ordre de mission.');
      }

      missionCreationModal.value = true;
    };

    const resetMissionCreationModal = () => {
      if (!trainerMissionInfosModal.value) {
        newTrainerMission.value = { program: '', courses: [], fee: 0, file: '' };
        creationMethod.value = UPLOAD;
        v$.value.newTrainerMission.$reset();
      }
    };
    const setSelectedTrainer = () => $store.dispatch('course/setSelectedTrainer', { trainerId: trainer.value._id });

    const goToGroupCourseDirectory = () => (
      canUpdateTrainerMissions.value ? { name: 'ni management blended courses' } : { name: 'trainers courses' }
    );

    const goToSingleCourseDirectory = () => (
      { name: 'ni management single courses' }
    );

    const created = async () => {
      await Promise.all([refreshCourses(), refreshTrainerMissions()]);
    };

    created();

    return {
      // Validation
      v$,
      // Data
      missionCreationModal,
      missionCreationLoading,
      newTrainerMission,
      trainerMissions,
      activeCourseList,
      courseList,
      hasGroupCourses,
      hasSingleCourses,
      creationMethod,
      trainerMissionInfosModal,
      // Computed
      coursesWithoutTrainerMission,
      selectedCourses,
      canUpdateTrainerMissions,
      trainer,
      // Methods
      openTrainerMissionCreationModal,
      createTrainerMission,
      resetMissionCreationModal,
      goToGroupCourseDirectory,
      goToSingleCourseDirectory,
      setSelectedTrainer,
      nextStep,
      refreshTrainerMissions,
    };
  },
};
</script>
