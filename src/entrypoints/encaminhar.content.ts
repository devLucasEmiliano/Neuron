import '@/features/ouvidoria/encaminhar/encaminhar.css';
import { falabr } from '@/lib/sites';
import { NeuronSite } from '@/lib/neuron-site';
import { NeuronDB } from '@/lib/neuron-db';
import { createNeuronModule } from '@/lib/module-factory';
import { encaminharModule } from '@/features/ouvidoria/encaminhar/encaminhar';

export default defineContentScript({
  matches: falabr('/Manifestacao/EncaminharManifestacao.aspx?*'),
  main() {
    void NeuronDB.init(NeuronSite.getFromUrl(location.href));
    createNeuronModule(encaminharModule);
  },
});
