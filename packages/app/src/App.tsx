import { PACKAGE as content } from '@factory/content';
import { PACKAGE as render } from '@factory/render';
import { PACKAGE as save } from '@factory/save';
import { PACKAGE as sim } from '@factory/sim';

export const packages = [sim, content, render, save];

export function App() {
  return (
    <main>
      <h1>Завод</h1>
      <p>Каркас собран. Пакеты: {packages.join(', ')}</p>
    </main>
  );
}
