import '@/features/ouvidoria/arquivar/arquivar.css';
import { falabr } from '@/lib/sites';
import { NeuronSite } from '@/lib/neuron-site';
import { NeuronDB } from '@/lib/neuron-db';
import { createNeuronModule } from '@/lib/module-factory';
import { arquivarModule } from '@/features/ouvidoria/arquivar/arquivar';

export default defineContentScript({
  matches: [...falabr('/Manifestacao/ArquivarManifestacao.aspx?*'), ...falabr('/web/manifestacao/arquivar?*')],
  main() {
    void NeuronDB.init(NeuronSite.getFromUrl(location.href));
    createNeuronModule(arquivarModule);
  },
});
