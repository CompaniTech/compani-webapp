import { alenviAxios } from '@api/ressources/alenviAxios';

export default {
  async sendWelcome (data) {
    const mail = await alenviAxios.post(`${process.env.API_HOSTNAME}/email/send-welcome`, data);
    return mail;
  },
  async sendBillEmail (data) {
    const mail = await alenviAxios.post(`${process.env.API_HOSTNAME}/email/bill`, data);
    return mail;
  },
};
