import { alenviAxios } from '@api/ressources/alenviAxios';
import { WEBAPP } from '@data/constants';

export default {
  async list (params) {
    const attendanceSheets = await alenviAxios.get(`${process.env.API_HOSTNAME}/attendancesheets`, { params });
    return attendanceSheets.data.data.attendanceSheets;
  },
  async create (formData) {
    formData.append('origin', WEBAPP);
    await alenviAxios.post(`${process.env.API_HOSTNAME}/attendancesheets`, formData);
  },
  async update (attendanceSheetId, payload) {
    await alenviAxios.put(`${process.env.API_HOSTNAME}/attendancesheets/${attendanceSheetId}`, payload);
  },
  async delete (attendanceSheetId, params) {
    await alenviAxios.delete(`${process.env.API_HOSTNAME}/attendancesheets/${attendanceSheetId}`, { params });
  },
};
