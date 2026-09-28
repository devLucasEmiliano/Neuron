import '@/styles/selectize-fix.css';
import '@/features/sic/tratar/sic-tratar.css';
import { falabr } from '@/lib/sites';
import { NeuronSite } from '@/lib/neuron-site';
import { NeuronDB } from '@/lib/neuron-db';
import { DateUtils } from '@/lib/date-utils';
import { initSelectizeFix } from '@/lib/selectize-fix';
import { initSicTratarExtract } from '@/features/sic/tratar/extract';

export default defineContentScript({
  matches: falabr('/web/manifestacao/tratar?*'),
  main() {
    void NeuronDB.init(NeuronSite.getFromUrl(location.href));
    void DateUtils.init();
    initSelectizeFix();
    initSicTratarExtract();
  },
});
