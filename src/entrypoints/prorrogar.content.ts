import '@/features/ouvidoria/prorrogar/prorrogar.css';
import { falabr } from '@/lib/sites';
import { NeuronSite } from '@/lib/neuron-site';
import { NeuronDB } from '@/lib/neuron-db';
import { createNeuronModule } from '@/lib/module-factory';
import { prorrogarModule } from '@/features/ouvidoria/prorrogar/prorrogar';

export default defineContentScript({
  matches: falabr('/Manifestacao/ProrrogarManifestacao.aspx?*'),
  main() {
    void NeuronDB.init(NeuronSite.getFromUrl(location.href));
    createNeuronModule(prorrogarModule);
  },
});
