<template>
  <q-page class="vendor-background" padding>

    <!-- Header + navigation mois + date-range + filtres -->
    <ni-profile-header title="Suivi des heures coachs">
      <template #title>
        <div class="dashboard-header">
          <ni-date-range
            class="date-range"
            caption="Période"
            v-model="dateRange"
            :error="v$.dateRange.$error"
            @update:model-value="updateDateRange"
            :error-message="dateRangeErrorMessage"
            @blur="v$.dateRange.$touch"
          />
        </div>
      </template>
    </ni-profile-header>

    <div class="filters-container">
      <ni-select
        class="filter-select"
        :options="trainerFilterOptions"
        :model-value="selectedCoach"
        clearable
        placeholder="Tous les formateurs"
        @update:model-value="updateSelectedCoach"
      />

      <ni-select
        class="filter-select"
        :options="statusOptions"
        :model-value="selectedStatus"
        clearable
        placeholder="Tous les statuts"
        @update:model-value="updateSelectedStatus"
      />

      <div class="reset-filters" @click="resetFilters">Effacer les filtres</div>
    </div>

    <!-- Liste des coachs -->
    <q-card v-for="coach in filteredCoaches" :key="coach.id" class="coach-block">
      <q-item-section class="coach-name">{{ coach.firstName }} {{ coach.lastName }}</q-item-section>

      <q-card v-for="formation in coach.formations" :key="formation.id" class="formation">
        <div color="bg-copper-grey-400 q-ma-md" @click="toggleFormation(formation.id)">
          <strong>{{ formation.name }}</strong> -
          {{ formation.student.firstName }} {{ formation.student.lastName }} |
          Heures à régler : {{ totalHours(formation) }} |
          Heures réglées : {{ paidHours(formation) }} |
          Heures absences : {{ absenceHours(formation) }}
        </div>

        <div v-if="formation.open" class="formation-details">

          <!-- Étapes affichées ligne par ligne -->
          <div v-for="step in formation.steps" :key="step.id" class="step-line">
            <strong>{{ step.name }}</strong> : 
            {{ stepHoursToPay(formation, step.name) }} heures à régler, 
            {{ stepHoursPaid(formation, step.name) }} heures réglées, 
            Montant : {{ stepAmount(formation, step.name) }} €
          </div>

          <h5 class="slots-title">Créneaux correspondants :</h5>

          <q-table
            :rows="formation.slots"
            :columns="slotColumns"
            row-key="id"
            flat
            bordered
            :wrap-cells="true"
          >
            <template v-slot:body-cell-selected="props">
              <q-td>
                <q-checkbox v-if="props.row.status === 'Non réglé'" v-model="props.row.selected" />
              </q-td>
            </template>

            <template v-slot:body-cell-invoice="props">
              <q-td>
                <div v-if="props.row.status === 'Non réglé'">
                  <q-input v-model="props.row.invoiceNumber" dense placeholder="Saisir facture" />
                </div>
                <div v-else>
                  {{ props.row.invoiceNumber || '—' }}
                </div>
              </q-td>
            </template>
          </q-table>

          <q-btn bg-color="#005774" label="Régler les créneaux sélectionnés" class="q-mt-md" @click="markAsPaid(formation)" />
        </div>
      </q-card>
    </q-card>

  </q-page>
</template>

<script setup>
import { reactive, ref, computed } from 'vue';
import { QTable, QBtn, QCheckbox, QInput } from 'quasar';
import NiProfileHeader from '@components/ProfileHeader';
import NiDateRange from '@components/form/DateRange';
import NiSelect from '@components/form/Select';

const v$ = reactive({ dateRange: { $error: false, $touch: () => {} } });
const dateRange = ref({ start: null, end: null });
const dateRangeErrorMessage = ref('');
const updateDateRange = val => dateRange.value = val;

// --- Données coachs avec slots et dates ---
const coaches = reactive([
  {
    id: 1,
    firstName: 'Alice',
    lastName: 'Martin',
    formations: [
      {
        id: 101,
        name: 'Formation aide soignant(e) en situation de travail - Jean Dupont',
        student: { firstName: 'Jean', lastName: 'Dupont' },
        open: false,
        steps: [
          { id: 1, name: 'Coaching / réflexivité', amount: 100 },
          { id: 2, name: 'Réunions tripartites', amount: 150 },
          { id: 3, name: 'Evaluations / auto-eval', amount: 50 },
        ],
        slots: [
          { id: 1, stepName: 'Coaching / réflexivité', duration: 1, absent: false, start: '16/01/2026 09:00', end: '16/01/2026 10:00', amount: 50, status: 'Non réglé', selected: false, invoiceNumber: '' },
          { id: 2, stepName: 'Coaching / réflexivité', duration: 1, absent: false, start: '16/01/2026 11:00', end: '16/01/2026 12:00', amount: 50, status: 'Non réglé', selected: false, invoiceNumber: '' },
          { id: 3, stepName: 'Réunions tripartites', duration: 3, absent: true, start: '17/01/2026 14:00', end: '17/01/2026 17:00', amount: 150, status: 'Non réglé', selected: false, invoiceNumber: '' },
          { id: 4, stepName: 'Evaluations / auto-eval', duration: 1, absent: false, start: '18/01/2026 09:00', end: '18/01/2026 10:00', amount: 50, status: 'Non réglé', selected: false, invoiceNumber: '' },
        ],
      },
      {
        id: 102,
        name: 'Formation aide soignant(e) en situation de travail - Marie Durand',
        student: { firstName: 'Marie', lastName: 'Durand' },
        open: false,
        steps: [
          { id: 1, name: 'Coaching / réflexivité', amount: 200 },
          { id: 2, name: 'Réunions tripartites', amount: 150 },
          { id: 3, name: 'Evaluations / auto-eval', amount: 100 },
        ],
        slots: [
          { id: 1, stepName: 'Coaching / réflexivité', duration: 4, absent: false, start: '19/01/2026 09:00', end: '19/01/2026 13:00', amount: 200, status: 'Non réglé', selected: false, invoiceNumber: '' },
          { id: 2, stepName: 'Réunions tripartites', duration: 3, absent: false, start: '20/01/2026 14:00', end: '20/01/2026 17:00', amount: 150, status: 'Réglé', selected: false, invoiceNumber: 'FAC-001' },
          { id: 3, stepName: 'Evaluations / auto-eval', duration: 2, absent: false, start: '21/01/2026 09:00', end: '21/01/2026 11:00', amount: 100, status: 'Non réglé', selected: false, invoiceNumber: '' },
        ],
      },
    ],
  },
  {
    id: 2,
    firstName: 'Bob',
    lastName: 'Durand',
    formations: [
      {
        id: 201,
        name: 'Formation aide soignant(e) en situation de travail - Claire Lefevre',
        student: { firstName: 'Claire', lastName: 'Lefevre' },
        open: false,
        steps: [
          { id: 1, name: 'Coaching / réflexivité', amount: 120 },
          { id: 2, name: 'Réunions tripartites', amount: 80 },
          { id: 3, name: 'Evaluations / auto-eval', amount: 50 },
        ],
        slots: [
          { id: 1, stepName: 'Coaching / réflexivité', duration: 2, absent: false, start: '16/01/2026 08:00', end: '16/01/2026 10:00', amount: 80, status: 'Non réglé', selected: false, invoiceNumber: '' },
          { id: 2, stepName: 'Coaching / réflexivité', duration: 1, absent: false, start: '16/01/2026 10:30', end: '16/01/2026 11:30', amount: 40, status: 'Non réglé', selected: false, invoiceNumber: '' },
          { id: 3, stepName: 'Réunions tripartites', duration: 2, absent: true, start: '17/01/2026 09:00', end: '17/01/2026 11:00', amount: 80, status: 'Non réglé', selected: false, invoiceNumber: '' },
          { id: 4, stepName: 'Evaluations / auto-eval', duration: 1, absent: false, start: '18/01/2026 10:00', end: '18/01/2026 11:00', amount: 50, status: 'Non réglé', selected: false, invoiceNumber: '' },
        ],
      },
    ],
  },
]);

// --- Filtres ---
const selectedCoach = ref('');
const selectedStatus = ref('');
const trainerFilterOptions = computed(() => [
  { label: 'Tous les formateurs', value: '' },
  ...coaches.map(c => ({ label: `${c.firstName} ${c.lastName}`, value: c.id }))
]);
const statusOptions = [
  { label: 'Tous', value: '' },
  { label: 'Réglé', value: 'Réglé' },
  { label: 'Non réglé', value: 'Non réglé' },
];
const updateSelectedCoach = val => selectedCoach.value = val;
const updateSelectedStatus = val => selectedStatus.value = val;
const resetFilters = () => {
  selectedCoach.value = '';
  selectedStatus.value = '';
  dateRange.value = { start: null, end: null };
};

// --- Colonnes Quasar Table ---
const slotColumns = [
  { name: 'stepName', label: 'Étape', field: 'stepName', align: 'left' },
  { name: 'start', label: 'Début', field: 'start', align: 'left' },
  { name: 'end', label: 'Fin', field: 'end', align: 'left' },
  { name: 'duration', label: 'Durée', field: 'duration', align: 'left' },
  { name: 'absent', label: 'Absence', field: row => row.absent ? 'Oui' : 'Non', align: 'left' },
  { name: 'amount', label: 'Montant (€)', field: 'amount', align: 'left' },
  { name: 'status', label: 'Statut', field: 'status', align: 'left' },
  { name: 'selected', label: 'Sélection', field: 'selected', align: 'left' },
  { name: 'invoice', label: 'Numéro de facture', field: 'invoiceNumber', align: 'left' },
];

// --- Fonctions ---
const toggleFormation = id => {
  coaches.forEach(coach => {
    coach.formations.forEach(f => {
      if (f.id === id) f.open = !f.open;
    });
  });
};

const totalHours = formation =>
  formation.slots.filter(s => s.duration && s.status === 'Non réglé' && !s.absent).reduce((sum, s) => sum + s.duration, 0);
const paidHours = formation =>
  formation.slots.filter(s => s.duration && s.status === 'Réglé' && !s.absent).reduce((sum, s) => sum + s.duration, 0);
const absenceHours = formation =>
  formation.slots.filter(s => s.absent).reduce((sum, s) => sum + s.duration, 0);

const stepHoursToPay = (formation, stepName) =>
  formation.slots.filter(s => s.stepName === stepName && s.status === 'Non réglé').reduce((sum, s) => sum + s.duration, 0);
const stepHoursPaid = (formation, stepName) =>
  formation.slots.filter(s => s.stepName === stepName && s.status === 'Réglé').reduce((sum, s) => sum + s.duration, 0);
const stepAmount = (formation, stepName) =>
  formation.slots.filter(s => s.stepName === stepName).reduce((sum, s) => sum + s.amount, 0);

const markAsPaid = formation => {
  formation.slots.forEach(slot => {
    if (slot.selected && slot.status === 'Non réglé') {
      slot.status = 'Réglé';
      slot.selected = false;
    }
  });
};

const filteredCoaches = computed(() =>
  coaches
    .filter(c => !selectedCoach.value || c.id === selectedCoach.value)
    .map(c => {
      const formations = c.formations.map(f => {
        let slots = f.slots;
        if (selectedStatus.value) slots = slots.filter(s => s.status === selectedStatus.value);
        return { ...f, slots };
      }).filter(f => f.slots.length > 0);
      return { ...c, formations };
    })
    .filter(c => c.formations.length > 0)
);
</script>

<style scoped>
.filters-container {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}
.date-range { flex: 1 1 300px; }
.filter-select { width: 200px; }
.coach-block {
  border: 1px solid #ccc;
  padding: 10px;
  margin-bottom: 20px;
  border-radius: 5px;
}
.coach-name {
  font-weight: bold;
  font-size: 1.3rem;
  margin-bottom: 10px;
}
.formation {
  background: #F3F6F7;
  padding: 5px;
  cursor: pointer;
  margin-top: 5px;
}
.formation-details {
  padding: 10px;
  border-top: 1px solid #ccc;
}
.step-line {
  padding: 5px 10px;
  margin-bottom: 4px;
  background: #94AFB8;
  border-radius: 4px;
  display: flex;
  width: fit-content;
  justify-content: left;
  align-items: center;
  color: black;
}
.slots-title {
  font-size: 0.95rem;
  margin: 10px 0 5px;
}
</style>
