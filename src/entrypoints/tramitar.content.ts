import '@/styles/selectize-fix.css';
import '@/features/ouvidoria/tramitar/tramitar.css';
import { falabr } from '@/lib/sites';
import { NeuronSite } from '@/lib/neuron-site';
import { NeuronDB } from '@/lib/neuron-db';
import { DateUtils } from '@/lib/date-utils';
import { initSelectizeFix } from '@/lib/selectize-fix';
import { initTramitar } from '@/features/ouvidoria/tramitar/tramitar';
import { initPontosFocais } from '@/features/ouvidoria/tramitar/pontos-focais';

export default defineContentScript({
  matches: falabr('/Manifestacao/TramitarManifestacao.aspx?*'),
  main() {
    void NeuronDB.init(NeuronSite.getFromUrl(location.href));
    void DateUtils.init();
    initSelectizeFix();
    initTramitar();
    initPontosFocais();
  },
});
