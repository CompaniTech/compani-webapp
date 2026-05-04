<template>
  <div v-if="program">
    <div class="q-mb-xl">
      <p class="text-weight-bold">Identité</p>
      <div class="row gutter-profile">
        <ni-input caption="Nom" v-model.trim="program.name" @focus="saveTmp('name')" @blur="updateProgram('name')"
          :error="v$.program.name.$error" required-field />
        <ni-file-uploader caption="Image" path="image" :entity="program" :url="programsUploadUrl"
          @delete="validateProgramImageDeletion" @uploaded="programImageUploaded" :max-file-size="maxFileSize"
          :additional-value="imageFileName" label="Pas d'image" :extensions="extensions" />
        <ni-input caption="Description" v-model="program.description" type="textarea"
          @focus="saveTmp('description')" @blur="updateProgram('description')" required-field
          :error="v$.program.description.$error" />
        <ni-input caption="Objectifs pédagogiques" v-model="program.learningGoals" type="textarea"
          @focus="saveTmp('learningGoals')" @blur="updateProgram('learningGoals')" required-field
          :error="v$.program.learningGoals.$error" />
      </div>
    </div>
    <div class="q-mb-xl">
      <p class="text-weight-bold">Catégories</p>
      <q-card>
        <ni-responsive-table :data="program.categories" :columns="columns">
          <template #body="{ props }">
            <q-tr :props="props">
              <q-td v-for="col in props.cols" :key="col.name" :data-label="col.label" :props="props" :class="col.name"
                :style="col.style">
                <template v-if="col.name === 'actions'">
                  <ni-button class="table-actions" icon="close" :disable="program.categories.length <= 1"
                    @click="validateCategoryRemoval(props.row)" />
                </template>
                <template v-else>{{ col.value }}</template>
              </q-td>
            </q-tr>
          </template>
        </ni-responsive-table>
        <q-card-actions align="right">
          <ni-button color="primary" label="Ajouter une catégorie" @click="categoryAdditionModal = true" icon="add" />
        </q-card-actions>
      </q-card>
    </div>
    <div class="q-mb-xl">
      <p class="text-weight-bold">Noms commerciaux</p>
      <q-card>
        <ni-responsive-table :data="program.tradeNames" :columns="tradeNameColumns">
          <template #body="{ props }">
            <q-tr :props="props">
              <q-td v-for="col in props.cols" :key="col.name" :data-label="col.label" :props="props" :class="col.name"
                :style="col.style">
                {{ col.value }}
              </q-td>
            </q-tr>
          </template>
        </ni-responsive-table>
        <q-card-actions align="right">
          <ni-button color="primary" label="Ajouter un nom commercial" @click="tradeNameAdditionModal = true"
            icon="add" />
        </q-card-actions>
      </q-card>
    </div>
    <tester-table :program-id="profileId" :testers="program.testers" @refresh="refreshProgram" />

    <category-addition-modal v-model="categoryAdditionModal" v-model:new-category="newCategory" :loading="loading"
      @hide="resetModal" @submit="addCategory" :category-options="categoryOptions" :validations="v$.newCategory" />

    <trade-name-addition-modal v-model="tradeNameAdditionModal" v-model:new-trade-name="newTradeName" :loading="loading"
      @hide="resetTradeNameModal" @submit="addTradeName" :validations="v$.newTradeName" />
  </div>
</template>

<script>
import { ref, computed, toRefs } from 'vue';
import { useStore } from 'vuex';
import { useQuasar } from 'quasar';
import useVuelidate from '@vuelidate/core';
import { required } from '@vuelidate/validators';
import get from 'lodash/get';
import set from 'lodash/set';
import Programs from '@api/Programs';
import Categories from '@api/Categories';
import Input from '@components/form/Input';
import FileUploader from '@components/form/FileUploader';
import { NotifyNegative, NotifyWarning, NotifyPositive } from '@components/popup/notify';
import ResponsiveTable from '@components/table/ResponsiveTable';
import CategoryAdditionModal from 'src/modules/vendor/components/programs/CategoryAdditionModal';
import TradeNameAdditionModal from 'src/modules/vendor/components/programs/TradeNameAdditionModal';
import TesterTable from 'src/modules/vendor/components/programs/TesterTable';
import Button from '@components/Button';
import { IMAGE_EXTENSIONS } from '@data/constants';
import { upperCaseFirstLetter, formatAndSortOptions } from '@helpers/utils';

export default {
  name: 'ProfileInfo',
  props: {
    profileId: { type: String, required: true },
  },
  components: {
    'ni-input': Input,
    'ni-file-uploader': FileUploader,
    'ni-button': Button,
    'ni-responsive-table': ResponsiveTable,
    'category-addition-modal': CategoryAdditionModal,
    'trade-name-addition-modal': TradeNameAdditionModal,
    'tester-table': TesterTable,
  },
  setup (props) {
    const { profileId } = toRefs(props);
    const store = useStore();
    const $q = useQuasar();

    const tmpInput = ref('');
    const extensions = IMAGE_EXTENSIONS;
    const maxFileSize = 500 * 1000;
    const newCategory = ref('');
    const newTradeName = ref('');
    const categories = ref([]);
    const columns = [
      { name: 'name', label: 'Nom', align: 'left', field: 'name', format: upperCaseFirstLetter, style: 'width: 90%' },
      { name: 'actions', label: '', field: '_id', align: 'right' },
    ];
    const tradeNameColumns = [
      { name: 'name', label: 'Nom', align: 'left', field: 'name', style: 'width: 100%' },
    ];
    const categoryAdditionModal = ref(false);
    const tradeNameAdditionModal = ref(false);
    const loading = ref(false);

    const program = computed(() => store.state.program.program);

    const programsUploadUrl = computed(
      () => `${process.env.API_HOSTNAME}/programs/${program.value._id}/upload`
    );

    const imageFileName = computed(() => program.value.name.replace(/ /g, ''));

    const categoryOptions = computed(() => formatAndSortOptions(
      categories.value.filter(c => !program.value.categories.find(e => e._id === c._id)),
      'name'
    ));

    const rules = computed(() => ({
      program: {
        name: { required },
        description: { required },
        learningGoals: { required },
      },
      newCategory: { required },
      newTradeName: { required },
    }));

    const v$ = useVuelidate(rules, { program, newCategory, newTradeName });

    const refreshProgram = async () => {
      try {
        await store.dispatch('program/fetchProgram', { programId: profileId.value });
      } catch (e) {
        console.error(e);
      }
    };

    const refreshCategories = async () => {
      try {
        categories.value = await Categories.list();
      } catch (e) {
        console.error(e);
      }
    };

    const saveTmp = (path) => {
      tmpInput.value = get(program.value, path);
    };

    const updateProgram = async (path) => {
      try {
        const value = get(program.value, path);
        if (tmpInput.value === value) return;

        get(v$.value.program, path).$touch();
        if (get(v$.value.program, path).$error) return NotifyWarning('Champ(s) invalide(s)');

        const payload = set({}, path, value.trim());
        await Programs.update(profileId, payload);
        NotifyPositive('Modification enregistrée.');

        await refreshProgram();
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la modification.');
      } finally {
        tmpInput.value = null;
      }
    };

    const programImageUploaded = () => {
      NotifyPositive('Image envoyée');
      refreshProgram();
    };

    const deleteProgramImage = async () => {
      try {
        if (get(program.value, 'image')) {
          await Programs.deleteImage(program.value._id);

          refreshProgram();
          NotifyPositive('Image supprimée');
        } else NotifyWarning('Il n\'y a pas d\'image a supprimer.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la suppression de l\'image.');
      }
    };

    const validateProgramImageDeletion = () => {
      $q.dialog({
        title: 'Confirmation',
        message: 'Êtes-vous sûr(e) de vouloir supprimer l\'image&nbsp;?',
        html: true,
        ok: true,
        cancel: 'Annuler',
      }).onOk(() => deleteProgramImage())
        .onCancel(() => NotifyPositive('Suppression annulée.'));
    };

    const resetModal = () => {
      v$.value.newCategory.$reset();
      newCategory.value = '';
    };

    const resetTradeNameModal = () => {
      v$.value.newTradeName.$reset();
      newTradeName.value = '';
    };

    const addCategory = async () => {
      try {
        v$.value.newCategory.$touch();
        if (v$.value.newCategory.$error) return NotifyWarning('Champ(s) invalide(s)');

        loading.value = true;
        await Programs.addCategory(program.value._id, { categoryId: newCategory.value });

        categoryAdditionModal.value = false;
        NotifyPositive('Catégorie ajoutée.');
        await refreshProgram();
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de l\'ajout de la catégorie.');
      } finally {
        loading.value = false;
      }
    };

    const removeCategory = async (categoryId) => {
      try {
        loading.value = true;
        await Programs.removeCategory(program.value._id, categoryId);

        NotifyPositive('Catégorie retirée.');
        await refreshProgram();
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors du retrait de la catégorie.');
      } finally {
        loading.value = false;
      }
    };

    const validateCategoryRemoval = (category) => {
      $q.dialog({
        title: 'Confirmation',
        message: 'Êtes-vous sûr(e) de vouloir retirer cette catégorie&nbsp;?',
        html: true,
        ok: true,
        cancel: 'Annuler',
      }).onOk(() => removeCategory(category._id))
        .onCancel(() => NotifyPositive('Retrait annulé.'));
    };

    const addTradeName = async () => {
      try {
        v$.value.newTradeName.$touch();
        if (v$.value.newTradeName.$error) return NotifyWarning('Champ(s) invalide(s)');

        loading.value = true;
        await Programs.addTradeName(program.value._id, { tradeName: newTradeName.value });

        tradeNameAdditionModal.value = false;
        NotifyPositive('Nom commercial ajouté.');
        await refreshProgram();
      } catch (e) {
        console.error(e);
        if (e.status === 409) NotifyWarning(e.data.message);
        else NotifyNegative('Erreur lors de l\'ajout du nom commercial.');
      } finally {
        loading.value = false;
      }
    };

    const created = async () => {
      await refreshCategories();
      if (!program.value) await refreshProgram();
      v$.value.program.$touch();
    };

    created();

    return {
      extensions,
      maxFileSize,
      newCategory,
      newTradeName,
      columns,
      tradeNameColumns,
      categoryAdditionModal,
      tradeNameAdditionModal,
      loading,
      program,
      programsUploadUrl,
      imageFileName,
      categoryOptions,
      v$,
      saveTmp,
      updateProgram,
      programImageUploaded,
      validateProgramImageDeletion,
      resetModal,
      resetTradeNameModal,
      addCategory,
      validateCategoryRemoval,
      addTradeName,
    };
  },
};
</script>
