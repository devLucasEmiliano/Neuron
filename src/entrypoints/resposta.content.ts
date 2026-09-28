import { falabr } from '@/lib/sites';
import { NeuronSite } from '@/lib/neuron-site';
import { NeuronDB } from '@/lib/neuron-db';
import { initResposta } from '@/features/ouvidoria/resposta/resposta';

export default defineContentScript({
  matches: falabr('/web/manifestacao/analisar?ids=*'),
  main() {
    void NeuronDB.init(NeuronSite.getFromUrl(location.href));
    initResposta();
  },
});
