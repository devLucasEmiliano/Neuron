import '@/features/notificacoes/notificacoes.css';
import { ALL_SITES_MATCH } from '@/lib/sites';
import { NeuronSite } from '@/lib/neuron-site';
import { NeuronDB } from '@/lib/neuron-db';
import { initExtract } from '@/features/ouvidoria/tratar-triar/extract';
import { initNotificacoes } from '@/features/notificacoes/notificacoes';
export default defineContentScript({ matches: ALL_SITES_MATCH, runAt: 'document_idle', main() { void NeuronDB.init(NeuronSite.getFromUrl(location.href)); initExtract(); initNotificacoes(); } });
