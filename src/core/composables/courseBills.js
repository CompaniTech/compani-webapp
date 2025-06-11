import { ref } from 'vue';
import { useQuasar } from 'quasar';
import get from 'lodash/get';
import CourseBills from '@api/CourseBills';
import CourseCreditNotes from '@api/CourseCreditNotes';
import { NotifyNegative, NotifyPositive } from '@components/popup/notify';
import { formatDownloadName, formatQuantity } from '@helpers/utils';
import { downloadFile } from '@helpers/file';
import { REQUIRED_LABEL } from '../data/constants';

export const useCourseBilling = (courseBills, validations, refreshCourseBills) => {
  const $q = useQuasar();

  const pdfLoading = ref(false);
  const selectedBills = ref([]);

  const downloadBill = async (bill) => {
    try {
      pdfLoading.value = true;
      const pdf = await CourseBills.getPdf(bill._id);
      const pdfName = `${formatDownloadName(`${bill.payer.name} ${bill.number}`)}.pdf`;
      downloadFile(pdf, pdfName, 'application/octet-stream');
    } catch (e) {
      console.error(e);
      NotifyNegative('Erreur lors du téléchargement de la facture.');
    } finally {
      pdfLoading.value = false;
    }
  };

  const downloadCreditNote = async (creditNote) => {
    try {
      pdfLoading.value = true;
      const pdf = await CourseCreditNotes.getPdf(creditNote._id);
      const { payer } = courseBills.value.find(bill => bill._id === creditNote.courseBill);
      const pdfName = `${formatDownloadName(`${payer.name} ${creditNote.number}`)}.pdf`;
      downloadFile(pdf, pdfName, 'application/octet-stream');
    } catch (e) {
      console.error(e);
      NotifyNegative('Erreur lors du téléchargement de l\'avoir.');
    } finally {
      pdfLoading.value = false;
    }
  };

  const getBillErrorMessages = (parent) => {
    let price = '';
    let count = '';
    let countUnit = '';
    let percentage = '';
    if (get(validations, `value.${parent}.price.strictPositiveNumber.$response`) === false) {
      price = 'Prix non valide';
    }

    if (get(validations, `value.${parent}.count.strictPositiveNumber.$response`) === false ||
      get(validations, `value.${parent}.count.integerNumber.$response`) === false) {
      count = 'Nombre non valide';
    }

    if (get(validations, `value.${parent}.countUnit.required.$response`) === false) countUnit = REQUIRED_LABEL;

    const percentagePositive = get(validations, `value.${parent}.percentage.strictPositiveNumber.$response`) === false;
    const percentageInteger = get(validations, `value.${parent}.percentage.integerNumber.$response`) === false;
    const percentageMaxValue = get(validations, `value.${parent}.percentage.maxValue.$response`) === false;

    if (percentagePositive || percentageInteger || percentageMaxValue) percentage = 'Nombre invalide';

    if (get(validations, `value.${parent}.percentage.required.$response`) === false) percentage = REQUIRED_LABEL;

    return { price, count, countUnit, percentage };
  };

  const updateSelectedBills = (billId) => {
    if (selectedBills.value.find(b => b === billId)) {
      const index = selectedBills.value.indexOf(billId);

      selectedBills.value.splice(index, 1);
    } else selectedBills.value.push(billId);
  };

  const deleteBills = async () => {
    try {
      await CourseBills.deleteBillList({ _ids: selectedBills.value });

      NotifyPositive(`${formatQuantity('facture supprimée', selectedBills.value.length)}.`);
      await refreshCourseBills();
    } catch (e) {
      console.error(e);
      NotifyNegative('Erreur lors de la suppression des factures brouillon.');
    } finally {
      selectedBills.value = [];
    }
  };

  const openBillDeletionModal = () => {
    $q.dialog({
      title: 'Confirmation',
      message: 'Êtes-vous sûr(e) de vouloir supprimer ces factures brouillon ?',
      html: true,
      ok: 'OK',
      cancel: 'Annuler',
    }).onOk(deleteBills)
      .onCancel(() => NotifyPositive('Suppression annulée.'));
  };

  return {
    // Data
    pdfLoading,
    selectedBills,
    // Methods
    downloadBill,
    downloadCreditNote,
    getBillErrorMessages,
    updateSelectedBills,
    openBillDeletionModal,
  };
};
