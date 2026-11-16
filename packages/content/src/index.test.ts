import { expect, it } from 'vitest';
import { PACKAGE } from './index';

it('пакет content подключён', () => {
  expect(PACKAGE).toBe('@factory/content');
});
