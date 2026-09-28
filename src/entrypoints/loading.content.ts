import '@/features/loading/loading.css';
import { ALL_SITES_MATCH } from '@/lib/sites';
import { initLoading } from '@/features/loading/loading';
export default defineContentScript({ matches: ALL_SITES_MATCH, runAt: 'document_start', main() { initLoading(); } });
