import store from 'src/store';
import { defineBoot } from '#q-app/wrappers';

export default defineBoot(({ app }) => { app.use(store); });
