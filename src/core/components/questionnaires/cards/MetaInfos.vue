<template>
  <div class="container elm-width">
    <span class="title">{{ programName }}</span>
    <div class="items-container">
      <q-item v-for="info in headerInfo" :key="info.icon">
        <q-item-section side>
          <q-icon size="16px" :name="info.icon" />
        </q-item-section>
        <q-item-section>{{ info.label }}</q-item-section>
      </q-item>
    </div>
    <span class="questionnaire-type">Questionnaire {{ questionnaireType }}</span>
    <span v-if="displayName" class="trainee-identity">
      Vous complétez ce questionnaire en tant que: {{ traineeName }}
    </span>
  </div>
</template>

<script>
import { toRefs, computed } from 'vue';
import { composeCourseName, getQuestionnaireTypeTitle } from '@helpers/courses';
import { useCourses } from '@composables/courses';

export default {
  name: 'MetaInfos',
  components: { },
  props: {
    course: { type: Object, required: true },
    questionnaires: { type: Array, required: true },
    traineeName: { type: String, required: true },
    displayName: { type: Boolean, default: true },
  },
  setup (props) {
    const { course, questionnaires } = toRefs(props);

    const { headerInfo } = useCourses(course);

    const programName = computed(() => (course.value.subProgram ? composeCourseName(course.value) : ''));

    const questionnaireType = computed(() => getQuestionnaireTypeTitle(questionnaires.value.map(q => q.type)));

    return {
      // Computed
      programName,
      headerInfo,
      questionnaireType,
    };
  },
};
</script>

<style lang="sass" scoped>
.container
  display: flex
  flex-direction: column
  padding: 0 0 16px 0
.title
  text-align: center
  color: $navy-80
  @media screen and (max-width: $breakpoint-md)
    font-size: 20px
.items-container
  color: $navy-70
  display: flex
  flex-direction: row
  justify-content: center
  @media screen and (max-width: $breakpoint-md)
    font-size: 14px
.questionnaire-type
  padding: 16px 0px
  text-align: center
  font-weight: bold
  color: $navy-80
  @media screen and (max-width: $breakpoint-md)
    font-size: 16px
.trainee-identity
  font-style: italic
  font-size: 14px
  color: $petrol-80
  text-align: center
</style>
