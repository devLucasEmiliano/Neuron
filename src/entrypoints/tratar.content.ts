import '@/styles/selectize-fix.css';
import '@/features/ouvidoria/tratar/tratar.css';
import { falabr } from '@/lib/sites';
import { NeuronSite } from '@/lib/neuron-site';
import { NeuronDB } from '@/lib/neuron-db';
import { createNeuronModule } from '@/lib/module-factory';
import { initSelectizeFix } from '@/lib/selectize-fix';
import { tratarModule } from '@/features/ouvidoria/tratar/tratar';

export default defineContentScript({
  matches: falabr('/Manifestacao/TratarManifestacao.aspx?*'),
  main() {
    void NeuronDB.init(NeuronSite.getFromUrl(location.href));
    initSelectizeFix();
    createNeuronModule(tratarModule);
  },
});
