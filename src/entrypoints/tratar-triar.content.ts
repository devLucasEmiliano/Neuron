import '@/styles/selectize-fix.css';
import '@/features/ouvidoria/tratar-triar/tratar-triar.css';
import { falabr } from '@/lib/sites';
import { NeuronSite } from '@/lib/neuron-site';
import { NeuronDB } from '@/lib/neuron-db';
import { DateUtils } from '@/lib/date-utils';
import { initSelectizeFix } from '@/lib/selectize-fix';
import { initPagesize } from '@/features/ouvidoria/tratar-triar/pagesize';
import { initInsert } from '@/features/ouvidoria/tratar-triar/insert';

export default defineContentScript({
  matches: falabr('/Manifestacao/TratarManifestacoes'),
  main() {
    void NeuronDB.init(NeuronSite.getFromUrl(location.href));
    void DateUtils.init();
    initSelectizeFix();
    initPagesize();
    initInsert();
  },
});
