import { ref } from 'vue';
import CompletionCertificates from '@api/CompletionCertificates';
import { NotifyNegative, NotifyPositive } from '@components/popup/notify';
import { GENERATION } from '@data/constants';

export const useCompletionCertificates = () => {
  const completionCertificates = ref([]);
  const tableLoading = ref(false);
  const disableButton = ref(false);

  const getCompletionCertificates = async (query) => {
    try {
      tableLoading.value = true;
      const certificates = await CompletionCertificates.list(query);

      completionCertificates.value = certificates;
    } catch (error) {
      console.error(error);
      NotifyNegative('Erreur lors de la récupération des certificats.');
    } finally {
      tableLoading.value = false;
    }
  };

  const generateCompletionCertificateFile = async (completionCertificateId) => {
    try {
      disableButton.value = true;
      await CompletionCertificates.update(completionCertificateId, { action: GENERATION });
      NotifyPositive('Certificat de réalisation généré.');
    } catch (e) {
      console.error(e);
      NotifyNegative('Erreur lors de la génération du certificat.');
    } finally {
      disableButton.value = false;
    }
  };

  return {
    // Data
    completionCertificates,
    tableLoading,
    disableButton,
    // Methods
    getCompletionCertificates,
    generateCompletionCertificateFile,
  };
};
