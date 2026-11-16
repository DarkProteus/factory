import { expect, it } from 'vitest';
import { PACKAGE } from './index';

it('пакет sim подключён', () => {
  expect(PACKAGE).toBe('@factory/sim');
});
