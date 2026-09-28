import { falabr } from '@/lib/sites';
import { initMoveButtons } from '@/features/sic/analisar/move-buttons';

export default defineContentScript({
  matches: falabr('/web/manifestacao/detalhar/*'),
  main() {
    initMoveButtons();
  },
});
